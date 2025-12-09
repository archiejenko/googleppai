import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getLearningModules = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const modules = await prisma.learningModule.findMany({
            where: { isActive: true },
            include: {
                userProgress: {
                    where: { userId },
                },
            },
            orderBy: { order: 'asc' },
        });

        res.json(modules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch learning modules' });
    }
};

export const startModule = async (req: Request, res: Response) => {
    try {
        const { moduleId } = req.params;
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const progress = await prisma.userProgress.upsert({
            where: {
                userId_moduleId: {
                    userId,
                    moduleId,
                },
            },
            update: {
                status: 'in_progress',
            },
            create: {
                userId,
                moduleId,
                status: 'in_progress',
            },
        });

        res.json(progress);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to start module' });
    }
};

export const updateModuleProgress = async (req: Request, res: Response) => {
    try {
        const { moduleId } = req.params;
        const { progress, score } = req.body;
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const status = progress >= 100 ? 'completed' : 'in_progress';

        const updatedProgress = await prisma.userProgress.upsert({
            where: {
                userId_moduleId: {
                    userId,
                    moduleId,
                },
            },
            update: {
                progress,
                status,
                score,
                completedAt: progress >= 100 ? new Date() : null,
            },
            create: {
                userId,
                moduleId,
                progress,
                status,
                score,
                completedAt: progress >= 100 ? new Date() : null,
            },
        });

        // If completed, award XP
        if (status === 'completed') {
            const module = await prisma.learningModule.findUnique({
                where: { id: moduleId },
            });

            if (module) {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        totalXP: {
                            increment: module.xpReward,
                        },
                    },
                });
            }
        }

        res.json(updatedProgress);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update module progress' });
    }
};

export const getUserProgress = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const progress = await prisma.userProgress.findMany({
            where: { userId },
            include: {
                module: true,
            },
        });

        res.json(progress);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user progress' });
    }
};
