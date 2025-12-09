import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { uploadFile } from '../utils/storage';
import { analyzePitch } from '../utils/gemini';
import { AuthRequest } from '../middleware/authMiddleware';

export const createPitch = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No audio file provided' });

        // Upload to GCS
        const audioUrl = await uploadFile(file);

        // Get training session ID if provided
        const trainingSessionId = req.body.trainingSessionId;

        // TODO: Transcribe audio to text. For now, we'll use a placeholder or expect text in body.
        // Ideally, we send audio to Gemini for transcription + analysis.
        const transcript = req.body.transcript || "Audio transcription placeholder";

        // Analyze with Gemini
        const analysisResult = await analyzePitch(transcript);

        const pitch = await prisma.pitch.create({
            data: {
                userId,
                audioUrl,
                transcript,
                analysis: analysisResult as any,
                feedback: analysisResult.feedback,
                score: analysisResult.score,
                trainingSessionId,
                duration: analysisResult.duration,
                sentimentScore: analysisResult.sentimentScore,
                confidenceScore: analysisResult.confidenceScore,
                paceScore: analysisResult.paceScore,
                clarityScore: analysisResult.clarityScore,
            },
        });

        res.json(pitch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create pitch' });
    }
};

export const getPitches = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const pitches = await prisma.pitch.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(pitches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pitches' });
    }
};

export const getPitch = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const pitch = await prisma.pitch.findUnique({
            where: { id },
        });

        if (!pitch || pitch.userId !== userId) {
            return res.status(404).json({ error: 'Pitch not found' });
        }

        res.json(pitch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pitch' });
    }
};
