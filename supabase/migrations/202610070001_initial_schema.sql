create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'merchant', 'admin');
create type public.review_target_type as enum ('product', 'store');
create type public.review_status as enum ('pending', 'approved', 'rejected');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  wilaya_id int,
  commune text,
  is_phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Own profile read" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "Own profile insert" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "Own profile update" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.become_merchant()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.user_roles (user_id, role)
  values (auth.uid(), 'merchant')
  on conflict do nothing;
end;
$$;

create table public.wilayas (
  id int primary key,
  name_ar text not null,
  name_fr text not null,
  home_price int not null,
  desk_price int not null
);

grant select on public.wilayas to anon, authenticated;
grant all on public.wilayas to service_role;
alter table public.wilayas enable row level security;
create policy "Wilayas public read" on public.wilayas for select to anon, authenticated using (true);

insert into public.wilayas (id, name_ar, name_fr, home_price, desk_price) values
  (1, 'أدرار', 'Adrar', 1100, 700),
  (2, 'الشلف', 'Chlef', 1100, 700),
  (3, 'الأغواط', 'Laghouat', 850, 550),
  (4, 'أم البواقي', 'Oum El Bouaghi', 650, 400),
  (5, 'باتنة', 'Batna', 650, 400),
  (6, 'بجاية', 'Béjaïa', 850, 550),
  (7, 'بسكرة', 'Biskra', 850, 550),
  (8, 'بشار', 'Béchar', 1100, 700),
  (9, 'البليدة', 'Blida', 1100, 700),
  (10, 'البويرة', 'Bouira', 650, 400),
  (11, 'تمنراست', 'Tamanrasset', 1600, 1000),
  (12, 'تبسة', 'Tébessa', 650, 400),
  (13, 'تلمسان', 'Tlemcen', 850, 550),
  (14, 'تيارت', 'Tiaret', 650, 400),
  (15, 'تيزي وزو', 'Tizi Ouzou', 650, 400),
  (16, 'الجزائر', 'Alger', 400, 250),
  (17, 'الجلفة', 'Djelfa', 850, 550),
  (18, 'جيجل', 'Jijel', 650, 400),
  (19, 'سطيف', 'Sétif', 650, 400),
  (20, 'سعيدة', 'Saïda', 650, 400),
  (21, 'سكيكدة', 'Skikda', 650, 400),
  (22, 'سيدي بلعباس', 'Sidi Bel Abbès', 650, 400),
  (23, 'عنابة', 'Annaba', 650, 400),
  (24, 'قالمة', 'Guelma', 650, 400),
  (25, 'قسنطينة', 'Constantine', 650, 400),
  (26, 'المدية', 'Médéa', 650, 400),
  (27, 'مستغانم', 'Mostaganem', 650, 400),
  (28, 'المسيلة', 'M''Sila', 650, 400),
  (29, 'معسكر', 'Mascara', 650, 400),
  (30, 'ورقلة', 'Ouargla', 1100, 700),
  (31, 'وهران', 'Oran', 650, 400),
  (32, 'البيض', 'El Bayadh', 850, 550),
  (33, 'إليزي', 'Illizi', 1600, 1000),
  (34, 'برج بوعريريج', 'Bordj Bou Arréridj', 650, 400),
  (35, 'بومرداس', 'Boumerdès', 650, 400),
  (36, 'الطارف', 'El Tarf', 650, 400),
  (37, 'تندوف', 'Tindouf', 1600, 1000),
  (38, 'تيسمسيلت', 'Tissemsilt', 650, 400),
  (39, 'الوادي', 'El Oued', 1100, 700),
  (40, 'خنشلة', 'Khenchela', 650, 400),
  (41, 'سوق أهراس', 'Souk Ahras', 650, 400),
  (42, 'تيبازة', 'Tipaza', 650, 400),
  (43, 'ميلة', 'Mila', 650, 400),
  (44, 'عين الدفلى', 'Aïn Defla', 650, 400),
  (45, 'النعامة', 'Naâma', 850, 550),
  (46, 'عين تموشنت', 'Aïn Témouchent', 650, 400),
  (47, 'غرداية', 'Ghardaïa', 1100, 700),
  (48, 'غليزان', 'Relizane', 650, 400),
  (49, 'تيميمون', 'Timimoun', 1100, 700),
  (50, 'برج باجي مختار', 'Bordj Badji Mokhtar', 1600, 1000),
  (51, 'أولاد جلال', 'Ouled Djellal', 850, 550),
  (52, 'بني عباس', 'Béni Abbès', 1100, 700),
  (53, 'عين صالح', 'In Salah', 1100, 700),
  (54, 'عين قزام', 'In Guezzam', 1600, 1000),
  (55, 'تقرت', 'Touggourt', 1100, 700),
  (56, 'جانت', 'Djanet', 1600, 1000),
  (57, 'المغير', 'El M''Ghair', 1100, 700),
  (58, 'المنيعة', 'El Meniaa', 1100, 700);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  phone text,
  whatsapp text,
  wilaya_id int not null references public.wilayas(id),
  commune text,
  address_line text,
  latitude double precision,
  longitude double precision,
  opening_hours jsonb not null default '{"open":"09:00","close":"20:00","closed_days":[5]}'::jsonb,
  logo_url text,
  cover_url text,
  rating numeric(2,1) not null default 4.5,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

