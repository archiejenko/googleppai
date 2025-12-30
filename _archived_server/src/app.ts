import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';

import authRoutes from './routes/authRoutes';
import pitchRoutes from './routes/pitchRoutes';
import trainingRoutes from './routes/trainingRoutes';
import learningRoutes from './routes/learningRoutes';
import teamRoutes from './routes/teamRoutes';
import industryRoutes from './routes/industryRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import prisma from './utils/prisma';

const app = express();

// Configure CORS for production
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/pitches', pitchRoutes);
app.use('/training', trainingRoutes);
app.use('/learning', learningRoutes);
app.use('/team', teamRoutes);
app.use('/industries', industryRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// One-time setup endpoint to create admin user
// Remove this endpoint after initial setup!
app.post('/setup-admin', async (req, res) => {
    const { setupKey } = req.body;

    // Simple protection - change this key before deploying
    if (setupKey !== 'EJTECH_ADMIN_SETUP_2024') {
        return res.status(403).json({ error: 'Invalid setup key' });
    }

    try {
        const adminEmail = 'enquiries@ejtech.co.uk';
        const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
        if (!adminPassword) {
            return res.status(500).json({ error: 'Admin password not configured' });
        }

        // Check if admin exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (existingAdmin) {
            // Update to admin role if exists
            await prisma.user.update({
                where: { email: adminEmail },
                data: { role: 'admin' }
            });
            return res.json({ message: 'Admin role updated', email: adminEmail });
        }

        // Create new admin user
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                name: 'Admin',
                role: 'admin',
            },
        });

        res.json({
            message: 'Admin user created successfully!',
            email: admin.email,
            temporaryPassword: adminPassword,
            note: 'Please change password after first login!'
        });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ error: 'Setup failed', details: String(error) });
    }
});

export default app;

