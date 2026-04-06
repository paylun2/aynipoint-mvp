import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Inicializar de forma segura para evitar errores en compilación si faltan env vars
const getRedisClient = () => {
    try {
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
            console.warn('⚠️ UPSTASH_REDIS_REST_URL o UPSTASH_REDIS_REST_TOKEN no están definidos. Redis funcionará en modo MEMORIA GLOBAL (Dev).');
            
            // In Next.js dev, use globalThis to persist state across API Hot-Reloads
            const globalAny = globalThis as any;
            if (!globalAny._redisMockStore) {
                globalAny._redisMockStore = new Map<string, any>();
            }
            const mockStore = globalAny._redisMockStore;

            return {
                get: async (key: string) => {
                    const val = mockStore.has(key) ? mockStore.get(key) : null;
                    console.log(`[MOCK REDIS GET] ${key} -> ${val}`);
                    return val;
                },
                set: async (key: string, value: any) => { 
                    mockStore.set(key, value); 
                    console.log(`[MOCK REDIS SET] ${key} -> ${value}`);
                    return 'OK'; 
                },
                setex: async (key: string, ttl: number, value: any) => {
                    mockStore.set(key, value); 
                    console.log(`[MOCK REDIS SETEX] ${key} -> ${value} (TTL ${ttl}s)`);
                    setTimeout(() => mockStore.delete(key), ttl * 1000);
                    return 'OK'; 
                },
                del: async (key: string) => { 
                    mockStore.delete(key); 
                    console.log(`[MOCK REDIS DEL] ${key}`);
                    return 1; 
                },
            } as unknown as Redis;
        }

        return new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
    } catch (error) {
        console.error('Error inicializando Redis:', error);
        return null;
    }
}

export const redis = getRedisClient();

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITERS CENTRALIZADOS — Cada endpoint crítico tiene su propio
// límite calibrado al riesgo de la operación.
// Si Redis no está configurado, cada export será `null` y los
// server actions simplemente se saltan el check (graceful degradation).
// ═══════════════════════════════════════════════════════════════════

const isRedisActive = redis && process.env.UPSTASH_REDIS_REST_URL;

/** POS: 5 transacciones cada 10 segundos por cajero (operación rápida en caja) */
export const rateLimitPos = isRedisActive
    ? new Ratelimit({
        redis: redis as Redis,
        limiter: Ratelimit.slidingWindow(5, '10 s'),
        analytics: true,
        prefix: '@upstash/ratelimit/pos',
    }) : null;

/** POS: PIN Validation Anti-BruteForce (3 attempts / 5 mins per org+user) */
export const rateLimitPosPin = isRedisActive
    ? new Ratelimit({
        redis: redis as Redis,
        limiter: Ratelimit.slidingWindow(3, '5 m'),
        analytics: true,
        prefix: '@upstash/ratelimit/pos-pin',
    }) : null;

/** Validación de teléfono: 5 intentos cada 60 segundos por número (anti-ghost-spam) */
export const rateLimitValidation = isRedisActive
    ? new Ratelimit({
        redis: redis as Redis,
        limiter: Ratelimit.slidingWindow(5, '60 s'),
        analytics: true,
        prefix: '@upstash/ratelimit/validation',
    }) : null;

/** Refund / Extorno: 3 operaciones cada 60 segundos por usuario (protección financiera) */
export const rateLimitRefund = isRedisActive
    ? new Ratelimit({
        redis: redis as Redis,
        limiter: Ratelimit.slidingWindow(3, '60 s'),
        analytics: true,
        prefix: '@upstash/ratelimit/refund',
    }) : null;

/** Onboarding: 3 organizaciones cada 120 segundos por usuario (anti-bot) */
export const rateLimitOnboarding = isRedisActive
    ? new Ratelimit({
        redis: redis as Redis,
        limiter: Ratelimit.slidingWindow(3, '120 s'),
        analytics: true,
        prefix: '@upstash/ratelimit/onboarding',
    }) : null;
