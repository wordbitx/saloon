# Missed Booking Recovery by WordbitX

A Phase 1 salon product **demo**, with a public sample and a separate, signed-in salon workspace. An owner can opt in to a separate public appointment-request link and publish salon products; the existing marketing simulator is still illustrative. Product orders are manual requests, not paid transactions. WhatsApp, calls and payments are not connected: inbox entries, automated recovery, legacy waitlist offers and review requests are simulations. Manual WhatsApp links only open a chat after a user clicks them; they do not send a message automatically.

**This is not yet a production-ready customer-data system.** It has no MFA, durable security/audit log, backup/retention controls, distributed rate limiting or production-grade photo storage. Use fictional data until those controls and a security review are in place. The default installation is one organization: every Owner account can access **all salons** in that installation. It is not a multi-tenant SaaS isolation boundary between unrelated owners.

## Run locally

```bash
npm install
cp .env.example .env       # optional; leave DATABASE_URL blank for a temporary demo
npm run dev
```

Open `http://localhost:3000`. Development uses Webpack for more reliable Fast Refresh in the preview, and development chunks are not cached by the browser/proxy. If an existing browser tab was opened with the old Turbopack server, reload it once after switching servers. The public **Admin** button opens `/admin/login`. With no `ADMIN_EMAIL`/`ADMIN_PASSWORD` overrides in a local development run, the initial demo owner is:

| Field | Local development default |
| --- | --- |
| Email | `admin@glowsalon.pk` |
| Password | `GlowAdmin@2026` |

Change it via the account menu immediately. These values only seed the first active owner; environment overrides or an existing account/password take precedence. The login screen shows the default hint only in local development when neither credential is configured and that password is still active. It never displays a configured password. **Production does not seed a default password**: set a strong, unique `ADMIN_PASSWORD` (and `ADMIN_EMAIL`) before creating the first owner. If an owner already exists, changing environment values does not reset that account.

## Salon and branch management

1. Sign in as Owner → **Salon registry** → **New salon**. Enter its profile and add branches, staff and services; select **Save salon**. New salons start with empty bookings and waitlists, not copies of the sample salon.
2. In each staff profile, choose a branch or “All branches” and add an individual JPG, PNG or WebP photo. Images up to 8 MB are resized in the browser before saving. The profile currently stores those resized data URLs in the workspace document (not a separate object-storage bucket). A profile is limited to about 2.5 MB total; this is a prototype, not a scalable media pipeline.
3. As Owner, click the **salon identity card** (salon name and city) at the top of the sidebar to switch salons and branches from any dashboard section. Bookings, staff, customer summaries, waitlist, reports and CSV export follow that selection. “All branches” aggregates that salon only. The browser remembers the selected IDs. Manager and Reception logins cannot switch and receive only their assigned branch from the server. Use **Refresh data** to fetch changes made in another session; this demo is not real-time sync.
4. Edit and save profiles in **Salon registry**. Removing a branch and saving permanently removes that branch’s booking, waitlist and customer records; its staff become available to all branches until reassigned. Deleting a salon or a branch makes any logins assigned to it unable to access a workspace until an owner assigns a valid salon and branch. At least one salon must remain. Existing bookings retain their recorded price when a service price changes.
5. **Settings**, service edits and salon setup remain inside the signed-in panel. **Sign out** returns to the public home page. The public `/dashboard` is a separate in-browser demo; it never loads or modifies signed-in salon data.

### Book an available chair

Open **Bookings** or the chair schedule in **Overview**, choose the salon, branch and date, then click a light-grey **Available** slot (its border turns green on hover). The form opens with that chair, branch, date and time already selected; choose a service, enter the customer and save. The slot changes to booked only after the server accepts it. The first hero tile counts today's confirmed and completed appointments (not cancelled); click it to see the matching records.

Each booking appears once at its start, with a neutral **Busy · continues** marker in later hours. Multiple shorter appointments in the same hour each have a card. The server still checks the entire service duration, even across midnight and across branches for a shared staff member. New bookings snapshot the menu duration; older records fall back to the current duration (or 60 minutes if unavailable). Customers see a short salon-local reference such as `BK-0001` throughout the schedule, tables, search and CSV. References are allocated under the workspace lock and never reused after deletion; old UUID-based records receive a persisted short reference without changing their internal key.

### Holidays, off days and closing a slot

Open **Time off** above the schedule and select **Add time off**. An Owner can close the entire salon, one branch or one staff member across branches. A Manager or Reception login can only create/reopen a closure for their assigned branch, including a staff closure limited to that branch; they cannot reopen salon-wide or other-branch closures. Choose an inclusive date range and either all-day or a same-day time range (a time range repeats on each selected date; 12:00 AM is the end of that day). Choose a reason and optional note. Overlapping closures must each be reopened.

A closure cannot be saved over an existing non-cancelled booking: reschedule or cancel it first. Closing and booking actions are serialized under the same server lock, and booking, rescheduling and waitlist confirmation all check closures. **Salon registry** controls weekly salon off days and each staff member's working days; an empty legacy staff-days list means no staff-specific weekly restriction. The schedule shows these days as closed. Changing weekly settings does not cancel existing bookings, so review and reschedule any appointments that now fall on an off day. Removing a branch or staff member also removes the corresponding branch or staff closures.

