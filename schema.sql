-- ============================================================
--  Split the bill — database
--  Supabase > SQL Editor > New query > paste > Run
--
--  Four tables. That's the whole app.
-- ============================================================

drop table if exists claims, diners, items, bills cascade;

-- The id is the short code in the URL: yoursite.com/b/a7f3k2
-- It's what the QR code points at, and it's the only thing guarding
-- the bill, so it must be random. Never sequential.
create table bills (
  id          text primary key,
  merchant    text,
  payer_name  text,
  created_at  timestamptz not null default now(),

  -- always integer cents. never floats — they lose pennies silently.
  total_cents integer not null default 0,   -- what hit the card. ground truth.
  tax_cents   integer not null default 0,   -- shown for transparency only
  tip_cents   integer not null default 0,
  fee_cents   integer not null default 0
);

-- One row per receipt line. Two of the same drink becomes two rows so
-- two people can each claim one.
create table items (
  id          uuid primary key default gen_random_uuid(),
  bill_id     text not null references bills(id) on delete cascade,
  name        text not null default '',
  price_cents integer not null default 0,
  position    integer not null default 0
);
create index on items (bill_id);

-- A person at the table. No account. device_id is a random string their
-- browser remembers, so it knows which claims are theirs.
create table diners (
  id        uuid primary key default gen_random_uuid(),
  bill_id   text not null references bills(id) on delete cascade,
  device_id text,
  name      text not null,
  color     text not null default '#1F5F5B',
  joined_at timestamptz not null default now()
);
create index on diners (bill_id);

-- Who tapped what. The row existing IS the claim.
create table claims (
  item_id  uuid not null references items(id)  on delete cascade,
  diner_id uuid not null references diners(id) on delete cascade,
  primary key (item_id, diner_id)
);

-- Makes every phone at the table update the instant someone taps.
alter publication supabase_realtime add table bills;
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table diners;
alter publication supabase_realtime add table claims;

-- Anyone with the link can read the bill and claim items. That's the
-- point — you're handing the link out by QR at a table. Creating a bill
-- goes through the server, so there's no insert policy on `bills`.
alter table bills  enable row level security;
alter table items  enable row level security;
alter table diners enable row level security;
alter table claims enable row level security;

create policy read_bills  on bills  for select using (true);
create policy read_items  on items  for select using (true);
create policy read_diners on diners for select using (true);
create policy read_claims on claims for select using (true);

create policy join_table  on diners for insert with check (true);
create policy rename_self on diners for update using (true);
create policy make_claim  on claims for insert with check (true);
create policy drop_claim  on claims for delete using (true);
