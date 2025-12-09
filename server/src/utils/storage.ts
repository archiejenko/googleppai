import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import path from 'path';

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'pitchperfectai';
const bucket = storage.bucket(bucketName);

export const uploadFile = (file: Express.Multer.File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const { originalname, buffer } = file;
        const blob = bucket.file(Date.now() + '-' + originalname.replace(/ /g, "_"));
        const blobStream = blob.createWriteStream({
            resumable: false,
        });

        blobStream.on('finish', () => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            resolve(publicUrl);
        });

        blobStream.on('error', (err) => {
            reject(err);
        });

        blobStream.end(buffer);
    });
};

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
