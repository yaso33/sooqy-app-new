-- إضافة عمود view_count لجدول المنتجات
alter table public.products
add column if not exists view_count bigint not null default 0;

-- فهرس للمنتجات الأكثر مشاهدة
create index if not exists idx_products_view_count on public.products (view_count desc);

-- دالة لزيادة عداد المشاهدات
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

-- دالة لجلب المنتجات الأكثر مشاهدة
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

grant execute on function public.increment_product_view(uuid) to authenticated, anon;
grant execute on function public.get_most_viewed_products(int, int) to authenticated, anon;