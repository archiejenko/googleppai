require('dotenv').config();

console.log('--- Environment Check ---');
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    // Hide password
    const safeUrl = url.replace(/:([^:@]+)@/, ':****@');
    console.log('DATABASE_URL format:', safeUrl.substring(0, 50) + '...');
    try {
        const u = new URL(url);
        console.log('DATABASE_HOST:', u.hostname);
    } catch (e) {
        console.log('Could not parse URL:', e.message);
    }
}
console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
console.log('GEMINI_API_KEY set:', !!process.env.GEMINI_API_KEY);
console.log('-------------------------');
