# Kairo Scholar

A modern public free study guide web app with Kairo Scholar branding and a cyber-blue secure workspace design for `astute-hoop-vision-pro.com`. Anyone can upload TXT, PDF, or DOCX notes, paste notes directly, generate study guides, flashcards, quizzes, important terms, simplified explanations, and export a PDF.

## Features

- React + Tailwind CSS responsive interface
- Dark mode with app-like mobile layout
- TXT, PDF, and DOCX upload support
- Paste-notes workflow
- Serverless generation endpoint in `api/generate.js`
- Cloudflare Pages Function endpoint in `functions/api/generate.js`
- Free Study Mode enabled by default with no paid AI calls
- PDF export with `jspdf`
- Local browser storage for previous study sessions
- Study timer and progress tracker
- PWA-ready manifest and icon
- Structured so it can later move toward Capacitor/Expo-style mobile packaging
- Kairo Scholar login/register screen for separate learner workspaces
- Cyber-blue interface inspired by the provided Kairo Scholar visual direction

## Project Structure

```text
study-guide-ai/
  api/generate.js              Serverless AI route for Vercel
  functions/api/generate.js    Cloudflare Pages Function route
  public/                      PWA manifest and icon
  src/App.jsx                  Main product UI and workflow
  src/lib/                     AI fallback, file readers, PDF export, local storage
  src/styles/index.css         Tailwind entry and mobile touch helpers
```

## Local Setup

Install Node.js 20 or newer, then run:

```powershell
cd study-guide-ai
npm install
copy .env.example .env.local
npm run dev
```

If PowerShell says `npm : The term 'npm' is not recognized`, install the official Node.js LTS version from `https://nodejs.org/`, close PowerShell completely, open a new PowerShell window, then run:

```powershell
node --version
npm --version
```

Both commands should print version numbers before `npm install` will work.

Free Study Mode is the default. You do not need an OpenAI key for students to use the app:

```text
KAIRO_ENABLE_PAID_AI=false
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Only set `KAIRO_ENABLE_PAID_AI=true` later if you intentionally want to pay for stronger hosted AI output.

## Public Launch Notes

This version is built so anyone can visit the deployed site, create a Kairo Scholar workspace, and use it.

- The included username/password flow is a prototype that separates local users on one device.
- Saved study sessions are stored per username in that visitor's browser.
- Notes are sent to the backend only when a visitor clicks Generate Study Guide.
- Paid AI is disabled by default, so public student usage does not create an OpenAI bill.
- If paid AI is enabled later, the OpenAI API key stays on the backend and is never exposed to the browser.
- For a real public launch, replace browser-only auth with hosted auth such as Supabase, Clerk, Auth0, or Firebase Auth.
- Add rate limiting, abuse protection, and usage monitoring before turning on paid AI.
- If cloud sync, classrooms, or shared study guides are added later, replace `localStorage` with a database-backed session model.

## Deploy To Vercel

1. Push this `study-guide-ai` folder to a GitHub repository.
2. In Vercel, create a new project and select the repository.
3. Set the project root to `study-guide-ai` if the repo contains other files.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Keep `KAIRO_ENABLE_PAID_AI=false` so the public version stays free to run.
7. Deploy.

## Connect Custom Domain

After the Vercel deployment succeeds:

1. Open the Vercel project dashboard.
2. Go to Settings -> Domains.
3. Add `astute-hoop-vision-pro.com`.
4. Follow Vercel's DNS instructions at your domain registrar.
5. Usually this means adding an `A` record for the apex domain and a `CNAME` for `www`.
6. Wait for DNS propagation and SSL provisioning.

## Deploy To Cloudflare Pages

1. Push this `study-guide-ai` folder to a GitHub repository.
2. In Cloudflare Pages, create a project from that repository.
3. Build command: `npm run build`.
4. Build output directory: `dist`.
5. Keep `KAIRO_ENABLE_PAID_AI=false` so the public version stays free to run.
6. The Cloudflare Pages Function at `functions/api/generate.js` handles `/api/generate`.
7. Add `astute-hoop-vision-pro.com` under Custom domains and follow Cloudflare DNS prompts.

## Mobile App Path

The app is intentionally componentized and PWA-ready. Good next steps for a phone app are:

1. Add offline service worker caching.
2. Add Capacitor and wrap the built web app.
3. Replace localStorage with a shared storage abstraction if syncing accounts are added.
4. Keep AI calls on a backend endpoint so mobile builds never expose API keys.

