import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                industry: true,
                experienceLevel: true,
                totalXP: true,
                teamId: true,
                team: {
                    select: { id: true, name: true }
                },
                createdAt: true,
                _count: {
                    select: {
                        pitches: true,
                        trainingSessions: true,
                    }
                }
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

// Update current user profile
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        const { name, industry, experienceLevel } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name !== undefined && { name }),
                ...(industry !== undefined && { industry }),
                ...(experienceLevel !== undefined && { experienceLevel }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                industry: true,
                experienceLevel: true,
                totalXP: true,
            },
        });

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

// Change password
export const changePassword = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

// Get user stats for dashboard
export const getUserStats = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;

        const [user, recentPitches, trainingSessions] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    totalXP: true,
                    experienceLevel: true,
                },
            }),
            prisma.pitch.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    score: true,
                    createdAt: true,
                },
            }),
            prisma.trainingSession.count({
                where: { userId, completed: true },
            }),
        ]);

        // Calculate average score
        const avgScore = await prisma.pitch.aggregate({
            where: { userId },
            _avg: { score: true },
        });

        // Get skill levels
        const skills = await prisma.userSkill.findMany({
            where: { userId },
            include: { skill: true },
            orderBy: { level: 'desc' },
            take: 5,
        });

        res.json({
            totalXP: user?.totalXP || 0,
            experienceLevel: user?.experienceLevel || 'beginner',
            averageScore: Math.round(avgScore._avg.score || 0),
            completedSessions: trainingSessions,
            recentPitches,
            topSkills: skills.map(s => ({
                name: s.skill.name,
                level: s.level,
            })),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
};

// Admin: Simulate role (for testing different views)
export const getSimulatedRole = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        const { simulateRole } = req.query;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Only admins can simulate other roles
        if (user.role !== 'admin') {
            return res.json({ ...user, simulatedRole: null });
        }

        // Return with simulated role for UI purposes only
        const validRoles = ['user', 'team_lead', 'admin'];
        const simRole = validRoles.includes(simulateRole as string) ? simulateRole : null;

        res.json({
            ...user,
            simulatedRole: simRole,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get simulated role' });
    }
};
