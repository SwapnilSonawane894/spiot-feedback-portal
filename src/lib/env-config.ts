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
  process.env.NEXTAUTH_URL = "https://ff8be4eb-87bd-42e4-b9ca-0e1844f9010b-00-iw02txcjz11a.pike.replit.dev";
}

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  nextAuthUrl: process.env.NEXTAUTH_URL,
};
