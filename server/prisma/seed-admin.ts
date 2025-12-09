import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'enquiries@ejtech.co.uk';
const ADMIN_PASSWORD = 'AdminPass123!'; // Change this after first login!
const ADMIN_NAME = 'Admin';

async function seedAdmin() {
    console.log('🔐 Seeding admin user...');

    try {
        // Check if admin already exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email: ADMIN_EMAIL },
        });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists. Updating role to admin...');
            await prisma.user.update({
                where: { email: ADMIN_EMAIL },
                data: { role: 'admin' },
            });
            console.log('✅ Admin role confirmed for:', ADMIN_EMAIL);
            return;
        }

        // Create new admin user
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        const admin = await prisma.user.create({
            data: {
                email: ADMIN_EMAIL,
                password: hashedPassword,
                name: ADMIN_NAME,
                role: 'admin',
            },
        });

        console.log('✅ Admin user created successfully!');
        console.log('   Email:', admin.email);
        console.log('   Password:', ADMIN_PASSWORD);
        console.log('');
        console.log('⚠️  IMPORTANT: Change this password after your first login!');
    } catch (error) {
        console.error('❌ Failed to seed admin user:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedAdmin();
