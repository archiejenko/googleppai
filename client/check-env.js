const requiredVars = [
    'VITE_API_URL'
];

const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
    // In Netlify, we might just warn, or fail if critical.
    // For VITE_API_URL, it's critical for the app to talk to backend.

    // However, Vite loads env vars differently (loadEnv). 
    // This script runs in Node.
    // We can use 'dotenv' or just check process.env if Netlify injects them into the build environment.

    console.warn('WARNING: The following environment variables are missing in the build environment:');
    missingVars.forEach(v => console.warn(` - ${v}`));
    console.warn('Assuming they might be provided via .env files or Netlify UI context.');

    // We don't exit(1) because Vite might pick them up from .env.production
} else {
    console.log('Environment variables check passed.');
}
