-- ============================================================
-- SOOQY — الهجرة الشاملة للنسخة المتكاملة (Beta)
-- ============================================================
-- الغرض: قاعدة حية لديها الجداول فقط (بدون دوال RPC) → تكتمل
--        بكل دوال التشغيل، أعمدة التخصيص، العمولة، المراجعات
--        الموثّقة، و triggers الإشعارات.
-- آمنة للتكرار (idempotent): يمكن لصقها كاملة في SQL Editor
-- أو تشغيلها عبر: node scripts/apply-migrations.mjs --only=202610140001
-- ============================================================

-- ---------- 1) الأعمدة الناقصة ----------
alter table public.products add column if not exists view_count bigint not null default 0;
alter table public.stores add column if not exists instagram_url text;
alter table public.stores add column if not exists facebook_url text;
alter table public.stores add column if not exists commission_rate numeric(4,2) not null default 7;
alter table public.profiles add column if not exists avatar_url text;
alter table public.orders add column if not exists commission_amount int not null default 0;

-- ---------- 2) فهارس الأداء ----------
create index if not exists idx_products_view_count on public.products (view_count desc);
create index if not exists idx_store_offers_product on public.store_offers (product_id);
create index if not exists idx_store_offers_store on public.store_offers (store_id);
create index if not exists idx_store_offers_created on public.store_offers (created_at desc);
create index if not exists idx_reservations_user on public.reservations (user_id);
create index if not exists idx_reservations_store on public.reservations (store_id);
create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_order_items_store on public.order_items (store_id);
create index if not exists idx_reviews_target on public.reviews (target_type, target_id);
create index if not exists idx_stores_wilaya on public.stores (wilaya_id);
create index if not exists idx_products_category on public.products (category);

-- ---------- 3) سلات التخزين (خاصة — الوصول عبر روابط موقعة) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('store-media',   'store-media',   false, 10485760, null),
  ('product-media', 'product-media', false, 10485760, null),
  ('receipts',      'receipts',      false, 10485760, null)
on conflict (id) do nothing;

-- سياسات التخزين — بدونها يفشل رفع الصور (403) على القواعد الحية
drop policy if exists "Media public read" on storage.objects;
create policy "Media public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('store-media', 'product-media'));

drop policy if exists "Media owner upload" on storage.objects;
create policy "Media owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('store-media', 'product-media', 'receipts')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Media owner update" on storage.objects;
create policy "Media owner update" on storage.objects
  for update to authenticated
  using (bucket_id in ('store-media', 'product-media') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('store-media', 'product-media') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Media owner delete" on storage.objects;
create policy "Media owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('store-media', 'product-media', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Receipts owner read" on storage.objects;
create policy "Receipts owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 4) الدوال المساعدة ----------
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------- 5) إنشاء الملف الشخصي تلقائيًا عند التسجيل ----------
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- 6) دوال التشغيل ----------
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

  -- منع حجوزات منتهية فورًا أو دائمة (1 إلى 72 ساعة)
  if _hours < 1 or _hours > 72 then
    raise exception 'invalid_hours';
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

-- إنشاء الطلب مع احتساب عمولة المتاجر (7% افتراضيًا، قابلة للتخصيص لكل متجر)
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
  rate numeric(4,2);
  commission int := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if jsonb_array_length(_items) = 0 then
    raise exception 'empty_bag';
  end if;

  if _delivery_type not in ('home', 'desk') then
    raise exception 'invalid_delivery_type';
  end if;

  if _payment_method not in ('cod', 'baridimob') then
    raise exception 'invalid_payment_method';
  end if;

  if _payment_method = 'baridimob' and (_receipt_url is null or _receipt_url = '') then
    raise exception 'receipt_required';
  end if;

  select * into w from public.wilayas where id = _wilaya_id;
  if not found then
    raise exception 'invalid_wilaya';
  end if;

  fee := case when _delivery_type = 'home' then w.home_price else w.desk_price end;

  insert into public.orders (user_id, full_name, phone, wilaya_id, commune, address_line, delivery_type, payment_method, receipt_url, subtotal, shipping_fee, total, commission_amount)
  values (auth.uid(), _full_name, _phone, _wilaya_id, _commune, _address_line, _delivery_type, _payment_method, _receipt_url, 0, fee, 0, 0)
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

    -- عمولة المتجر (نسبة مئوية من قيمة البضاعة، الافتراضي 7%)
    select commission_rate into rate from public.stores where id = o.store_id;
    commission := commission + round(o.price * q * coalesce(rate, 7) / 100);

    insert into public.order_items (order_id, offer_id, store_id, product_name, unit_price, quantity, options)
    values (oid, o.id, o.store_id, pname, o.price, q, coalesce(it->'options', '{}'::jsonb));

    update public.store_offers
    set stock_quantity = stock_quantity - q,
        is_available = (stock_quantity - q) > 0
    where id = o.id;

    sub := sub + o.price * q;
  end loop;

  update public.orders set subtotal = sub, total = sub + fee, commission_amount = commission where id = oid;
  return oid;
end;
$$;

-- ---------- 7) المشاهدات ----------
create or replace function public.increment_product_view(product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set view_count = view_count + 1
  where id = product_id;
end;
$$;

create or replace function public.get_most_viewed_products(limit_count int default 10, offset_count int default 0)
returns setof public.products
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select * from public.products
  order by view_count desc
  limit limit_count
  offset offset_count;
end;
$$;

-- ---------- 8) المراجعات الموثّقة ----------
-- لا تُقبل أي مراجعة إلا بعد طلب مُسلَّم (delivered) أو حجز مُستلَم (collected).
-- الإدراج المباشر في reviews يُغلق — كل المراجعات تمر عبر submit_review.