Use **Refresh availability** for changes from other sessions; this demo is not a real-time synchronization system. The timeline uses same-day opening/closing times (and falls back to 11 AM–9 PM for unsupported or invalid hours). Individual shift hours are not yet modeled. The form warns if a service extends outside configured opening hours, but the owner can still save it; confirm working hours manually.

The fictional seed salon and public sample data are marked as such. Booking edits and status actions are persisted only in the signed-in workspace as described below. The public dashboard and simulator retain separate temporary demo state.

## Customers

**Customers → Add customer** creates a name, optional phone and notes for a selected branch. Open a profile to **Edit customer** or **Delete customer**. These actions are available and authorized only for Owners; Manager and Reception may view their own branch's directory. Existing guests are also derived from booking history, so Owners can edit or remove those profiles too. Matching is by normalized name within a branch because older appointments have no customer ID; people with the same name in one branch cannot be reliably distinguished, so review before editing.

Deleting a directory record deliberately **does not delete or anonymize its existing bookings**, which still contain the original name and phone. When bookings exist, the directory keeps an exclusion so the old booking does not recreate the deleted profile; explicitly adding the same name again restores it. A manually added customer with no bookings leaves no name exclusion. Name edits retain old names as aliases to link older bookings. This is not a complete data-erasure or privacy-retention workflow.

## Website appointment requests

The homepage's phone conversation and simulator remain a sample: they do not send bookings. To try the separately implemented request flow, sign in as Owner, select a salon, open **Waitlist → Enable booking link**, then **Copy link** and share/embed the `/book/<salon-id>` link on that salon's website. The link is disabled by default and can be disabled again; it exposes only that salon's public branch/service menu. Nothing is automatically added to an external website. The public form asks for a name, phone, branch, service, preferred date/time and permission to contact.

Submissions arrive as **Website request · waiting** in the selected branch's Waitlist, not as confirmed bookings and not as reserved time slots. Staff should contact the customer manually, choose **Review & confirm**, select a staff member and verify the appointment time. Only a successful confirmation creates a booking and marks the request booked. The server rechecks current availability under the same lock; a conflicting request remains pending. Staff may also decline a request. No WhatsApp, SMS, email, or other notification is sent automatically for a request, confirmation or decline; staff must inform the customer themselves. Refresh data to see new submissions; there are no real-time notifications.

This public intake is a prototype and is not production-ready: it has only a best-effort in-process throttle (not shared across instances and not reliable against spoofed forwarded headers), no CAPTCHA/WAF, retention policy, verification or durable notification system. Configure real storage, strong access/security controls, rate limiting, a privacy notice and appropriate customer consent before any real-world use. Do not use process-memory storage for real customer requests.

## Products and website order requests

The public homepage has a **Salon edit** section immediately below the hero, and **Shop** opens `/products`. These pages show published products from the salons in this installation; a card identifies the salon and city. The fictional sample salon starts with 12 unbranded example products across hair, skin, makeup and nail care. Their images, sizes and prices are illustrative, not actual inventory: sample orders are demos, and visitors should use fictional contact details. An older sample salon without a product field receives these examples once; an existing catalog (including an intentionally empty one) and all non-sample salons are never overwritten or automatically populated. Owners can edit, unpublish or delete the examples. The homepage's other booking/simulator content remains sample data. The editorial shop photograph is decorative, not a product listing.

As Owner, select a salon and open **Products & orders**. Add a product name, category, whole-rupee price, optional description and optional JPG/PNG/WebP photo (up to 8 MB before browser resizing). **Publish on website** controls whether it appears publicly; uncheck it for a private draft, or use Publish/Unpublish later. Edit or delete products there. A salon can have up to 40 products; its resized product photos are stored inline in the workspace document (2 MB total), not in a scalable media service. A deleted product is removed from the catalog, but existing orders retain the original product name and price. Deleting a salon permanently deletes its products and orders too.

For a real salon's catalog, a customer selects one product and quantity (1–20), enters contact and delivery details, and consents to manual contact. For the sample salon, use fictional details and acknowledge that the request is only a demo. The request is saved as **pending** in that product's salon under **Products & orders → Orders**; it is not a payment, confirmed sale, stock reservation or delivery booking. The server snapshots the current price and rejects stale product versions; a repeated submission with the same random request key is idempotent while that order record is retained. The Owner manually contacts the customer, confirms availability, shipping charges and payment, and can mark an order **confirmed**, **fulfilled**, or **cancelled**. Fulfilled/cancelled records can be deleted. The prototype caps each salon at 1,000 retained orders, including at most 500 pending requests. No customer notification, payment processing, inventory tracking or courier integration is implemented. Use **Refresh orders** to see requests from another session; there is no real-time notification. Pending counts cover all salons, while order details are shown for the selected salon. Products and orders are salon-wide; the dashboard branch filter does not apply to them. Only Owners can manage products or read orders; Manager/Reception workspace responses omit them entirely.

