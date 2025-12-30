import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

export interface AuthRequest extends Request {
    user?: { userId: string; role: string };
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET) as { userId: string; role: string };
        (req as AuthRequest).user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Role-based authorization middleware
export const requireRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthRequest;
        if (!authReq.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (!roles.includes(authReq.user.role)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }
        next();
    };
};

// Convenience middleware for common role checks
export const requireAdmin = requireRole('admin');
export const requireManager = requireRole('admin', 'team_lead');

// Export as authMiddleware for backward compatibility
export const authMiddleware = authenticate;

