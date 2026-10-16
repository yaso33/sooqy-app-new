-- ============================================
-- هجرة: نظام شركات التوصيل في SooQy
-- التاريخ: 2026-10-17
-- الوصف: إضافة جداول شركات التوصيل، الشحنات، مناطق التغطية، والخدمات
-- ============================================

-- 1. إضافة دور شركة التوصيل إلى enum app_role (إذا لم يكن موجوداً)
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE 'delivery_company';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. جدول شركات التوصيل المعتمدة
create table if not exists delivery_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  company_name text not null,
  contact_name text,
  contact_phone text not null,
  email text,
  license_number text,
  is_approved boolean default false,
  commission_rate numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. جدول مناطق التغطية لكل شركة توصيل
create table if not exists delivery_coverage_areas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references delivery_companies(id) on delete cascade,
  wilaya_id integer not null references wilayas(id),
  communes text[] default '{}',
  base_fee numeric not null default 0,
  fee_per_km numeric default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. جدول خدمات التوصيل المتاحة لكل شركة
create table if not exists delivery_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references delivery_companies(id) on delete cascade,
  service_name text not null,
  estimated_hours integer,
  base_price numeric not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 5. جدول طلبات الشحن (Shipments)
create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  company_id uuid references delivery_companies(id) on delete set null,
  status text check (status in (
    'pending',
    'accepted',
    'rejected',
    'picked_up',
    'in_transit',
    'delivered',
    'failed',
    'returned'
  )) default 'pending',
  pickup_address text,
  delivery_address text,
  recipient_name text,
  recipient_phone text,
  fee numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. جدول سجل حالات الشحن (للأudit والتتبع)
create table if not exists shipment_status_logs (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references shipments(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz default now()
);

-- 7. جدول تتبع GPS للشحنات (اختياري)
create table if not exists shipment_tracking (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references shipments(id) on delete cascade,
  lat double precision,
  lng double precision,
  recorded_at timestamptz default now()
);

-- 8. تعديل جدول orders: إضافة حقول الشحن
alter table orders
  add column if not exists shipment_id uuid references shipments(id) on delete set null,
  add column if not exists delivery_method text check (delivery_method in ('store_pickup', 'delivery')) default 'store_pickup';

-- 9. فهارس للأداء
create index if not exists idx_shipments_order_id on shipments(order_id);
create index if not exists idx_shipments_company_id on shipments(company_id);
create index if not exists idx_shipments_status on shipments(status);
create index if not exists idx_shipments_created_at on shipments(created_at);
create index if not exists idx_shipment_status_logs_shipment_id on shipment_status_logs(shipment_id);
create index if not exists idx_shipment_tracking_shipment_id on shipment_tracking(shipment_id);
create index if not exists idx_delivery_coverage_company_id on delivery_coverage_areas(company_id);
create index if not exists idx_delivery_services_company_id on delivery_services(company_id);
create index if not exists idx_orders_shipment_id on orders(shipment_id);
create index if not exists idx_orders_delivery_method on orders(delivery_method);

-- 10. دالة تحديث updated_at تلقائياً لجميع الجداول الجديدة
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

create trigger update_delivery_companies_updated_at
  before update on delivery_companies
  for each row execute function update_updated_at_column();

create trigger update_shipments_updated_at
  before update on shipments
  for each row execute function update_updated_at_column();

-- 11. سياسات الأمان (RLS) - تفعيل على الجداول الجديدة
alter table delivery_companies enable row level security;
alter table delivery_coverage_areas enable row level security;
alter table delivery_services enable row level security;
alter table shipments enable row level security;
alter table shipment_status_logs enable row level security;
alter table shipment_tracking enable row level security;

-- политики لشركات التوصيل: يمكن لكل شركة رؤية بياناتها فقط
create policy "الشركات ترى بياناتها الخاصة" on delivery_companies
  for all using (auth.uid() = user_id);

create policy "الشركات ترى مناطق تغطيتها" on delivery_coverage_areas
  for all using (
    exists (select 1 from delivery_companies where id = company_id and user_id = auth.uid())
  );

create policy "الشركات ترى خدماتها" on delivery_services
  for all using (
    exists (select 1 from delivery_companies where id = company_id and user_id = auth.uid())
  );

-- политики للشحنات: الشركة ترى شحناتها، العميل يرى شحنات طلباته
create policy "الشركات ترى شحناتها" on shipments
  for all using (
    exists (select 1 from delivery_companies where id = company_id and user_id = auth.uid())
  );

create policy "العملاء يرون شحنات طلباتهم" on shipments
  for select using (
    exists (
      select 1 from orders
      where orders.id = shipments.order_id
      and orders.user_id = auth.uid()
    )
  );

-- политики لسجلات الحالة والتتبع: قابلة للقراءة من الأطراف ذات الصلة
create policy "سجلات الحالة قابلة للقراءة" on shipment_status_logs
  for select using (true);

create policy "نقاط التتبع قابلة للقراءة" on shipment_tracking
  for select using (true);

-- 12. تعليقات توضيحية على الجداول
comment on table delivery_companies is 'شركات التوصيل المعتمدة في منصة SooQy';
comment on table delivery_coverage_areas is 'مناطق التغطية ورسوم التوصيل لكل شركة';
comment on table delivery_services is 'خدمات التوصيل المتاحة (سريع، اقتصادي، إلخ)';
comment on table shipments is 'طلبات الشحن بين المتاجر وشركات التوصيل';
comment on table shipment_status_logs is 'سجل تغييرات حالات الشحن للمراجعة';
comment on table shipment_tracking is 'نقاط تتبع GPS للشحنات (اختياري)';

-- ============================================
-- نهاية الهجرة
-- ============================================
