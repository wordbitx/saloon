# Missed Booking Recovery by WordbitX

A Phase 1 **sellable demo** for **salons in Lahore, Pakistan**. The workspace is intentionally labelled **SAMPLE DATA** throughout. It does not connect to WhatsApp, send messages, process payments, or claim live results.

## Included files

```text
src/app/page.tsx                                  Public product home
src/app/admin/login/page.tsx                      Supabase sign-in + labelled demo-role entry
src/app/admin/page.tsx                            Role-aware admin workspace preview
src/app/dashboard/page.tsx                        Owner recovery dashboard
src/app/simulator/page.tsx                        iPhone-style conversation simulator
src/app/pricing/page.tsx                          Pricing and Meta API roadmap
src/app/settings/page.tsx                         Editable salon profile and services
src/app/security/page.tsx                         Tenant isolation acceptance lab
src/components/admin/admin-workspace.tsx           Admin sections, bookings, inbox, reports
src/components/views/dashboard-view.tsx             Owner dashboard and waitlist controls
src/components/navbar.tsx                         Compact nav with working light/dark/system menu
src/components/site-chrome.tsx                     Public vs admin shell (no duplicate chrome)
src/context/salon-context.tsx                       Demo state, theme, bookings and waitlist actions
src/lib/supabase-browser.ts                        Optional Supabase Auth browser client
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
- Admin preview at `/admin/login` offers Owner, Manager and Reception roles. `/admin` provides Overview, Bookings, Recovery inbox, Customers, Waitlist, Services, Staff & branches, Reports, Settings and Activity Log sections.
- Booking entry and status actions update the shared in-browser sample state. A waitlist slot is only converted to a booking after the separate sample acceptance action.
- Editable salon profile and service menu update the shared demo state.
- Clear SAMPLE DATA labels remain visible; no demo action sends a real WhatsApp message.
- Drizzle models include `salon_id` on tenant-owned records. The supplied RLS migration and closed Phase 1 tenant API are documented separately below.

## What is deliberately a stub

- **Official WhatsApp Cloud API:** `src/lib/whatsapp-cloud.ts` has the official template-message request structure, but makes no request until `WHATSAPP_CLOUD_API_ENABLED=true` is explicitly set after approval.
- **Webhook:** `/api/meta/webhook` verifies the Meta challenge only with a configured verification token. Before activation, POSTs are acknowledged as `phase_2_stub` without parsing, logging, storing, or echoing message content. When enabled, it verifies `X-Hub-Signature-256` and still has no event persistence until the owner event policy is decided.
- **Admin demo session:** choosing Owner / Manager / Reception stores a local browser-only preview session. It is explicitly not authentication or a security boundary and only exposes sample records.
- **Real Supabase Auth:** `/admin/login` calls `signInWithPassword` when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured. The admin route verifies the user with Supabase and requires a trusted `app_metadata.role` of `owner`, `manager`, or `reception`. TODO (owner decision): provision role metadata and deploy server-side, RLS-backed owner data APIs before real salon records are used.
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

   `DATABASE_URL` is required by `/api/health`. The Phase 1 page itself is designed to render without any WhatsApp or Supabase public values.

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Supabase owner setup

1. Create a Supabase project in the desired region and add its Postgres connection string as `DATABASE_URL`.
2. Apply the Drizzle schema to that database:

   ```bash
   npx drizzle-kit push
   ```

3. Run `supabase/migrations/0001_tenant_rls.sql` in the Supabase SQL editor **after** the tables exist.
4. Enable Supabase email/password Auth and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the login form. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; never add it to client code.
5. Assign `app_metadata.role` from a trusted server/admin workflow (`owner`, `manager`, or `reception`). The client rejects accounts without one of these trusted role values.
6. TODO (owner decision): define owner/team invitation, password reset, MFA and salon membership bootstrap processes. `salon_users` is intentionally not self-writable by a public user policy.
7. Before enabling tenant data APIs, verify with two test users that Salon B sees 0 Salon A booking rows and receives `0` rows or `403` for a direct Salon A request.

## Admin panel login

- Open `/admin/login`.
- **Sample preview:** choose Owner, Manager, or Reception and select “Open … demo”. This writes a browser-local preview marker only; it is not a password login or security boundary.
- **Real Supabase login:** configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, enable Supabase email/password Auth, create/invite the user, and assign the trusted `app_metadata.role` as `owner`, `manager`, or `reception` through a trusted admin/server process. The page uses `signInWithPassword`; the admin route verifies the user with Supabase `getUser()` and rejects missing/unknown roles.
- TODO (owner decision): configure password recovery, MFA, team invitations, server-side role policy and RLS-backed admin data endpoints before using any real salon records. The admin workspace currently operates on labelled sample data even when Auth is configured.

## Vercel owner setup

1. Import this repository into Vercel.
2. Add all required environment values from `.env.example`; do not expose non-`NEXT_PUBLIC_` variables to the client.
3. Set the production domain and deploy.
4. **Public deployment URL: TODO (owner decision).** No Vercel account, domain, or deploy token was provided to create a truthful public link from this build environment.

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
- `@supabase/supabase-js` supports optional Supabase email/password sign-in when the owner configures project URL and public key; it does not provide the demo session with real authentication.

No fake testimonials, client counts, results, reviews, real salon contact data, checkout, spam features, unofficial WhatsApp automation, or Meta partnership claims were added.
