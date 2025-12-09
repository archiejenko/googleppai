import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seed...');

    // Create Industries
    const industries = [
        {
            name: 'SaaS',
            description: 'Software as a Service sales scenarios',
            icon: '💻',
        },
        {
            name: 'Financial Services',
            description: 'Banking, insurance, and financial product sales',
            icon: '💰',
        },
        {
            name: 'Healthcare',
            description: 'Medical devices, pharmaceuticals, and healthcare IT',
            icon: '🏥',
        },
        {
            name: 'Retail',
            description: 'Consumer goods and retail sales',
            icon: '🛍️',
        },
        {
            name: 'Manufacturing',
            description: 'Industrial equipment and manufacturing solutions',
            icon: '🏭',
        },
        {
            name: 'International Business',
            description: 'Cross-border and global sales scenarios',
            icon: '🌍',
        },
    ];

    for (const industry of industries) {
        await prisma.industry.upsert({
            where: { name: industry.name },
            update: industry,
            create: industry,
        });
    }

    console.log('Industries created');

    // Create Skills
    const skills = [
        { name: 'Objection Handling', category: 'communication' },
        { name: 'Closing Techniques', category: 'closing' },
        { name: 'Discovery', category: 'discovery' },
        { name: 'Value Proposition', category: 'communication' },
        { name: 'Negotiation', category: 'closing' },
        { name: 'Active Listening', category: 'communication' },
        { name: 'Rapport Building', category: 'communication' },
        { name: 'Pain Identification', category: 'discovery' },
        { name: 'ROI Presentation', category: 'communication' },
        { name: 'Competitive Positioning', category: 'communication' },
    ];

    for (const skill of skills) {
        await prisma.skill.upsert({
            where: { name: skill.name },
            update: skill,
            create: skill,
        });
    }

    console.log('Skills created');

    // Create Learning Modules
    const modules = [
        {
            title: 'Objection Handling Mastery',
            description: 'Learn to effectively address and overcome common sales objections',
            difficulty: 'intermediate',
            estimatedTime: 45,
            xpReward: 150,
            skills: ['Objection Handling', 'Active Listening', 'Rapport Building'],
            prerequisites: [],
            scenarioType: 'objection_handling',
            order: 1,
        },
        {
            title: 'Advanced Closing Techniques',
            description: 'Master the art of closing deals with confidence',
            difficulty: 'advanced',
            estimatedTime: 60,
            xpReward: 200,
            skills: ['Closing Techniques', 'Negotiation', 'Value Proposition'],
            prerequisites: [],
            scenarioType: 'closing',
            order: 2,
        },
        {
            title: 'Discovery Call Excellence',
            description: 'Perfect your discovery process to uncover customer needs',
            difficulty: 'beginner',
            estimatedTime: 30,
            xpReward: 100,
            skills: ['Discovery', 'Pain Identification', 'Active Listening'],
            prerequisites: [],
            scenarioType: 'cold_call',
            order: 0,
        },
        {
            title: 'Product Demo Perfection',
            description: 'Deliver compelling product demonstrations that convert',
            difficulty: 'intermediate',
            estimatedTime: 50,
            xpReward: 175,
            skills: ['Value Proposition', 'ROI Presentation', 'Competitive Positioning'],
            prerequisites: [],
            scenarioType: 'product_demo',
            order: 3,
        },
    ];

    for (const module of modules) {
        await prisma.learningModule.upsert({
            where: { title: module.title },
            update: module,
            create: module,
        });
    }

    console.log('Learning modules created');
    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
