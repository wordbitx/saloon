-- Missed Booking Recovery — tenant isolation for Supabase Postgres.
-- Run in the Supabase SQL editor or through the Supabase migration workflow.
-- Every operational table is scoped through salon_users.user_id = auth.uid().

alter table public.salons enable row level security;
alter table public.salons force row level security;
alter table public.salon_users enable row level security;
alter table public.salon_users force row level security;
alter table public.customers enable row level security;
alter table public.customers force row level security;
alter table public.services enable row level security;
alter table public.services force row level security;
alter table public.bookings enable row level security;
alter table public.bookings force row level security;
alter table public.missed_messages enable row level security;
alter table public.missed_messages force row level security;
alter table public.review_requests enable row level security;
alter table public.review_requests force row level security;
alter table public.waitlist_entries enable row level security;
alter table public.waitlist_entries force row level security;

create policy "members can read their salons" on public.salons
for select using (
  exists (
    select 1 from public.salon_users su
    where su.salon_id = salons.id and su.user_id = auth.uid()
  )
);

create policy "members can read their memberships" on public.salon_users
for select using (user_id = auth.uid());

create policy "members can read customers in their salon" on public.customers
for select using (
  exists (select 1 from public.salon_users su where su.salon_id = customers.salon_id and su.user_id = auth.uid())
);
create policy "members can create customers in their salon" on public.customers
for insert with check (
  exists (select 1 from public.salon_users su where su.salon_id = customers.salon_id and su.user_id = auth.uid())
);
create policy "members can update customers in their salon" on public.customers
for update using (
  exists (select 1 from public.salon_users su where su.salon_id = customers.salon_id and su.user_id = auth.uid())
) with check (
  exists (select 1 from public.salon_users su where su.salon_id = customers.salon_id and su.user_id = auth.uid())
);

create policy "members can read services in their salon" on public.services
for select using (
  exists (select 1 from public.salon_users su where su.salon_id = services.salon_id and su.user_id = auth.uid())
);
create policy "members can manage services in their salon" on public.services
for all using (
  exists (select 1 from public.salon_users su where su.salon_id = services.salon_id and su.user_id = auth.uid())
) with check (
  exists (select 1 from public.salon_users su where su.salon_id = services.salon_id and su.user_id = auth.uid())
);

create policy "members can read bookings in their salon" on public.bookings
for select using (
  exists (select 1 from public.salon_users su where su.salon_id = bookings.salon_id and su.user_id = auth.uid())
);
create policy "members can manage bookings in their salon" on public.bookings
for all using (
  exists (select 1 from public.salon_users su where su.salon_id = bookings.salon_id and su.user_id = auth.uid())
) with check (
  exists (select 1 from public.salon_users su where su.salon_id = bookings.salon_id and su.user_id = auth.uid())
);

create policy "members can read missed messages in their salon" on public.missed_messages
for select using (
  exists (select 1 from public.salon_users su where su.salon_id = missed_messages.salon_id and su.user_id = auth.uid())
);
create policy "members can manage missed messages in their salon" on public.missed_messages
for all using (
  exists (select 1 from public.salon_users su where su.salon_id = missed_messages.salon_id and su.user_id = auth.uid())
) with check (
  exists (select 1 from public.salon_users su where su.salon_id = missed_messages.salon_id and su.user_id = auth.uid())
);

create policy "members can read review requests in their salon" on public.review_requests
for select using (
  exists (select 1 from public.salon_users su where su.salon_id = review_requests.salon_id and su.user_id = auth.uid())
);
create policy "members can manage review requests in their salon" on public.review_requests
for all using (
  exists (select 1 from public.salon_users su where su.salon_id = review_requests.salon_id and su.user_id = auth.uid())
) with check (
  exists (select 1 from public.salon_users su where su.salon_id = review_requests.salon_id and su.user_id = auth.uid())
);

create policy "members can read waitlist entries in their salon" on public.waitlist_entries
for select using (
  exists (select 1 from public.salon_users su where su.salon_id = waitlist_entries.salon_id and su.user_id = auth.uid())
);
create policy "members can manage waitlist entries in their salon" on public.waitlist_entries
for all using (
  exists (select 1 from public.salon_users su where su.salon_id = waitlist_entries.salon_id and su.user_id = auth.uid())
) with check (
  exists (select 1 from public.salon_users su where su.salon_id = waitlist_entries.salon_id and su.user_id = auth.uid())
);

-- Delete operations are intentionally excluded from the demo policies.
-- TODO (owner decision): define deletion / retention roles before enabling deletes.
