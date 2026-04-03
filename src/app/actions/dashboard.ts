'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sanitizeError } from '@/lib/error-sanitizer'

export async function getDashboardMetrics(orgSlug: string) {
    // ✅ S4-01 FIX: Autenticación obligatoria antes de usar admin client
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) return { success: false, error: 'No autorizado' }

    const supabase = createAdminClient()

    try {
        // 1. Get org id
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, commercial_name, subscription_tier')
            .eq('slug', orgSlug)
            .single()

        if (orgError) throw new Error('Organizacion no encontrada');

        // ✅ S4-01 FIX: Verificar que el caller es miembro activo de esta org
        const { data: membership } = await supabase
            .from('organization_members')
            .select('id')
            .eq('user_id', user.id)
            .eq('org_id', org.id)
            .eq('status', 'ACTIVE')
            .single()

        if (!membership) {
            return { success: false, error: 'No tienes permisos en esta organización.' }
        }

        // 2. Masa Monetaria Emitida (Earn in current month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: earns } = await supabase
            .from('ledger_transactions')
            .select('amount, metadata')
            .eq('org_id', org.id)
            .eq('type', 'EARN')
            .gte('created_at', startOfMonth.toISOString());

        const masaMonetaria = earns?.reduce((sum, tx: any) => sum + tx.amount, 0) || 0;

        // Transparencia: Calcular puntos base vs bonus multiplicador
        const puntosBase = earns?.reduce((sum, tx: any) => {
            const base = tx.metadata?.base_amount;
            return sum + (base != null ? base : tx.amount);
        }, 0) || 0;
        const bonusMultiplicador = masaMonetaria - puntosBase;

        const { data: redeems } = await supabase
            .from('ledger_transactions')
            .select('amount')
            .eq('org_id', org.id)
            .eq('type', 'REDEEM')
            .gte('created_at', startOfMonth.toISOString());

        const canjes = redeems?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;

        const { data: recentTransactions } = await supabase
            .from('ledger_transactions')
            .select(`
                id, type, amount, metadata, created_at, 
                organization_members!ledger_transactions_created_by_member_id_fkey (
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
            `)
            .eq('org_id', org.id)
            .order('created_at', { ascending: false })
            .limit(10);

        // Process and Mask Transactions
        const maskedTransactions = recentTransactions?.map((tx: any) => {
            const rawPhone = tx.wallets?.users?.phone;
            let maskedPhone = 'Desconocido';

            if (rawPhone && rawPhone.length > 5) {
                // Seguridad: Solo últimos 3 dígitos visibles
                maskedPhone = `******${rawPhone.substring(rawPhone.length - 3)}`;
            }

            return {
                ...tx,
                masked_phone: maskedPhone
            }
        }) || [];

        // Get ghost users specific to this organization via wallets
        const { data: orgWallets } = await supabase
            .from('wallets')
            .select('user_id')
            .eq('org_id', org.id);

        const orgUserIds = orgWallets?.map(w => w.user_id) || [];

        let ghostUsers = 0;
        if (orgUserIds.length > 0) {
            const { count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('is_registered', false)
                .in('id', orgUserIds);
            ghostUsers = count || 0;
        }

        // ============================================================
        // FASE 5: DATOS PARA GRÁFICOS DE TENDENCIA (Últimos 7 días)
        // ============================================================
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: weekTransactions } = await supabase
            .from('ledger_transactions')
            .select('amount, type, metadata, created_at')
            .eq('org_id', org.id)
            .gte('created_at', sevenDaysAgo.toISOString());

        // Agrupar por día — con desglose base vs bonus
        const dailyMap: Record<string, { earned: number; baseEarned: number; redeemed: number; count: number }> = {};
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const key = d.toISOString().split('T')[0];
            dailyMap[key] = { earned: 0, baseEarned: 0, redeemed: 0, count: 0 };
        }

        weekTransactions?.forEach((tx: any) => {
            const key = tx.created_at?.split('T')[0];
            if (dailyMap[key]) {
                dailyMap[key].count++;
                if (tx.type === 'EARN') {
                    dailyMap[key].earned += tx.amount;
                    // Retrocompatible: sin metadata → base = amount (x1)
                    const baseAmt = tx.metadata?.base_amount ?? tx.amount;
                    dailyMap[key].baseEarned += baseAmt;
                }
                if (tx.type === 'REDEEM') dailyMap[key].redeemed += Math.abs(tx.amount);
            }
        });

        const dailyTrend = Object.entries(dailyMap).map(([date, data]) => {
            const d = new Date(date + 'T12:00:00');
            return {
                day: dayNames[d.getDay()],
                date,
                emitidos: data.earned,
                baseEmitidos: data.baseEarned,
                bonusEmitidos: data.earned - data.baseEarned,
                canjeados: data.redeemed,
                operaciones: data.count,
            };
        });

        // ============================================================
        // FASE 5: ALERTAS DE FRAUDE REALES DESDE security_logs
        // ============================================================
        const { data: fraudAlerts } = await supabase
            .from('security_logs')
            .select('id, event_type, severity, metadata, created_at')
            .eq('target_id', org.id)
            .order('created_at', { ascending: false })
            .limit(5);

        const { count: totalAlerts } = await supabase
            .from('security_logs')
            .select('*', { count: 'exact', head: true })
            .eq('target_id', org.id)
            .in('severity', ['WARN', 'CRITICAL']);

        // Total unique customers (registered + ghost)
        const totalCustomers = orgWallets?.length || 0;
        const conversionRate = totalCustomers > 0
            ? Math.round(((totalCustomers - ghostUsers) / totalCustomers) * 100)
            : 0;

        const fetchedAt = new Date().toISOString();

        return {
            success: true,
            data: {
                orgName: org.commercial_name,
                planTier: org.subscription_tier || 'FREE',
                masaMonetaria,
                puntosBase,
                bonusMultiplicador,
                canjesMes: canjes,
                recentTransactions: maskedTransactions,
                ghostUsers,
                totalCustomers,
                conversionRate,
                dailyTrend,
                fraudAlerts: fraudAlerts || [],
                totalFraudAlerts: totalAlerts || 0,
                fetchedAt
            }
        }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'dashboard') }
    }
}

