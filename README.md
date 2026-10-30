# Missed Booking Recovery by WordbitX

A Phase 1 **sellable demo** for **salons in Lahore, Pakistan**. The workspace is intentionally labelled **SAMPLE DATA** throughout. It does not connect to WhatsApp, send messages, process payments, or claim live results.

## Included files

```text
src/app/page.tsx                                  Public product home
src/app/admin/login/page.tsx                      Staff sign-in (email + password)
src/app/admin/page.tsx                            Server-gated admin workspace, role-aware
src/app/simulator/page.tsx                        iPhone-style conversation simulator
src/app/pricing/page.tsx                          Pricing and Meta API roadmap
src/app/settings/page.tsx                         Editable salon profile and services
src/app/security/page.tsx                         Tenant isolation acceptance lab
src/app/api/auth/login|logout|session|password     Session cookie, sign-in and password APIs
src/app/api/team/route.ts                          Owner-only staff login list + create
src/app/api/team/[id]/route.ts                     Owner-only edit / disable / reset / delete
src/components/admin/admin-workspace.tsx           Admin sections, bookings, inbox, reports
src/components/admin/admin-login-form.tsx           Sign-in screen + default-owner hint
src/components/admin/team-access.tsx                Manager / reception login manager
src/components/admin/account-menu.tsx               Account menu + own password change
src/context/auth-context.tsx                        Signed-in user, capabilities, sign out
src/lib/auth/roles.ts                               Roles + capability matrix (shared)
src/lib/auth/session.ts                             HMAC-signed httpOnly session cookie
src/lib/auth/store.ts                               Staff accounts (Postgres, or memory fallback)
src/lib/auth/password.ts                            scrypt hashing + password rules
src/lib/auth/api.ts                                 Server guard for admin APIs
src/db/schema.ts                                  Drizzle tenant-scoped operational tables
supabase/migrations/0001_tenant_rls.sql           Supabase RLS policies
src/lib/whatsapp-cloud.ts                         Disabled Phase 2 Cloud API sender structure
src/app/api/meta/webhook/route.ts                 Disabled Phase 2 webhook structure
src/app/api/salons/[salonId]/bookings/route.ts    Closed unauthenticated tenant API (403)
.env.example                                      Required environment variable names
```

## What works in Phase 1

