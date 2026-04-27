# Gamify — Vercel + Supabase Deployment

## Stack
- Frontend: React + Vite → Vercel
- Backend: Supabase Edge Functions (TypeScript)
- Database: Supabase Postgres

## Deploy order
1. Supabase → run schema.sql
2. Supabase → deploy Edge Function
3. Vercel → deploy frontend with VITE_API_URL set

See DEPLOYMENT_GUIDE.md for full step-by-step.
