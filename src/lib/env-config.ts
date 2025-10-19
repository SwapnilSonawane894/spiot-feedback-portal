// Default environment configuration for zero-setup deployment
// These values are used if environment variables are not set or are empty strings

// Helper to get the correct database URL
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    return process.env.DATABASE_URL;
  }
  return process.env.DATABASE_URL_REPLIT || "postgres://8423ec093c3a53c0c27d1c9ec71a462f96dc55b5ad31d81e7ee82f9ec99098c9:sk_pngJjThsF8zs08sVXH4R-@db.prisma.io:5432/postgres?sslmode=require";
};

// Helper to get the correct NextAuth secret
const getNextAuthSecret = () => {
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.trim() !== "") {
    return process.env.NEXTAUTH_SECRET;
  }
  return "4M6PmUDdOTgSuDLaE1+9fAxJFnD0Jbxgklph8RqzheA=";
};

// Helper to get the correct NextAuth URL
const getNextAuthUrl = () => {
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim() !== "") {
    return process.env.NEXTAUTH_URL;
  }
  // Use Replit domain if available, otherwise fallback URL
  const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
  if (replitDomain) {
    return `https://${replitDomain}`;
  }
  return "https://771ca17c-b5c4-45b1-9da6-e251ac4b9e9e-00-21v72j2xwgq2z.pike.replit.dev";
};

// Set the environment variables
process.env.DATABASE_URL = getDatabaseUrl();
process.env.NEXTAUTH_SECRET = getNextAuthSecret();
process.env.NEXTAUTH_URL = getNextAuthUrl();

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  nextAuthUrl: process.env.NEXTAUTH_URL,
};
