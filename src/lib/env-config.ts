// Default environment configuration for zero-setup deployment
// These values are used if environment variables are not set or are empty strings

// This module exposes configuration values read from environment variables.
// Do NOT keep secrets or provider-specific fallback URLs checked into the repository.
// Set the following environment variables in your deployment or local .env:
// - DATABASE_URL
// - NEXTAUTH_URL
// - NEXTAUTH_SECRET

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "",
  nextAuthUrl: process.env.NEXTAUTH_URL ?? "",
};