export async function getAllTransactions(
    orgSlug: string,
    page: number = 1,
    pageSize: number = 50,
    filters?: {
        dateFrom?: string;
        dateTo?: string;
        type?: 'EARN' | 'REDEEM' | 'ALL';
        phone?: string;
        cashierId?: string;
    }
) {
    // ✅ S4-01 FIX: Autenticación obligatoria
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) return { success: false, error: 'No autorizado' }

    const supabase = createAdminClient()

    try {
        // 1. Get org id
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single()

        if (orgError) throw new Error('Organizacion no encontrada');

        // ✅ S4-01 FIX: Verificar que el caller es miembro activo
        const { data: membership } = await supabase
            .from('organization_members')
            .select('id')
            .eq('user_id', user.id)
            .eq('org_id', org.id)
            .eq('status', 'ACTIVE')
            .single()

        if (!membership) {
            return { success: false, error: 'No tienes permisos en esta organización.' }
        }

        // 2. Fetch all transactions with pagination wrapper
        const offset = (page - 1) * pageSize;

        let query = supabase
            .from('ledger_transactions')
            .select(`
                id, type, amount, metadata, created_at, 
                organization_members!ledger_transactions_created_by_member_id_fkey (
                    user_id,
                    users (
                        full_name,
                        email
                    )
                ),
                wallets!inner (
                    users!inner (
                        phone
                    )
                )
            `, { count: 'exact' })
            .eq('org_id', org.id);

        // --- Apply Filters ---
        if (filters) {
            if (filters.type && filters.type !== 'ALL') {
                query = query.eq('type', filters.type);
            }
            if (filters.dateFrom) {
                // Start of the selected day
                const startDay = new Date(filters.dateFrom);
                startDay.setHours(0, 0, 0, 0);
                query = query.gte('created_at', startDay.toISOString());
            }
            if (filters.dateTo) {
                // End of the selected day
                const endDay = new Date(filters.dateTo);
                endDay.setHours(23, 59, 59, 999);
                query = query.lte('created_at', endDay.toISOString());
            }
            if (filters.cashierId) {
                query = query.eq('created_by_member_id', filters.cashierId);
            }
            if (filters.phone) {
                // ✅ S4-02 FIX: Sanitizar phone para prevenir inyección PostgREST
                const sanitizedPhone = filters.phone
                    .replace(/[().,;:!*\\/%&|"'<>{}[\]]/g, '')
                    .trim()
                    .substring(0, 20);
                if (sanitizedPhone.length > 0) {
                    query = query.ilike('wallets.users.phone', `%${sanitizedPhone}%`);
                }
            }
        }

        const { data: allTransactions, error: txError, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (txError) throw txError;

        // Process and Mask Transactions
        const maskedTransactions = allTransactions?.map((tx: any) => {
            const rawPhone = tx.wallets?.users?.phone;
            let maskedPhone = 'Desconocido';

            if (rawPhone && rawPhone.length > 5) {
                // Seguridad: Solo últimos 3 dígitos visibles
                maskedPhone = `******${rawPhone.substring(rawPhone.length - 3)}`;
            }

            return {
                ...tx,
                masked_phone: maskedPhone
            }
        }) || [];

        return {
            success: true,
            data: {
                transactions: maskedTransactions,
                totalCount: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize)
            }
        }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'dashboard') }
    }
}

