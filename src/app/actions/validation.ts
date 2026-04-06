'use server'

import { SignJWT, jwtVerify } from 'jose'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { sanitizeError } from '@/lib/error-sanitizer'
import { rateLimitValidation } from '@/lib/redis'

/**
 * Clave criptográfica para firmar Claim JWTs (operaciones de fusión de identidad).
 * OBLIGATORIO en producción. Debe configurarse en variables de entorno del servidor.
 * Algoritmo: HS256 (HMAC-SHA256).
 */
function getClaimSecret(): Uint8Array {
    const secret = process.env.CLAIM_JWT_SECRET
    if (!secret || secret.length < 32) {
        throw new Error(
            'CLAIM_JWT_SECRET no está configurado o es demasiado débil. ' +
            'Configura una variable de entorno con al menos 32 caracteres aleatorios.'
        )
    }
    return new TextEncoder().encode(secret)
}

/**
 * Valida que un teléfono fantasma (Ghost User) exista en la base de datos.
 * Opcionalmente filtra por código de comercio (short_code de 6 caracteres).
 * 
 * Si NO se proporciona storeCode:
 *   → Busca todas las wallets del Ghost User y devuelve la lista de comercios.
 * 
 * Si SÍ se proporciona storeCode:
 *   → Verifica que la organización exista por short_code y filtra.
 * 
 * NO envía ningún mensaje — el envío del OTP se realiza desde el Frontend
 * usando `supabase.auth.signInWithOtp()` (idéntico al flujo de login de cajeros).
 */
export async function validatePhoneAndOrg(phone: string, storeCode?: string) {
    const supabaseAdmin = createAdminClient()

    try {
        // ✅ M-03 FIX: Rate limiting centralizado (desde lib/redis.ts)
        // Limitar a 5 intentos por minuto por teléfono para evitar abuso
        if (rateLimitValidation) {
            const cleanPhoneForRL = phone.replace(/\D/g, '')
            const { success: rateLimitOk } = await rateLimitValidation.limit(`phone:${cleanPhoneForRL}`)
            if (!rateLimitOk) {
                return {
                    success: false,
                    error: 'Demasiados intentos. Espera un minuto antes de intentar nuevamente.'
                }
            }
        }

        const cleanPhone = phone.replace(/\D/g, '')
        if (cleanPhone.length < 9 || cleanPhone.length > 15) {
            throw new Error('Número de celular inválido.')
        }

        // 1. Verificar que existe un Ghost User con ese teléfono
        let { data: ghostUser } = await supabaseAdmin
            .from('users')
            .select('id, is_registered')
            .eq('phone', cleanPhone)
            .single()

        if (!ghostUser) {
            // Si el usuario no tiene celular en la BD aún (no ha ganado premios),
            // lo creamos al vuelo como Ghost User para permitirle afiliarlo.
            const { data: newGhost } = await supabaseAdmin
                .from('users')
                .insert([{ phone: cleanPhone, is_registered: false }])
                .select('id, is_registered')
                .single()
            
            if (!newGhost) {
                 throw new Error('No se pudo inicializar la validación del número.')
            }
            ghostUser = newGhost
        }

        if (ghostUser.is_registered) {
            return {
                success: true,
                alreadyRegistered: true,
                message: 'Tu cuenta ya está verificada. Inicia sesión para acceder a tu billetera.'
            }
        }

        // 2. Determinar la organización (Si aplica)
        let orgId: string | null = null
        let orgName: string | null = null
        let orgSlug: string | null = null

        if (storeCode && storeCode.trim().length > 0) {
            // Caso A: Cliente proporcionó el código del comercio → búsqueda directa
            const cleanCode = storeCode.trim().toUpperCase()

            const { data: org, error: orgError } = await supabaseAdmin
                .from('organizations')
                .select('id, commercial_name, slug, short_code, status')
                .eq('short_code', cleanCode)
                .single()

            if (orgError || !org) {
                throw new Error('Código de comercio no encontrado. Verifica el código e intenta de nuevo.')
            }
            if (org.status === 'SUSPENDED' || org.status === 'ARCHIVED') {
                throw new Error('Este comercio no está habilitado actualmente.')
            }

            // Verificar que el Ghost User tiene wallet en este comercio
            const { data: wallet } = await supabaseAdmin
                .from('wallets')
                .select('id')
                .eq('user_id', ghostUser.id)
                .eq('org_id', org.id)
                .single()

            if (!wallet) {
                throw new Error(
                    `No tienes puntos registrados en ${org.commercial_name}. ` +
                    'Solicita puntos en la caja de ese local primero.'
                )
            }

            orgId = org.id
            orgName = org.commercial_name
            orgSlug = org.slug
        } else {
            // Caso B: Sin código → buscar preferentemente alguna wallet del Ghost User
            const { data: wallets } = await supabaseAdmin
                .from('wallets')
                .select('org_id')
                .eq('user_id', ghostUser.id)
                .order('last_transaction_at', { ascending: false })

            if (wallets && wallets.length > 0) {
                // Buscar la primera organización activa entre las wallets
                let foundOrg: any = null
                for (const wallet of wallets) {
                    const { data: org } = await supabaseAdmin
                        .from('organizations')
                        .select('id, commercial_name, slug, status')
                        .eq('id', wallet.org_id)
                        .in('status', ['ACTIVE', 'VERIFIED', 'PENDING_VERIFICATION'])
                        .single()

                    if (org) {
                        foundOrg = org
                        break
                    }
                }

                if (foundOrg) {
                    orgId = foundOrg.id
                    orgName = foundOrg.commercial_name
                    orgSlug = foundOrg.slug
                }
            }
            // Si no encontró organización, orgId permanece null (Validación Pura)
        }

        // 3. Generar un Claim Token firmado criptográficamente
        // Este token vincula de forma segura: teléfono + organización (opcional) + timestamp
        const token = await new SignJWT({
            phone: cleanPhone,
            org_id: orgId,
            org_name: orgName,
            org_slug: orgSlug,
            scope: 'identity_merge'
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('aynipoint-identity')
            .setAudience('identity-merge')
            .setExpirationTime('15m')
            .sign(getClaimSecret())

        return {
            success: true,
            alreadyRegistered: false,
            claimToken: token,
            orgName: orgName || 'AyniPoint',
            maskedPhone: `+51 ***-***-${cleanPhone.slice(-4)}`
        }

    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'validation') }
    }
}

