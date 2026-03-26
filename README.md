# 2035VC

Community platform for founders — storytelling events, applications, and AI-powered matching.

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Supabase Edge Functions (Deno)
- **Database:** Supabase (Postgres)
- **Hosting:** Cloudflare Pages
- **APIs:** OpenAI, Exa, GitHub

## Local dev

```bash
npm install
npm run dev        # http://localhost:5173
```

## Environment variables

Create a `.env` file:

```
VITE_SUPABASE_URL=<your supabase url>
VITE_SUPABASE_ANON_KEY=<your anon key>
VITE_ADMIN_PASSWORD=<admin password for local dev>
VITE_ADMIN_EMAIL=<admin email for local dev>
```

Supabase Edge Functions need these secrets (set via `supabase secrets set`):

```
OPENAI_API_KEY
EXA_API_KEY
GITHUB_TOKEN
ADMIN_PASSWORD
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Deploy

```bash
npm run build      # outputs to dist/
```

Cloudflare Pages auto-deploys from `main`.

## Key routes

| Route | Description |
|---|---|
| `/` | Community landing page |
| `/apply` | Organizer application (LinkedIn / AI profile / both) |
| `/storyteller` | Speaker signup |
| `/admin` | Admin dashboard (password-gated) |
| `/admin/applications` | Review organizer applications |
| `/:city/:date` | Event landing page |
