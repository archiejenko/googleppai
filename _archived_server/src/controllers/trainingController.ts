import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { continueConversation, analyzePitch } from '../utils/gemini';

export const createTrainingSession = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { scenario, difficulty, targetPersona, pitchGoal, timeLimit, language, industryId } = req.body;

        if (!scenario || !difficulty) {
            return res.status(400).json({ error: 'Scenario and difficulty are required' });
        }

        const session = await prisma.trainingSession.create({
            data: {
                userId,
                scenario,
                difficulty,
                targetPersona,
                pitchGoal,
                timeLimit,
                language: language || 'en',
                industryId,
            },
        });

        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create training session' });
    }
};

export const getTrainingSessions = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const sessions = await prisma.trainingSession.findMany({
            where: { userId },
            include: {
                industry: true,
                pitches: {
                    select: {
                        id: true,
                        score: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(sessions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch training sessions' });
    }
};

export const getTrainingSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const session = await prisma.trainingSession.findUnique({
            where: { id },
            include: {
                industry: true,
                pitches: true,
            },
        });

        if (!session || session.userId !== userId) {
            return res.status(404).json({ error: 'Training session not found' });
        }

        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch training session' });
    }
};

export const completeTrainingSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { messages } = req.body; // Expect chat messages
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const session = await prisma.trainingSession.findUnique({
            where: { id },
        });

        if (!session || session.userId !== userId) {
            return res.status(404).json({ error: 'Training session not found' });
        }

        let pitchId = '';

        // If messages are provided, perform analysis
        if (messages && Array.isArray(messages) && messages.length > 0) {
            const transcript = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
            const analysis = await analyzePitch({ text: transcript });

            const pitch = await prisma.pitch.create({
                data: {
                    userId,
                    trainingSessionId: id,
                    audioUrl: 'text-based-session', // Placeholder for text-only sessions
                    transcript,
                    analysis: analysis as any, // Store full analysis object
                    feedback: analysis.feedback as any, // Store feedback separate if needed, or structured
                    score: analysis.score,
                    sentimentScore: analysis.sentimentScore,
                    confidenceScore: analysis.confidenceScore,
                    paceScore: analysis.paceScore,
                    clarityScore: analysis.clarityScore,
                    duration: analysis.duration,
                }
            });
            pitchId = pitch.id;
        }

        // Calculate XP based on difficulty
        const xpMap: Record<string, number> = {
            easy: 50,
            medium: 100,
            hard: 200,
        };

        const xpEarned = xpMap[session.difficulty] || 50;

        const updatedSession = await prisma.trainingSession.update({
            where: { id },
            data: {
                completed: true,
                xpEarned,
            },
        });

        // Update user's total XP
        await prisma.user.update({
            where: { id: userId },
            data: {
                totalXP: {
                    increment: xpEarned,
                },
            },
        });

        res.json({ ...updatedSession, pitchId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to complete training session' });
    }
};

export const chatWithAi = async (req: Request, res: Response) => {
    try {
        const { sessionId, message, history } = req.body;
        const userId = (req as AuthRequest).user?.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const session = await prisma.trainingSession.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.userId !== userId) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const response = await continueConversation(
            history || [],
            message,
            {
                scenario: session.scenario,
                persona: session.targetPersona || 'prospect',
                goal: session.pitchGoal || 'close the deal'
            }
        );

        res.json({ response });

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
};