create or replace function public.submit_review(
  _target_type public.review_target_type,
  _target_id uuid,
  _rating int,
  _comment text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reviews;
  verified boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if _rating < 1 or _rating > 5 then
    raise exception 'invalid_rating';
  end if;

  if _target_type = 'product' then
    select exists (
      select 1
      from public.order_items i
      join public.orders o on o.id = i.order_id
      join public.store_offers so on so.id = i.offer_id
      where o.user_id = auth.uid()
        and o.status = 'delivered'
        and so.product_id = _target_id
    ) into verified;
  else
    select exists (
      select 1
      from public.order_items i
      join public.orders o on o.id = i.order_id
      where o.user_id = auth.uid()
        and o.status = 'delivered'
        and i.store_id = _target_id
    ) or exists (
      select 1
      from public.reservations rs
      where rs.user_id = auth.uid()
        and rs.store_id = _target_id
        and rs.status = 'collected'
    ) into verified;
  end if;

  if not coalesce(verified, false) then
    raise exception 'review_not_verified';
  end if;

  insert into public.reviews (user_id, target_type, target_id, rating, comment, status)
  values (auth.uid(), _target_type, _target_id, _rating, nullif(trim(coalesce(_comment, '')), ''), 'approved')
  on conflict (user_id, target_type, target_id)
  do update set rating = excluded.rating, comment = excluded.comment, status = 'approved', updated_at = now()
  returning * into r;

  return r;
end;
$$;

drop policy if exists "Users insert own review" on public.reviews;
drop policy if exists "Users update own review" on public.reviews;
drop policy if exists "Users delete own review" on public.reviews;
revoke insert, update, delete on public.reviews from authenticated;

-- تحديث متوسط التقييم تلقائيًا
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

drop trigger if exists reviews_update_target_rating on public.reviews;
create trigger reviews_update_target_rating
after insert or update of rating, status or delete
on public.reviews
for each row execute function public.update_target_rating();

-- ---------- 9) الإشعارات ----------
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.user_id,
      'order',
      'تحديث حالة طلبك',
      case new.status
        when 'confirmed' then 'تم تأكيد طلبك رقم ' || substr(new.id::text, 1, 8)
        when 'shipped' then 'تم شحن طلبك رقم ' || substr(new.id::text, 1, 8)
        when 'delivered' then 'تم توصيل طلبك رقم ' || substr(new.id::text, 1, 8)
        when 'cancelled' then 'تم إلغاء طلبك رقم ' || substr(new.id::text, 1, 8)
        else 'تغيّرت حالة طلبك إلى ' || new.status
      end,
      jsonb_build_object('order_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists orders_notify_status on public.orders;
create trigger orders_notify_status
after update of status on public.orders
for each row execute function public.notify_order_status();

create or replace function public.notify_reservation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.user_id,
      'reservation',
      'تحديث حالة حجزك',
      case new.status
        when 'collected' then 'تم استلام حجزك بنجاح'
        when 'cancelled' then 'تم إلغاء حجزك'
        when 'expired' then 'انتهت صلاحية حجزك'
        else 'تغيّرت حالة حجزك إلى ' || new.status
      end,
      jsonb_build_object('reservation_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_notify_status on public.reservations;
create trigger reservations_notify_status
after update of status on public.reservations
for each row execute function public.notify_reservation_status();

-- ---------- 10) صلاحيات تنفيذ الدوال ----------
revoke execute on function public.create_reservation(uuid, int, int, jsonb) from anon, public;
revoke execute on function public.cancel_reservation(uuid) from anon, public;
revoke execute on function public.create_order(jsonb, text, int, text, text, text, text, text, text) from anon, public;
revoke execute on function public.become_merchant() from anon, public;
revoke execute on function public.merchant_confirm_reservation(text) from anon, public;
revoke execute on function public.merchant_confirm_all_stock(uuid) from anon, public;
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.is_store_owner(uuid) from anon, public;
revoke execute on function public.is_offer_owner(uuid) from anon, public;
revoke execute on function public.is_order_owner(uuid) from anon, public;
revoke execute on function public.is_order_merchant(uuid) from anon, public;
revoke execute on function public.submit_review(public.review_target_type, uuid, int, text) from anon, public;

grant execute on function public.create_reservation(uuid, int, int, jsonb) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.create_order(jsonb, text, int, text, text, text, text, text, text) to authenticated;
grant execute on function public.become_merchant() to authenticated;
grant execute on function public.merchant_confirm_reservation(text) to authenticated;
grant execute on function public.merchant_confirm_all_stock(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_store_owner(uuid) to authenticated;
grant execute on function public.is_offer_owner(uuid) to authenticated;
grant execute on function public.is_order_owner(uuid) to authenticated;
grant execute on function public.is_order_merchant(uuid) to authenticated;
grant execute on function public.submit_review(public.review_target_type, uuid, int, text) to authenticated;
grant execute on function public.increment_product_view(uuid) to authenticated, anon;
grant execute on function public.get_most_viewed_products(int, int) to authenticated, anon;

-- ---------- 11) التوثيق التلقائي للمتاجر ----------
alter table public.stores alter column is_verified set default true;

drop policy if exists "Merchants create own store" on public.stores;
create policy "Merchants create own store" on public.stores
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.has_role(auth.uid(), 'merchant')
    and is_verified = true
  );