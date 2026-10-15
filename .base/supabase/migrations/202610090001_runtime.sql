-- إكمال بيئة التشغيل: سلات التخزين، الفهارس، الصلاحيات، تنظيف المكررات

-- 1) إنشاء سلات التخزين (خاصة — الوصول عبر روابط موقعة)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('store-media',   'store-media',   false, 10485760, null),
  ('product-media', 'product-media', false, 10485760, null),
  ('receipts',      'receipts',      false, 10485760, null)
on conflict (id) do nothing;

-- 2) فهارس الأداء
create index if not exists idx_store_offers_product   on public.store_offers (product_id);
create index if not exists idx_store_offers_store     on public.store_offers (store_id);
create index if not exists idx_store_offers_created   on public.store_offers (created_at desc);
create index if not exists idx_reservations_user      on public.reservations (user_id);
create index if not exists idx_reservations_store     on public.reservations (store_id);
create index if not exists idx_orders_user            on public.orders (user_id);
create index if not exists idx_order_items_store      on public.order_items (store_id);
create index if not exists idx_reviews_target         on public.reviews (target_type, target_id);
create index if not exists idx_stores_wilaya          on public.stores (wilaya_id);
create index if not exists idx_products_category      on public.products (category);

-- 3) تقييد تنفيذ دوال RPC: anon لا ينفذ شيئًا، authenticated فقط
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

-- 4) تنظيف: دالة update_review_aggregate مكررة (update_target_rating تفعل نفسها)
drop trigger if exists reviews_update_aggregate on public.reviews;
drop function if exists public.update_review_aggregate();

-- 5) تحديث تلقائي لـ updated_at في profiles
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

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();