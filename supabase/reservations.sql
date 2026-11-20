begin;

create table if not exists public.gift_reservations (
  gift_id uuid primary key
);

alter table public.gift_reservations enable row level security;

revoke all on table public.gift_reservations from public, anon, authenticated;
grant select (gift_id), insert (gift_id) on table public.gift_reservations to anon;

drop policy if exists read_reservations on public.gift_reservations;
create policy read_reservations on public.gift_reservations
  for select to anon using (true);

drop policy if exists create_reservations on public.gift_reservations;
create policy create_reservations on public.gift_reservations
  for insert to anon with check (true);

commit;
