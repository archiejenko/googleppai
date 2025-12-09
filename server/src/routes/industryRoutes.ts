import { Router } from 'express';
import {
    getIndustries,
    getIndustry,
    createIndustry,
} from '../controllers/industryController';

const router = Router();

router.get('/', getIndustries);
router.get('/:id', getIndustry);
router.post('/', createIndustry);

export default router;