grant select on public.stores to anon, authenticated;
grant insert, update, delete on public.stores to authenticated;
grant all on public.stores to service_role;
alter table public.stores enable row level security;
create policy "Stores public read" on public.stores for select to anon, authenticated using (true);
create policy "Merchants create own store" on public.stores for insert to authenticated with check (owner_id = auth.uid() and public.has_role(auth.uid(), 'merchant') and is_verified = false);
create policy "Owners update store" on public.stores for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete store" on public.stores for delete to authenticated using (owner_id = auth.uid());

create or replace function public.is_store_owner(_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stores where id = _store_id and owner_id = auth.uid()
  );
$$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  brand text,
  category text not null default 'other',
  created_by uuid references auth.users(id) on delete set null,
  rating numeric(2,1) not null default 0,
  created_at timestamptz not null default now()
);

grant select on public.products to anon, authenticated;
grant insert, update on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Products public read" on public.products for select to anon, authenticated using (true);
create policy "Merchants add products" on public.products for insert to authenticated with check (created_by = auth.uid() and public.has_role(auth.uid(), 'merchant'));
create policy "Creators update products" on public.products for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create table public.store_offers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price int not null check (price >= 0),
  old_price int,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  is_available boolean not null default true,
  last_confirmed_at timestamptz not null default now(),
  options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (store_id, product_id)
);

grant select on public.store_offers to anon, authenticated;
grant insert, update, delete on public.store_offers to authenticated;
grant all on public.store_offers to service_role;
alter table public.store_offers enable row level security;
create policy "Offers public read" on public.store_offers for select to anon, authenticated using (true);
create policy "Owners insert offers" on public.store_offers for insert to authenticated with check (public.is_store_owner(store_id));
create policy "Owners update offers" on public.store_offers for update to authenticated using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "Owners delete offers" on public.store_offers for delete to authenticated using (public.is_store_owner(store_id));

create or replace function public.is_offer_owner(_offer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_offers o
    join public.stores s on s.id = o.store_id
    where o.id = _offer_id and s.owner_id = auth.uid()
  );
$$;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.store_offers(id) on delete cascade,
  image_url text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;
grant all on public.product_images to service_role;
alter table public.product_images enable row level security;
create policy "Images public read" on public.product_images for select to anon, authenticated using (true);
create policy "Owners manage images" on public.product_images for all to authenticated using (public.is_offer_owner(offer_id)) with check (public.is_offer_owner(offer_id));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type public.review_target_type not null,
  target_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  status public.review_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "Reviews public read" on public.reviews for select to anon, authenticated using (status = 'approved');
create policy "Users insert own review" on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own review" on public.reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own review" on public.reviews for delete to authenticated using (user_id = auth.uid());

