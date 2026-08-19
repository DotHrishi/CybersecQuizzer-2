import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function getDatabaseUrl(): string {
  // If an external database URL is configured, use it directly
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
    return process.env.DATABASE_URL;
  }

  // On Vercel / AWS Lambda / Serverless environments, the filesystem is read-only except /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production') {
    const tmpDbPath = path.join('/tmp', 'dev.db');

    if (!fs.existsSync(tmpDbPath)) {
      const candidatePaths = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
        path.join('/var/task', 'prisma', 'dev.db'),
        path.join('/var/task', 'dev.db'),
        path.resolve(process.cwd(), '..', 'prisma', 'dev.db'),
        path.join(__dirname, 'prisma', 'dev.db'),
        path.join(__dirname, '..', 'prisma', 'dev.db'),
        path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
      ];

      let copied = false;
      for (const candidate of candidatePaths) {
        try {
          if (fs.existsSync(candidate)) {
            const stats = fs.statSync(candidate);
            if (stats.size > 0) {
              fs.copyFileSync(candidate, tmpDbPath);
              copied = true;
              console.log(`[Database Init] Initialized /tmp/dev.db from ${candidate} (${stats.size} bytes)`);
              break;
            }
          }
        } catch (err) {
          console.warn(`[Database Init] Could not copy from ${candidate}:`, err);
        }
      }

      if (!copied) {
        try {
          // If no template was found, touch an empty file so SQLite can initialize
          fs.writeFileSync(tmpDbPath, '');
          console.log('[Database Init] Created new empty database at /tmp/dev.db');
        } catch (err) {
          console.error('[Database Init] Failed creating /tmp/dev.db:', err);
        }
      }
    }

    return `file:${tmpDbPath}`;
  }

  return process.env.DATABASE_URL || 'file:./dev.db';
}

const resolvedDbUrl = getDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