The public shop/order flow is a **prototype**, not ready for real customer data. Public requests use only a best-effort process-local rate limit and a honeypot; forwarded headers can be spoofed and limits are not shared between instances. Before real use configure durable storage and backups, privacy/retention and consent policies, a trusted WAF/distributed rate limiter, proper media storage, access auditing, verified contact and secure operational procedures. The public sample `/dashboard` cannot publish products or receive orders; sign in to the owner workspace instead.

## Team access

Owner → **Team access** → **Naya login** creates a separate Manager or Reception email/password and requires both a salon and **one specific branch**. Each receives only that branch's dashboard, bookings, waitlist, customer records and branch-assigned/shared staff. Switching salons or branches is Owner-only. Shared stylists' other-branch appointments are returned solely as anonymized busy intervals, so overlapping bookings are prevented without exposing the other branch's customer or appointment details. Additional Owners have full access across the installation, including staff logins; only grant that role to trusted people.

| Action | Owner | Manager | Reception |
| --- | --- | --- | --- |
| View dashboards, bookings and customer directory | All salons / branches | Assigned branch | Assigned branch |
| Add bookings, change status and review waitlist | ✅ | Assigned branch | Assigned branch |
| Close/reopen time | Salon, branch or staff | Assigned branch only | Assigned branch only |
| Edit bookings / see reports and CSV | ✅ | Assigned branch | ❌ |
| Add, edit or delete customer records | ✅ | ❌ | ❌ |
| Manage products and view/update salon-wide orders | ✅ | ❌ | ❌ |
| Delete a booking; manage salons, services and logins | ✅ | ❌ | ❌ |

The owner can edit role/salon/branch assignment, reset a password, disable or delete a login. Current permissions and assignment are re-read server-side for every managed request, and writes recheck them while holding the workspace lock. Existing unassigned Manager/Reception accounts fail closed until an owner assigns **both** a valid salon and branch; removing the assigned branch has the same effect. The last active owner cannot be demoted, disabled or deleted. Each user can change their own password; there is no public password-reset email flow.

## Storage and configuration

- With a working `DATABASE_URL`, staff accounts and salon workspaces are stored in Postgres. The app creates `public.staff_accounts` and `public.wbx_salon_workspaces` on first use, enables RLS on both and uses server-side session, role, salon and branch checks. The connection must have permission to create/alter these tables and read/write them as their owner or another role permitted to bypass the no-policy RLS. The workspace table stores one JSON document per salon; edits/actions acquire a row lock to avoid concurrent booking overwrites. Configure database backups separately.
- With **no** database URL, accounts, salons, bookings, products, orders and photos are stored in temporary **process memory**. They are lost on restart/redeploy and are not shared between serverless instances. The panel warns about this. Do not use this mode for real data or reliable staff access.
- If a database URL is configured but unreachable, authentication fails closed rather than silently falling back to temporary storage.
- Set a long random `AUTH_SECRET` (`openssl rand -base64 48`) for stable sessions across instances and restarts. Without it, a random process-local key is used and sessions can be invalidated across instances/restarts. Cookies are HTTP-only, SameSite=Lax and secure in production.
- The separate Drizzle/Supabase example tables and `supabase/migrations/0001_tenant_rls.sql` are not the managed workspace store. The old `/api/salons/[salonId]/bookings` route remains closed; do not assume that example migration provides production authorization for this demo.

Configure at minimum `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` on a deployed instance. Keep database and server secrets out of `NEXT_PUBLIC_` variables. Existing owner passwords can be changed in the panel; do not publish credentials on the login page.

## UI and demo

- The homepage follows the dark navy/green reference and includes a responsive, animated **sample** phone conversation with pause/replay and reduced-motion support.
- Light, Dark and System themes persist locally. The dashboard sidebar opens as a closable side drawer on small screens and collapses on desktop.
- Overview cards, chair timeline, staff workload and booking details use the selected salon/branch data. The inbox and activity log remain explicitly simulated previews, not real message delivery or an audit trail.
- Public enquiry actions prepare an email draft in the visitor's email app. No enquiry is submitted automatically.
- Static demo photography is in `public/images/`. User-uploaded staff/salon photos are stored as resized workspace data, separate from those files.

## Checks

```bash
npm run lint
npm run typecheck
npm run test:schedule
npm run test:sample-products
npm run build
# In another terminal, with the local dev server running:
npm run test:workspace
```

The integration test uses unique fictional salons and staff accounts, exercises salon/branch isolation, role permissions, customer CRUD, public appointment and product-order requests, catalog privacy, idempotency, price snapshots, booking conflicts, closures, references, branch edits and revocation, and deletes its test records. It only accepts a localhost server; use `TEST_BASE_URL`, `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` to point it at a different **local** server or owner account.

## Phase 2: official WhatsApp

`src/lib/whatsapp-cloud.ts` and `/api/meta/webhook` are disabled stubs. Before activation: complete Meta Business verification, obtain template approvals, configure server-only Cloud API/webhook secrets, and implement tenant mapping, opt-in/consent, retention, delivery handling and escalation. No unofficial personal-number automation, bulk/cold messaging or unsupported Meta partnership claims are included.
