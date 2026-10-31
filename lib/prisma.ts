import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// The database closes idle sessions aggressively (Postgres 57P05
// "terminating connection due to idle-session timeout"). A pooled Prisma
// connection can therefore be stale by the time the next request uses it,
// making reads fail intermittently. Retry such transient connection errors
// after forcing a reconnect; Prisma re-opens a fresh connection on the next
// query automatically.
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message ?? '');
      const code = e?.code;
      const transient =
        code === 'P1001' ||
        code === 'P1017' ||
        code === 'P2024' ||
        /idle-session timeout|terminating connection|connection closed|Connection reset|server closed the connection|ECONNRESET|Closed/i.test(
          msg
        );
      if (!transient || attempt === retries) throw e;
      try {
        await prisma.$disconnect();
      } catch {
        // ignore disconnect errors; next query reconnects
      }
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
  throw lastErr;
}
