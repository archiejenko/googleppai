import { PrismaClient } from '@prisma/client';

console.log('Initializing Prisma Client...');

let prisma: PrismaClient;

try {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.warn('WARNING: DATABASE_URL is not set');
    }

    prisma = new PrismaClient({
        datasources: {
            db: {
                url: url,
            },
        },
        log: ['error', 'warn'],
    });
    console.log('Prisma Client initialized successfully');
} catch (error) {
    console.error('FATAL: Failed to initialize Prisma Client:', error);
    console.error('PrismaClient:', PrismaClient);
    throw error;
}

export default prisma;