create or replace function public.update_target_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_type_value public.review_target_type;
  target_id_value uuid;
  target_avg numeric(2,1);
  target_table text;
begin
  target_type_value := coalesce(new.target_type, old.target_type);
  target_id_value := coalesce(new.target_id, old.target_id);
  target_table := case target_type_value when 'product' then 'products' else 'stores' end;

  select avg(r.rating)::numeric(2,1)
  into target_avg
  from public.reviews r
  where r.target_type = target_type_value
    and r.target_id = target_id_value
    and r.status = 'approved';

  execute format('update public.%I set rating = coalesce($1, 0) where id = $2', target_table)
    using target_avg, target_id_value;

  return coalesce(new, old);
end;
$$;

create trigger reviews_update_target_rating
after insert or update of rating, status or delete
on public.reviews
for each row execute function public.update_target_rating();

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  offer_id uuid not null references public.store_offers(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  options jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'collected', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

grant select on public.reservations to authenticated;
grant all on public.reservations to service_role;
alter table public.reservations enable row level security;
create policy "Users read own reservations" on public.reservations for select to authenticated using (user_id = auth.uid() or public.is_store_owner(store_id));

create or replace function public.create_reservation(_offer_id uuid, _quantity int default 1, _hours int default 3, _options jsonb default '{}'::jsonb)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.store_offers;
  r public.reservations;
  c text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if _quantity < 1 or _quantity > 10 then
    raise exception 'invalid_quantity';
  end if;

  select * into o from public.store_offers where id = _offer_id for update;
  if not found then
    raise exception 'offer_not_found';
  end if;

  if not o.is_available or o.stock_quantity < _quantity then
    raise exception 'out_of_stock';
  end if;

  loop
    c := 'SQ-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    exit when not exists (select 1 from public.reservations where code = c);
  end loop;

  update public.store_offers
  set stock_quantity = stock_quantity - _quantity,
      is_available = (stock_quantity - _quantity) > 0
  where id = _offer_id;

  insert into public.reservations (code, user_id, store_id, offer_id, quantity, options, expires_at)
  values (c, auth.uid(), o.store_id, o.id, _quantity, coalesce(_options, '{}'::jsonb), now() + make_interval(hours => _hours))
  returning * into r;

  return r;
end;
$$;

create or replace function public.cancel_reservation(_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reservations;
begin
  select * into r
  from public.reservations
  where id = _reservation_id and user_id = auth.uid()
  for update;

  if not found or r.status <> 'pending' then
    raise exception 'not_cancellable';
  end if;

  update public.reservations set status = 'cancelled' where id = r.id;
  update public.store_offers set stock_quantity = stock_quantity + r.quantity, is_available = true where id = r.offer_id;
end;
$$;

create or replace function public.merchant_confirm_reservation(_code text)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reservations;
begin
  select * into r
  from public.reservations
  where code = upper(trim(_code))
  for update;

  if not found or not public.is_store_owner(r.store_id) then
    raise exception 'reservation_not_found';
  end if;

  if r.status <> 'pending' then
    raise exception 'reservation_%', r.status;
  end if;

  if r.expires_at < now() then
    update public.reservations set status = 'expired' where id = r.id;
    update public.store_offers set stock_quantity = stock_quantity + r.quantity, is_available = true where id = r.offer_id;
    raise exception 'reservation_expired';
  end if;

  update public.reservations set status = 'collected' where id = r.id returning * into r;
  return r;
end;
$$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  wilaya_id int not null references public.wilayas(id),
  commune text not null,
  address_line text,
  delivery_type text not null check (delivery_type in ('home', 'desk')),
  payment_method text not null check (payment_method in ('cod', 'baridimob')),
  receipt_url text,
  subtotal int not null,
  shipping_fee int not null,
  total int not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  offer_id uuid references public.store_offers(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_name text not null,
  unit_price int not null,
  quantity int not null check (quantity > 0),
  options jsonb not null default '{}'::jsonb
);

grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;

create or replace function public.is_order_merchant(_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.order_items i
    join public.stores s on s.id = i.store_id
    where i.order_id = _order_id and s.owner_id = auth.uid()
  );
$$;

create or replace function public.is_order_owner(_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders where id = _order_id and user_id = auth.uid()
  );
$$;

create policy "Order read" on public.orders for select to authenticated using (user_id = auth.uid() or public.is_order_merchant(id));
create policy "Merchant updates order" on public.orders for update to authenticated using (public.is_order_merchant(id)) with check (public.is_order_merchant(id));
create policy "Order items read" on public.order_items for select to authenticated using (public.is_order_owner(order_id) or public.is_store_owner(store_id));

create or replace function public.create_order(
  _items jsonb,
  _delivery_type text,
  _wilaya_id int,
  _commune text,
  _address_line text,
  _full_name text,
  _phone text,
  _payment_method text,
  _receipt_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb;
  o public.store_offers;
  pname text;
  q int;
  sub int := 0;
  fee int;
  oid uuid;
  w public.wilayas;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if jsonb_array_length(_items) = 0 then
    raise exception 'empty_bag';
  end if;

  if _payment_method = 'baridimob' and (_receipt_url is null or _receipt_url = '') then
    raise exception 'receipt_required';
  end if;

  select * into w from public.wilayas where id = _wilaya_id;
  if not found then
    raise exception 'invalid_wilaya';
  end if;

  fee := case when _delivery_type = 'home' then w.home_price else w.desk_price end;

  insert into public.orders (user_id, full_name, phone, wilaya_id, commune, address_line, delivery_type, payment_method, receipt_url, subtotal, shipping_fee, total)
  values (auth.uid(), _full_name, _phone, _wilaya_id, _commune, _address_line, _delivery_type, _payment_method, _receipt_url, 0, fee, 0)
  returning id into oid;

  for it in select * from jsonb_array_elements(_items) loop
    q := (it->>'quantity')::int;
    if q is null or q < 1 then
      raise exception 'invalid_quantity';
    end if;

    select * into o from public.store_offers where id = (it->>'offer_id')::uuid for update;
    if not found or not o.is_available or o.stock_quantity < q then
      raise exception 'out_of_stock';
    end if;

    select name into pname from public.products where id = o.product_id;

    insert into public.order_items (order_id, offer_id, store_id, product_name, unit_price, quantity, options)
    values (oid, o.id, o.store_id, pname, o.price, q, coalesce(it->'options', '{}'::jsonb));

    update public.store_offers
    set stock_quantity = stock_quantity - q,
        is_available = (stock_quantity - q) > 0
    where id = o.id;

    sub := sub + o.price * q;
  end loop;

  update public.orders set subtotal = sub, total = sub + fee where id = oid;
  return oid;
end;
$$;

create or replace function public.merchant_confirm_all_stock(_store_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_store_owner(_store_id) then
    raise exception 'forbidden';
  end if;

  update public.store_offers set last_confirmed_at = now() where store_id = _store_id;
  get diagnostics n = row_count;
  return n;
end;
$$;

create policy "Media public read" on storage.objects for select to anon, authenticated using (bucket_id in ('store-media', 'product-media'));
create policy "Media owner upload" on storage.objects for insert to authenticated with check (bucket_id in ('store-media', 'product-media', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Media owner update" on storage.objects for update to authenticated using (bucket_id in ('store-media', 'product-media') and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id in ('store-media', 'product-media') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Media owner delete" on storage.objects for delete to authenticated using (bucket_id in ('store-media', 'product-media', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Receipts owner read" on storage.objects for select to authenticated using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.update_review_aggregate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  avg_rating numeric(2,1);
  target_table text;
begin
  target_table := case new.target_type when 'product' then 'products' else 'stores' end;

  select avg(rating)::numeric(2,1)
  into avg_rating
  from public.reviews
  where target_type = new.target_type
    and target_id = new.target_id
    and status = 'approved';

  execute format('update public.%I set rating = coalesce($1, 0) where id = $2', target_table)
  using avg_rating, new.target_id;

  return new;
end;
$$;

create trigger reviews_update_aggregate
after insert or update of rating, status
on public.reviews
for each row execute function public.update_review_aggregate();