- Light, Dark, and System theme menu. Theme choice applies immediately, persists in `localStorage`, and follows live device changes in System mode.
- Public product navigation is concise; admin routes use a separate shell so the public header/footer are not repeated inside the admin panel.
- **Owner dashboard (`/dashboard`)** is a salon-flavoured sidebar workspace with Overview, Bookings, Recovery inbox, Customers, Waitlist, Services & prices, Staff & branches, Reports, Settings and Activity log. The Overview opens with a plain-language summary ("Aaj kitni booking bachi"), a salon floor chair timeline (kaunsi kursi kab khali hai), stylist workload bars, a service-category mix, today's chair list, a recovery inbox preview, and quick actions including walk-in booking. A dashboard guide explains what each sidebar option does.
- **Simulator (`/simulator`)** uses a standard iPhone-style WhatsApp frame (no 360° mode) that switches between light and dark WhatsApp appearance with the site theme.
- **Duplicate booking guard:** a stylist can only hold one chair at one time. Booked slots in the chair timeline and the admin booking form are detected, the UI shows "Already booked", offers free alternative slots, and tells the owner to contact the client on WhatsApp. `addBooking` rejects conflicting slots.
- **Salon registry (admin → Salon registry):** register a new salon or branch with full details (owner, phone, WhatsApp, email, area, address, timings, off-days, review link), branches, staff, services with prices, and image uploads (logo, interior, team, service work). Images are preview-only in this browser session; production uploads need a Supabase Storage bucket and signed URLs (TODO: owner decision).
- **Category cards (Overview):** Hair & colour, Skin & facial, Bridal & glam, Nails & spa — har card aaj ki bookings count aur PKR revenue auto-calculate karta hai. Click karne par us category ki live booking list khulti hai.
- **Live drill-downs:** hero headline, stat tiles, KPI cards, salon menu services, stylist names aur aaj ke clients — sab clickable hain aur sirf sample booking data se calculate hote hain.
- **Booking table (shared):** Booking ID, client + WhatsApp number (click = manual wa.me chat), service, stylist, date & time, channel/source, amount, status, aur actions: Complete, Cancel, Edit, Delete.
- **Edit booking:** naam, number, service, stylist, date/time, channel, status aur custom price. Slot clash ho to save block hota hai. Custom price ka badge dikhta hai.
- **WhatsApp links:** sirf owner ke click par `wa.me` chat khulti hai, pre-filled text ke saath. Koi message automatically send nahi hota; bulk ya cold messaging nahi hai.
- **Sample phone numbers** fictional 0000-series hain (e.g. `+92 300 0000010`), kisi real client ke nahi.
- **Home page** includes a salon gallery (sample imagery for the fictional Glow Salon demo) with interior, stylist, bridal and facial-treatment visuals.
- **Real staff logins:** `/admin/login` signs in with an email + password. Sessions are stored in an HMAC-signed httpOnly cookie; `/admin` is gated on the server and re-checks the account on every request, so a disabled login or a changed role applies on the next page load.
- **Owner / Manager / Reception roles:** each role sees only its own sidebar sections and action buttons (capability matrix in `src/lib/auth/roles.ts`). Reception cannot delete bookings or open reports/settings; Manager cannot delete bookings or manage logins; only Owner can manage staff logins.
- **Team access (owner only):** create a manager or reception login, edit name/email/role, reset a password, disable access, or delete the login. The last active owner can never be demoted, disabled or deleted. Every staff member can change their own password from the account menu.
- Booking entry and status actions update the shared in-browser sample state. A waitlist slot is only converted to a booking after the separate sample acceptance action.
- Editable salon profile and service menu update the shared demo state.
- Clear SAMPLE DATA labels remain visible; no demo action sends a real WhatsApp message.
- Drizzle models include `salon_id` on tenant-owned records. The supplied RLS migration and closed Phase 1 tenant API are documented separately below.

## What is deliberately a stub

- **Official WhatsApp Cloud API:** `src/lib/whatsapp-cloud.ts` has the official template-message request structure, but makes no request until `WHATSAPP_CLOUD_API_ENABLED=true` is explicitly set after approval.
- **Webhook:** `/api/meta/webhook` verifies the Meta challenge only with a configured verification token. Before activation, POSTs are acknowledged as `phase_2_stub` without parsing, logging, storing, or echoing message content. When enabled, it verifies `X-Hub-Signature-256` and still has no event persistence until the owner event policy is decided.
- **Real staff login:** implemented with the Postgres/Supabase database connection (`DATABASE_URL`). The `staff_accounts` table is created automatically on first use and seeded with one owner from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Without `DATABASE_URL` the app falls back to a temporary in-memory store (clearly flagged in the UI) so the deployed demo still works.
- **Not yet implemented (owner decisions):** "forgot password" email delivery, MFA, and server-side data queries scoped by RLS for real salon records. Staff logins are real, but the booking records in the workspace are still labelled sample data in this browser session.
- **Authenticated data APIs:** tenant bookings endpoint remains closed with `403` until server-side Supabase session verification and RLS-scoped queries are configured.
- **Instagram DM:** TODO (owner decision), after the initial salon rollout.
- **Subah ki brief delivery channel/time:** TODO (owner decision), shown only as a sample preview.

## Local run

1. Install packages:

   ```bash
   npm install
   ```

2. Copy and fill the environment template:

   ```bash
   cp .env.example .env
   ```

   `DATABASE_URL` is required by `/api/health` and by the staff-login store (without it logins fall back to temporary memory storage). Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the first owner account.

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Staff logins (admin panel)

Open `/admin/login`.

**Default owner login** (seeded on first run, shown on the login screen until the password is changed):

| Field | Value |
| --- | --- |
| Email | `ADMIN_EMAIL`, default `admin@glowsalon.pk` |
| Password | `ADMIN_PASSWORD`, default `GlowAdmin@2026` |

Change it right away from the avatar menu → *“Apna password change karein”*. Once the default password no longer matches, the hint disappears from the login screen.

### Owner: giving manager / reception access

