import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                teamId: true,
                team: {
                    select: { name: true }
                },
                totalXP: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Update user role (admin only)
export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'team_lead', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be user, team_lead, or admin' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
};

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = (req as AuthRequest).user?.userId;

        // Prevent admin from deleting themselves
        if (id === adminId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Delete related records first
        await prisma.userSkill.deleteMany({ where: { userId: id } });
        await prisma.userProgress.deleteMany({ where: { userId: id } });
        await prisma.pitch.deleteMany({ where: { userId: id } });
        await prisma.trainingSession.deleteMany({ where: { userId: id } });

        await prisma.user.delete({ where: { id } });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Get all teams (admin only)
export const getAllTeams = async (req: Request, res: Response) => {
    try {
        const teams = await prisma.team.findMany({
            include: {
                members: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                _count: {
                    select: { members: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(teams);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
};

// Get platform-wide analytics (admin only)
export const getPlatformAnalytics = async (req: Request, res: Response) => {
    try {
        const [userCount, teamCount, pitchCount, totalXP] = await Promise.all([
            prisma.user.count(),
            prisma.team.count(),
            prisma.pitch.count(),
            prisma.user.aggregate({
                _sum: { totalXP: true },
            }),
        ]);

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [recentPitches, recentUsers] = await Promise.all([
            prisma.pitch.count({
                where: { createdAt: { gte: thirtyDaysAgo } },
            }),
            prisma.user.count({
                where: { createdAt: { gte: thirtyDaysAgo } },
            }),
        ]);

        // Get average pitch score
        const avgScore = await prisma.pitch.aggregate({
            _avg: { score: true },
        });

        // Get user breakdown by role
        const roleBreakdown = await prisma.user.groupBy({
            by: ['role'],
            _count: true,
        });

        res.json({
            totalUsers: userCount,
            totalTeams: teamCount,
            totalPitches: pitchCount,
            totalXP: totalXP._sum.totalXP || 0,
            averagePitchScore: Math.round(avgScore._avg.score || 0),
            recentActivity: {
                pitchesLast30Days: recentPitches,
                newUsersLast30Days: recentUsers,
            },
            usersByRole: roleBreakdown.reduce((acc, item) => {
                acc[item.role] = item._count;
                return acc;
            }, {} as Record<string, number>),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch platform analytics' });
    }
};

// Assign user to team (admin/manager)
export const assignUserToTeam = async (req: Request, res: Response) => {
    try {
        const { userId, teamId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { teamId: teamId || null }, // null removes from team
            select: {
                id: true,
                email: true,
                name: true,
                teamId: true,
            },
        });

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to assign user to team' });
    }
};
