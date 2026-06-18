# Our Journey

A gothic-romantic couples wishlist & memory keeper. Mobile-first, serverless, monochrome aesthetic.

**Stack:** Next.js 14 (App Router) · Tailwind CSS · Framer Motion · Supabase · lucide-react

---

## Features
- Sticky glassmorphism header with view toggle
- 3 tabs (Kino / Kita Berdua / Vara) with sliding underline
- Add / complete / delete wishlist items
- Collapsible memory section with textarea + photo/video upload (stored as data URL)
- Single-open accordion behavior
- 2-column gallery (grayscale → color on hover)
- Inline gothic SVG placeholder for items without media
- Effects: dust particles, heartbeat pulse, text shimmer, petal confetti, tab burst ripple, ring pulse, chevron rotate
- Supabase persistence (single source of truth, no localStorage cache)

---

## Local development
```bash
npm install
npm run dev
```
App runs on `http://localhost:3000`.

Environment variables are in `.env.local` (gitignored). See `.env.example` for the schema.

---

## Deploy to Vercel (free, no custom domain)

### 1. Create a GitHub repo
Create a new empty repository on GitHub (e.g. `our-journey`). **Don't** initialize with README/license/.gitignore.

### 2. Push the code
```bash
git init
git add .
git commit -m "Initial commit: Our Journey"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/our-journey.git
git push -u origin main
```

### 3. Import on Vercel
1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Click **Import** next to your `our-journey` repo.
3. **Before** clicking Deploy, expand the **Environment Variables** section and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://spwvpfgjbducumhiwhfb.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_QWt4lS6Kq9TxkC8q2s3f0A_jgYAmesr`
4. Click **Deploy**. Wait ~1 minute. You'll get a `*.vercel.app` URL.

### 4. Run Supabase setup (one-time)
1. Open your Supabase project dashboard.
2. Go to **SQL Editor** → **New query**.
3. Paste the contents of [`supabase/setup.sql`](./supabase/setup.sql) → click **Run**.
   - It's idempotent — safe to re-run.
   - Creates the `wishes` table with permissive RLS for personal use.

### 5. Done
Open the `*.vercel.app` URL. The initial seed data will be saved to Supabase on the first interaction. Open it on another device/browser — data syncs.

---

## Updating the deployment
Just push to `main`:
```bash
git add .
git commit -m "Update message"
git push
```
Vercel will auto-rebuild & deploy. No env-var changes needed (they persist per-project).

---

## Project structure
```
app/
  layout.tsx          # fonts + global styles
  page.tsx            # entire app
  globals.css         # Tailwind + vignette + scrollbar
components/
  Dust.tsx            # ambient particles
  Petals.tsx          # completion confetti
lib/
  types.ts            # TabId, WishItem, WishlistState
  storage.ts          # load/save (Supabase + localStorage fallback)
  supabase.ts         # Supabase client
supabase/
  setup.sql           # table + RLS policies
.env.example          # environment variable template
```