1. Sign in as owner → sidebar → **Team access**.
2. **Naya login** → staff name, login email, role (Manager / Reception / Owner) and a password (use *Generate* + *Copy*).
3. Hand those credentials to the staff member. They sign in at `/admin/login` and see only their role’s sections.

| Action | Owner | Manager | Reception |
| --- | --- | --- | --- |
| Dashboard, bookings, status changes, inbox, waitlist | ✅ | ✅ | ✅ |
| Edit a booking | ✅ | ✅ | ❌ |
| Delete a booking | ✅ | ❌ | ❌ |
| Reports / CSV export | ✅ | ✅ | ❌ |
| Salon setup / services / salon registry | ✅ | ❌ | ❌ |
| Create, edit, disable, reset, delete staff logins | ✅ | ❌ | ❌ |

Safeguards: the last active owner cannot be demoted, disabled or deleted; nobody can delete or disable their own login; passwords need 8+ characters with a letter and a number; sign-in is rate-limited per email + IP; every admin API re-checks the session and capability on the server.

Password recovery is owner-driven on purpose: the owner resets a staff password in **Team access → Password**. There is no public “forgot password” email flow yet (owner decision).

### Storage for staff accounts

- **Recommended:** set `DATABASE_URL` to the Supabase Postgres connection string (Project settings → Database → Connection string). The `staff_accounts` table is created automatically on first use and the first owner is seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` — no manual SQL needed.
- **Without `DATABASE_URL`:** logins are kept in a temporary in-memory store so the deployed demo still works. Staff accounts then disappear on redeploy/restart, and the workspace shows an amber warning saying so.

Set `AUTH_SECRET` (`openssl rand -base64 48`) to a fixed value so session cookies stay valid across deploys; otherwise a deployment-derived secret is used.

## Salon images

The dashboard hero and the four category cards use static files:

```text
public/images/salon-interior-hero.jpg
public/images/salon-hair-stylist.jpg
public/images/salon-bridal-makeup.jpg
public/images/salon-facial-treatment.jpg
public/images/salon-nails-spa.jpg
```

They were missing before, which is why the cards showed empty gradients. Replace the files (same names) to use real salon photography.

## Supabase setup (database + RLS)

1. Create a Supabase project and copy the Postgres connection string into `DATABASE_URL` (Vercel → Project → Settings → Environment Variables).
2. Optional: apply the Drizzle schema for the operational tables:

   ```bash
   npx drizzle-kit push
   ```

3. Run `supabase/migrations/0001_tenant_rls.sql` in the Supabase SQL editor after the tables exist.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; it is not used by the staff login flow.
5. TODO (owner decision): password reset emails, MFA, and RLS-backed data endpoints before real salon records are stored.

## Vercel owner setup

1. Import this repository into Vercel.
2. Add the environment values from `.env.example` — minimum for real logins: `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Do not expose non-`NEXT_PUBLIC_` variables to the client.
3. Deploy, open `/admin/login`, and change the default password.
4. Add manager/reception logins from **Team access**.

## Meta / WhatsApp Phase 2 owner setup

1. Complete Meta Business verification and register the business phone number.
2. Create and receive approval for the required message templates.
3. Set `WHATSAPP_CLOUD_API_ENABLED=true` plus the Cloud API token, phone-number ID, webhook verification token, and app secret as server-side Vercel environment variables.
4. Point Meta’s webhook configuration to `https://YOUR_DOMAIN/api/meta/webhook` and verify it.
5. Complete the TODO owner decisions in the sender/webhook code: tenant mapping, opt-in/consent record, event retention, handling rules, and escalation rules.
6. Never enable personal-number automation, bulk/cold messaging, or any messaging outside Meta policy and customer consent.

## Outside this prompt

- `lucide-react` was added solely for clear, accessible interface icons.
- `@fontsource/inter` was added solely to locally bundle the requested Inter typeface.
- Staff authentication is implemented in-repo (scrypt password hashing, HMAC-signed httpOnly session cookie, capability checks) so no extra auth service is required — Supabase is used only as the Postgres database.

No fake testimonials, client counts, results, reviews, real salon contact data, checkout, spam features, unofficial WhatsApp automation, or Meta partnership claims were added.
