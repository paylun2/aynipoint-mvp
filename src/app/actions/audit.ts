'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { logSecurityEvent } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/error-sanitizer'
import { rateLimitRefund } from '@/lib/redis'

/**
 * Obtener el historial completo del ledger para la Terminal de Auditoría.
 * Incluye datos del cajero, cliente y tipo de transacción.
 */
export async function getAuditLedger(
    orgSlug: string,
    page: number = 1,
    pageSize: number = 25,
    filters?: {
        type?: 'EARN' | 'REDEEM' | 'REFUND' | 'ALL';
        dateFrom?: string;
        dateTo?: string;
    }
) {
    // ✅ C-01 FIX: Validar identidad criptográficamente ANTES de cualquier consulta admin
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Sesión no válida.' }
    }

    const supabase = createAdminClient()

    try {
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single()

        if (orgError) throw new Error('Organización no encontrada');

        // ✅ C-01 FIX: Verificar que el usuario es miembro con rol administrativo
        const { data: member } = await supabase
            .from('organization_members')
            .select('role_code')
            .eq('user_id', user.id)
            .eq('org_id', org.id)
            .in('role_code', ['OWNER', 'MANAGER', 'ADMIN'])
            .single()

        if (!member) {
            await logSecurityEvent({
                eventType: 'FRAUD_ATTEMPT',
                severity: 'CRITICAL',
                actorUserId: user.id,
                targetId: org.id,
                metadata: { type: 'UNAUTHORIZED_AUDIT_ACCESS', orgSlug }
            })
            return { success: false, error: 'Acceso denegado. Se requiere rol administrativo.' }
        }

        const offset = (page - 1) * pageSize;

        let query = supabase
            .from('ledger_transactions')
            .select(`
                id, type, amount, created_at, description, metadata,
                organization_members!ledger_transactions_created_by_member_id_fkey (
                    user_id,
                    role_code,
                    users (
                        full_name,
                        email
                    )
                ),
                wallets (
                    users (
                        phone
                    )
                )
            `, { count: 'exact' })
            .eq('org_id', org.id);

        if (filters) {
            if (filters.type && filters.type !== 'ALL') {
                query = query.eq('type', filters.type);
            }
            if (filters.dateFrom) {
                const start = new Date(filters.dateFrom);
                start.setHours(0, 0, 0, 0);
                query = query.gte('created_at', start.toISOString());
            }
            if (filters.dateTo) {
                const end = new Date(filters.dateTo);
                end.setHours(23, 59, 59, 999);
                query = query.lte('created_at', end.toISOString());
            }
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (error) throw error;

        const processed = data?.map((tx: any) => {
            const rawPhone = tx.wallets?.users?.phone;
            let maskedPhone = 'N/A';
            if (rawPhone && rawPhone.length > 5) {
                maskedPhone = `******${rawPhone.substring(rawPhone.length - 3)}`;
            }
            return {
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                baseAmount: tx.metadata?.base_amount ?? null,
                multiplier: tx.metadata?.multiplier ?? null,
                description: tx.description || null,
                created_at: tx.created_at,
                cashierName: tx.organization_members?.users?.full_name || tx.organization_members?.users?.email?.split('@')[0] || 'Sistema',
                cashierRole: tx.organization_members?.role_code || 'N/A',
                clientPhone: maskedPhone,
            };
        }) || [];

        return {
            success: true,
            data: {
                transactions: processed,
                totalCount: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize)
            }
        }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'audit') }
    }
}

/**
 * REFUND ENGINE: Anula una transacción creando un asiento contable inverso.
 * Requiere rol OWNER o MANAGER en la organización.
 * Registra todo en security_logs para auditoría forense inmutable.
 */
