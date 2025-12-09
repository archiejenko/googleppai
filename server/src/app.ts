import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes';
import pitchRoutes from './routes/pitchRoutes';
import trainingRoutes from './routes/trainingRoutes';
import learningRoutes from './routes/learningRoutes';
import teamRoutes from './routes/teamRoutes';
import industryRoutes from './routes/industryRoutes';
import adminRoutes from './routes/adminRoutes';

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

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default app;
