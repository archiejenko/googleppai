import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getIndustries = async (req: Request, res: Response) => {
    try {
        const industries = await prisma.industry.findMany({
            orderBy: { name: 'asc' },
        });

        res.json(industries);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch industries' });
    }
};

export const getIndustry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const industry = await prisma.industry.findUnique({
            where: { id },
        });

        if (!industry) {
            return res.status(404).json({ error: 'Industry not found' });
        }

        res.json(industry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch industry' });
    }
};

export const createIndustry = async (req: Request, res: Response) => {
    try {
        const { name, description, icon, scenarioTemplates } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Industry name is required' });
        }

        const industry = await prisma.industry.create({
            data: {
                name,
                description,
                icon,
                scenarioTemplates,
            },
        });

        res.json(industry);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create industry' });
    }
};
