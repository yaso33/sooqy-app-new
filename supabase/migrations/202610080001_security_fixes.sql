-- إصلاحات أمنية: تقييد معاملات الدوال لمنع إساءة الاستخدام
-- 1) create_reservation: منع ساعات حجز غير منطقية (سلبية/لا نهائية)
-- 2) create_order: التحقق من قيم التوصيل والدفع قبل حساب الرسوم

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

  -- منع إنشاء حجوزات منتهية فورًا أو دائمة (1 إلى 72 ساعة)
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

  -- التحقق من القيم المسموحة فقط (يمنع حساب سعر مكتب بدل منزل بقيمة عشوائية)
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