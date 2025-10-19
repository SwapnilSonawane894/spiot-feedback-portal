// Default environment configuration for zero-setup deployment
// These values are used if environment variables are not set

// Set defaults if not already defined
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://8423ec093c3a53c0c27d1c9ec71a462f96dc55b5ad31d81e7ee82f9ec99098c9:sk_pngJjThsF8zs08sVXH4R-@db.prisma.io:5432/postgres?sslmode=require";
}

if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "4M6PmUDdOTgSuDLaE1+9fAxJFnD0Jbxgklph8RqzheA=";
}

if (!process.env.NEXTAUTH_URL) {
  // Use Replit domain if available, otherwise localhost
  const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
  if (replitDomain) {
    process.env.NEXTAUTH_URL = `https://${replitDomain}`;
  } else {
    process.env.NEXTAUTH_URL = "https://771ca17c-b5c4-45b1-9da6-e251ac4b9e9e-00-21v72j2xwgq2z.pike.replit.dev";
  }
}

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  nextAuthUrl: process.env.NEXTAUTH_URL,
};
