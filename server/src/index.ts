import app from './app';
import dotenv from 'dotenv';

dotenv.config(); // Load .env first

// Load secrets.env for local development
if (process.env.NODE_ENV !== 'production') {
    const secretsPath = require('path').resolve(__dirname, '../secrets.env');
    const result = dotenv.config({ path: secretsPath });
    if (result.error) {
        console.warn('Warning: secrets.env not found at', secretsPath);
    } else {
        console.log('Loaded secrets from secrets.env');
    }
}

const PORT = process.env.PORT || 3000;

console.log('Starting server...');
console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL_SET: !!process.env.DATABASE_URL
});

try {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
} catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
}
