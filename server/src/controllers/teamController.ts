import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getTeam = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { team: true },
        });

        if (!user?.teamId) {
            return res.status(404).json({ error: 'No team assigned' });
        }

        const team = await prisma.team.findUnique({
            where: { id: user.teamId },
            include: {
                members: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        totalXP: true,
                        createdAt: true,
                        skills: {
                            include: {
                                skill: true,
                            },
                        },
                    },
                },
            },
        });

        res.json(team);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch team' });
    }
};

export const getTeamAnalytics = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user?.teamId) {
            return res.status(404).json({ error: 'No team assigned' });
        }

        const team = await prisma.team.findUnique({
            where: { id: user.teamId },
            include: {
                members: {
                    include: {
                        pitches: {
                            where: {
                                createdAt: {
                                    gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Calculate analytics
        const allPitches = team.members.flatMap(m => m.pitches);
        const totalCalls = allPitches.length;
        const averageScore = totalCalls > 0
            ? Math.round(allPitches.reduce((sum, p) => sum + (p.score || 0), 0) / totalCalls)
            : 0;

        // Find members needing attention (avg score < 60)
        const membersNeedingAttention = team.members.filter(member => {
            const memberPitches = member.pitches;
            if (memberPitches.length === 0) return true;
            const avgScore = memberPitches.reduce((sum, p) => sum + (p.score || 0), 0) / memberPitches.length;
            return avgScore < 60;
        }).length;

        // Find top performer
        const memberScores = team.members.map(member => ({
            id: member.id,
            name: member.name,
            avgScore: member.pitches.length > 0
                ? member.pitches.reduce((sum, p) => sum + (p.score || 0), 0) / member.pitches.length
                : 0,
        }));

        const topPerformer = memberScores.reduce((top, current) =>
            current.avgScore > top.avgScore ? current : top
            , { id: '', name: 'N/A', avgScore: 0 });

        res.json({
            averageScore,
            totalCalls,
            membersNeedingAttention,
            topPerformer,
            memberCount: team.members.length,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch team analytics' });
    }
};

export const createTeam = async (req: Request, res: Response) => {
    try {
        const { name, description, industry } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Team name is required' });
        }

        const team = await prisma.team.create({
            data: {
                name,
                description,
                industry,
            },
        });

        res.json(team);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create team' });
    }
};

export const assignUserToTeam = async (req: Request, res: Response) => {
    try {
        const { userId, teamId } = req.body;

        if (!userId || !teamId) {
            return res.status(400).json({ error: 'User ID and Team ID are required' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { teamId },
        });

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to assign user to team' });
    }
};
