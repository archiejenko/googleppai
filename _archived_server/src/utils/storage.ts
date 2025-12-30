import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials missing for storage');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'pitch-recordings';

export const uploadFile = async (file: Express.Multer.File): Promise<string> => {
    const { originalname, buffer, mimetype } = file;
    const fileName = `${Date.now()}-${originalname.replace(/ /g, "_")}`;

    const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(fileName, buffer, {
            contentType: mimetype,
            upsert: false
        });

    if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
};

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