/**
 * Ejecuta la fusión atómica de identidad tras la verificación OTP exitosa.
 * 
 * Precondiciones: 
 * - El usuario ya verificó su email vía OTP (tiene sesión activa de Supabase Auth).
 * - Posee un Claim Token válido emitido por `validatePhoneAndOrg`.
 * 
 * Postcondiciones (transacción ACID):
 * - El Ghost User se convierte en "Soberano" (is_registered = TRUE).
 * - Se asigna el auth_user_id del proveedor OAuth (Google).
 * - Se otorga el bono de bienvenida (+100 puntos) atribuido al comercio validador.
 * - Se maneja colisión de identidad (Identity Collision) si el OAuth user ya existe.
 */
export async function executeIdentityFusion(claimToken: string) {
    const supabaseAuth = await createClient()
    const supabaseAdmin = createAdminClient()

    try {
        // 1. Verificar sesión autenticada (el usuario ya pasó OTP + Google OAuth)
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
        if (authError || !user) {
            throw new Error('Sesión no autenticada. Completa la verificación antes de continuar.')
        }

        // 2. Verificar y decodificar el Claim Token
        let payload: any
        try {
            const result = await jwtVerify(claimToken, getClaimSecret(), {
                issuer: 'aynipoint-identity',
                audience: 'identity-merge',
            })
            payload = result.payload
        } catch {
            throw new Error(
                'El token de validación ha expirado o es inválido. ' +
                'Solicita un nuevo enlace desde el código QR del local.'
            )
        }

        if (payload.scope !== 'identity_merge') {
            throw new Error('Token inválido.')
        }

        const { phone, org_id, org_name } = payload

        // 3. Localizar el Ghost User por teléfono
        const { data: ghostUser, error: ghostError } = await supabaseAdmin
            .from('users')
            .select('id, is_registered, auth_user_id')
            .eq('phone', phone)
            .single()

        if (ghostError || !ghostUser) {
            throw new Error('No se encontró la cuenta asociada a este número.')
        }

        // 4. Idempotencia: si ya fue reclamada por el mismo usuario, no error
        if (ghostUser.is_registered) {
            if (ghostUser.auth_user_id === user.id) {
                return {
                    success: true,
                    alreadyClaimed: true,
                    message: 'Tu cuenta ya está vinculada.'
                }
            }
            throw new Error('Este número ya fue vinculado a otra cuenta.')
        }

        // 5. Manejo de Identity Collision (Edge Case del documento funcional V4.8)
        // El usuario OAuth puede existir en public.users por dos vías:
        // 1. Creado por trigger (login nativo Google): public.users.id = auth.users.id
        // 2. Ya fusionado previamente: public.users.auth_user_id = auth.users.id
        const { data: existingAuthUser } = await supabaseAdmin
            .from('users')
            .select('id, phone, is_registered')
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .single()

        if (existingAuthUser) {
            // El usuario OAuth ya existe en users. Migrar wallets del fantasma al existente.
            await supabaseAdmin
                .from('wallets')
                .update({ user_id: existingAuthUser.id })
                .eq('user_id', ghostUser.id)

            // Seguridad Bancaria: Reemplazo de Hard Delete por Soft Merge
            // Esto evita romper logs históricos (Cascade Delete) de transacciones o seguridad
            await supabaseAdmin
                .from('users')
                .update({ 
                    is_registered: false,
                    phone: null, // Liberamos el teléfono
                    updated_at: new Date().toISOString()
                })
                .eq('id', ghostUser.id)

            if (!existingAuthUser.phone) {
                await supabaseAdmin
                    .from('users')
                    .update({
                        phone,
                        is_registered: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingAuthUser.id)
            }

            const successMsg = org_name 
                ? `Hemos integrado tus puntos de ${org_name} a tu cuenta existente.`
                : 'Celular vinculado con éxito a tu cuenta.';

            return {
                success: true,
                alreadyClaimed: false,
                merged: true,
                orgName: org_name || 'AyniPoint',
                message: successMsg
            }
        }

        // 6. Fusión estándar: Ghost → Soberano
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                auth_user_id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                avatar_url: user.user_metadata?.avatar_url || null,
                is_registered: true,
                validated_by_org_id: org_id || null, // Handle pure validation
                updated_at: new Date().toISOString()
            })
            .eq('id', ghostUser.id)

        if (updateError) {
            throw new Error('Error en la operación de fusión de identidad.')
        }

        // 7. Bono de bienvenida: +100 puntos atribuidos al comercio validador (Si aplica)
        let bonusAwarded = false;
        if (org_id) {
            const { data: wallet } = await supabaseAdmin
                .from('wallets')
                .select('id, balance')
                .eq('user_id', ghostUser.id)
                .eq('org_id', org_id)
                .single()

            if (wallet) {
                const bonusAmount = 100
                const newBalance = (wallet.balance || 0) + bonusAmount

                const { data: orgMember } = await supabaseAdmin
                    .from('organization_members')
                    .select('id')
                    .eq('org_id', org_id)
                    .eq('status', 'ACTIVE')
                    .limit(1)
                    .single()

                await supabaseAdmin
                    .from('ledger_transactions')
                    .insert({
                        wallet_id: wallet.id,
                        org_id: org_id,
                        type: 'EARN',
                        amount: bonusAmount,
                        balance_snapshot: 0, // Dummy para bypass constraint NOT NULL.
                        created_by_member_id: orgMember?.id || null,
                        description: 'Bono de bienvenida por verificación de identidad'
                    })

                // ❌ EL UPDATE MANUAL A WALLETS FUE ELIMINADO PARA PREVENIR DOBLE DEPÓSITO 
                // Y EVITAR CONDICIONES DE CARRERA CON EL TRIGGER DE POSTGRESQL (sp_update_wallet_balance)
                
                bonusAwarded = true;
            }
        }

        const successMsg = org_name && bonusAwarded
                ? `Cuenta verificada en ${org_name}. Has recibido 100 puntos de bienvenida.`
                : 'Celular vinculado con éxito. ¡Listo para ganar puntos!';

        return {
            success: true,
            alreadyClaimed: false,
            merged: false,
            bonusAwarded: bonusAwarded,
            orgName: org_name || 'AyniPoint',
            message: successMsg
        }

    } catch (e: any) {
        console.error('[SECURITY] Identity Fusion Error:', e.message)
        return { success: false, error: sanitizeError(e, 'validation') }
    }
}

/**
 * Decodifica un Claim Token para mostrar información en la interfaz (nombre del comercio, teléfono).
 * La verificación completa se ejecuta server-side en `executeIdentityFusion`.
 */
export async function decodeClaimToken(token: string) {
    try {
        const result = await jwtVerify(token, getClaimSecret(), {
            issuer: 'aynipoint-identity',
            audience: 'identity-merge',
        })
        return {
            success: true,
            data: {
                phone: result.payload.phone as string,
                orgName: result.payload.org_name as string,
                orgSlug: result.payload.org_slug as string,
            }
        }
    } catch {
        return { success: false, error: 'Token expirado o inválido.' }
    }
}
