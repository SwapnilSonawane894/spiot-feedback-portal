# Deploying to Vercel — step by step

This project is a Next.js application using Prisma and Postgres. Below are the exact steps I recommend to deploy it to Vercel and connect your production database.

1) Prepare repository
- Push your code to GitHub (you mentioned you've already pushed). Ensure `main` is the branch you want to deploy.

2) Create a Postgres production database
- You can use Supabase, Neon, Render, DigitalOcean Managed DB, or any Postgres provider.
- Copy the DATABASE_URL connection string (postgres://...)

3) Configure environment variables on Vercel
- In your Vercel project settings -> Environment Variables, add at least:
  - DATABASE_URL = postgres://... (Production DB)
  - NEXTAUTH_URL = https://<your-vercel-domain>
  - NEXTAUTH_SECRET = a long random string
  - (Optional) Any OAuth client ids/secrets you use

4) Prisma setup on Vercel (migrations & generating client)
- Vercel will run `npm run build` which will require the Prisma Client to be generated.
- Add a `vercel-build` script in `package.json` if you need to run prisma generate or migrations during build. Example:

  "scripts": {
    "build": "next build --turbopack",
    "vercel-build": "prisma generate && next build --turbopack"
  }

- If you use Prisma Migrate to apply migrations in production, run migrations manually from CI or your local machine pointing at the production DB (recommended). Example (local):

  npx prisma migrate deploy --preview-feature

  or via GitHub Actions in a protected job that runs only on merged deploys.

5) Deploy on Vercel
- Go to https://vercel.com/new
- Import your GitHub repo and select the `main` branch.
- During the import, Vercel will ask for Environment Variables — add them there.
- Finish the import — Vercel will build and deploy.

6) Post-deploy checks
- Visit your production URL (https://<project>.vercel.app)
- If you use NextAuth, sign in and ensure callbacks are correct.
- Ensure your application can connect to the DB and Prisma Client is generated.

7) Recommended extras
- Add a GitHub Action to run `npx prisma migrate deploy` automatically when you merge to main (careful: run only after DB is provisioned and you understand migrations).
- Use a read-only database user for runtime if you enforce stricter security models.

If you want, I can add the `vercel-build` script to your `package.json` and create a minimal GitHub Actions workflow that runs Prisma migrations (disabled by default). Tell me if you want me to proceed and whether you prefer migrations to run automatically on deploy or manually.