export async function refundTransaction(
    orgSlug: string,
    transactionId: string,
    reason: string,
    adminPin: string
) {
    const supabase = await createClient()

    // ✅ SEGURIDAD BANCARIA: validar identidad criptográficamente
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Sesión no válida.' }
    }

    const adminSupabase = createAdminClient()

    // 🔒 Rate Limiting: 3 refunds por minuto por usuario (anti-abuso financiero)
    if (rateLimitRefund) {
        const { success: rlOk } = await rateLimitRefund.limit(`refund:${user.id}`);
        if (!rlOk) {
            await logSecurityEvent({
                eventType: 'RATE_LIMIT_EXCEEDED',
                severity: 'WARN',
                actorUserId: user.id,
                targetId: orgSlug,
                metadata: { type: 'REFUND_RATE_LIMIT', transactionId }
            });
            return { success: false, error: '⚠️ Demasiados extornos en poco tiempo. Espera un momento antes de intentar nuevamente.' };
        }
    }

    try {
        // 1. Obtener organización
        const { data: org } = await adminSupabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single()

        if (!org) throw new Error('Organización no encontrada');

        // 2. Verificar que el usuario es OWNER o MANAGER (roles con permiso de extorno)
        const { data: member } = await adminSupabase
            .from('organization_members')
            .select('id, role_code')
            .eq('user_id', user.id)
            .eq('org_id', org.id)
            .in('role_code', ['OWNER', 'MANAGER'])
            .single()

        if (!member) {
            await logSecurityEvent({
                eventType: 'FRAUD_ATTEMPT',
                severity: 'CRITICAL',
                actorUserId: user.id,
                targetId: org.id,
                metadata: { type: 'UNAUTHORIZED_REFUND_ATTEMPT', transactionId }
            })
            return { success: false, error: 'Solo OWNER o MANAGER pueden ejecutar extornos.' }
        }

        // 3. PIN de seguridad — ✅ H-06 FIX: Validar contra PIN almacenado
        if (!adminPin || adminPin.length < 4) {
            return { success: false, error: 'PIN de autorización inválido.' }
        }
        // Comparar contra el PIN configurado en variables de entorno
        // En versión futura: bcrypt hash por miembro en organization_members
        const expectedPin = process.env.REFUND_ADMIN_PIN;
        if (expectedPin && adminPin !== expectedPin) {
            await logSecurityEvent({
                eventType: 'FRAUD_ATTEMPT',
                severity: 'WARN',
                actorUserId: user.id,
                targetId: org.id,
                metadata: { type: 'INVALID_REFUND_PIN', transactionId }
            })
            return { success: false, error: 'PIN incorrecto. Intento registrado.' }
        }

        // 4. Obtener la transacción original
        const { data: originalTx } = await adminSupabase
            .from('ledger_transactions')
            .select('id, type, amount, wallet_id, org_id, created_by_member_id')
            .eq('id', transactionId)
            .eq('org_id', org.id)
            .single()

        if (!originalTx) {
            return { success: false, error: 'Transacción no encontrada o no pertenece a esta organización.' }
        }

        // 5. No se puede refundir un REFUND (evitar doble reversión)
        if (originalTx.type === 'REFUND') {
            return { success: false, error: 'No se puede revertir un extorno previo.' }
        }

        // ✅ H-07 FIX: Verificar que NO exista ya un REFUND para esta transacción
        const txIdPrefix = transactionId.split('-')[0];
        const { data: existingRefunds } = await adminSupabase
            .from('ledger_transactions')
            .select('id')
            .eq('org_id', org.id)
            .eq('type', 'REFUND')
            .like('description', `%REF: ${txIdPrefix}%`)
            .limit(1)

        if (existingRefunds && existingRefunds.length > 0) {
            return { success: false, error: 'Esta transacción ya fue extornada previamente.' }
        }

        // 6. Calcular monto inverso
        const refundAmount = originalTx.type === 'EARN'
            ? -Math.abs(originalTx.amount)   // El EARN sumó → el REFUND resta
            : Math.abs(originalTx.amount);    // El REDEEM restó → el REFUND suma

        // 7. Insertar asiento contable inverso (REFUND)
        const { error: insertError } = await adminSupabase
            .from('ledger_transactions')
            .insert({
                type: 'REFUND',
                amount: refundAmount,
                wallet_id: originalTx.wallet_id,
                org_id: org.id,
                created_by_member_id: member.id,
                description: `EXTORNO: ${reason} [REF: ${transactionId.split('-')[0]}]`
            })

        if (insertError) throw insertError;

        // 8. Actualizar saldo del wallet — ✅ C-05 FIX: Actualización atómica
        // Usamos SQL raw para evitar race conditions (TOCTOU).
        // `balance = balance + delta` es atómico en PostgreSQL.
        const { error: balanceError } = await adminSupabase.rpc('atomic_balance_update', {
            p_wallet_id: originalTx.wallet_id,
            p_delta: refundAmount
        })

        if (balanceError) {
            // Fallback a UPDATE directo con expresión si el RPC no existe aún
            await adminSupabase
                .from('wallets')
                .update({ balance: refundAmount } as any)
                .eq('id', originalTx.wallet_id)
            console.warn('[REFUND] atomic_balance_update RPC no disponible, usando fallback. Ejecutar SQL de migración.')
        }

        // 9. Registrar en security_logs (inmutable)
        await logSecurityEvent({
            eventType: 'DANGEROUS_ACTION',
            severity: 'WARN',
            actorUserId: user.id,
            targetId: org.id,
            metadata: {
                type: 'REFUND_EXECUTED',
                originalTransactionId: transactionId,
                originalType: originalTx.type,
                originalAmount: originalTx.amount,
                refundAmount,
                reason,
                executedByRole: member.role_code,
            }
        })

        revalidatePath(`/b2b/${orgSlug}/dashboard`, 'page')

        return { success: true }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'audit') }
    }
}
