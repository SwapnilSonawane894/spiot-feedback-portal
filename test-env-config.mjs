// Test if env-config is working
import './src/lib/env-config.ts';

console.log('\n=== After importing env-config ===');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '[SET]' : '[NOT SET]');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
console.log('\n=== Replit env vars ===');
console.log('REPLIT_DEV_DOMAIN:', process.env.REPLIT_DEV_DOMAIN);
console.log('REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
