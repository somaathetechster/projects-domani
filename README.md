# Domani Projects — projects.domanimedia.com

Enterprise client delivery platform. Every Domani project gets a workspace;
each workspace is only reachable by its 3–4 whitelisted client emails.

## Auth flow (built — see /app/api/auth)
Email (whitelisted per project, hardcoded via `project_members`)
→ OTP sent (`send-otp`)
→ OTP verified (`verify-otp`)
  → first login: forced password + authenticator app setup (`set-password` → QR code → `verify-totp`)
  → returning login: password check, then TOTP check (`verify-totp`), then session issued
→ session cookie scoped to that project only — a session for Infinitswap cannot read Nutrition Bay's data.

No open signup exists anywhere in this system. If an email isn't in `project_members`
for that project, the API returns a generic "if authorized, a code was sent" response —
it never confirms or denies which emails are valid, so the whitelist can't be enumerated.

## Data model (built — see /db/schema.sql)
clients → projects → project_members (whitelist) → sessions
                    → modules, issues, issue_comments, feature_requests
                    → documents, signatures, decisions, weekly_updates
                    → notification_preferences

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres + Storage)
Resend (OTP + notification email) · otplib (TOTP) · Framer Motion for the 3D-adjacent intro

## Build phases

**Phase 1 — Foundation (this drop)**
- [x] Schema
- [x] OTP + password + authenticator auth flow
- [ ] Session middleware (attach to every /app/(workspace) route, scoped per project)

**Phase 2 — Core workspace**
- [ ] Project overview dashboard (progress, phase, ETA)
- [ ] Issues (create/comment/status, file attachments via Supabase Storage)
- [ ] Documents (upload/download, status tracking)
- [ ] Electronic signatures (click-accept + typed name, IP + timestamp logged)

**Phase 3 — Depth**
- [ ] Feature request workflow
- [ ] Decision log
- [ ] Weekly updates (staff-posted, client-visible)
- [ ] Notification preferences → Resend triggers

**Phase 4 — AI Assistant**
- [ ] Ingest project documents + issues + decisions into a per-project knowledge base
- [ ] Chat endpoint scoped strictly to that project's own data (never cross-project)
- [ ] "Summarize this week" / "what's blocking deployment" style queries

**Phase 5 — Brand + intro**
- [ ] Port the domanimedia.com 3D intro sequence into projects.domanimedia.com's landing/auth screen
- [ ] Rebuild domanimedia.com as the calm marketing site once projects.domanimedia.com is live
- [ ] "Domani = tomorrow" thread through copy, motion pacing, and the transition from intro → workspace

## Not yet built (be aware before you tell a client this exists)
Everything past Phase 1 is schema + plan, not code. Say so if anyone asks for a demo.
