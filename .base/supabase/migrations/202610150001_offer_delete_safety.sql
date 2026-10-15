-- حذف المنتجات بأمان + حماية البيانات التاريخية
--
-- عند حذف عرض منتج (store_offers) من متجر:
--   * سجل الطلبات محمي أصلًا: order_items يحتفظ بلقطة (product_name, unit_price) و offer_id يصبح null.
--   * سجل الحجوزات كان يُحذف تلقائيًا (on delete cascade) — هذا يُفقده. نحوّله إلى set null
--     فيبقى الحجز في سجل العميل والتاجر بعد حذف المنتج.
-- ملاحظة: product_images تبقى on delete cascade (الصور تخص العرض نفسه، لا فائدة منها بعده).

alter table public.reservations alter column offer_id drop not null;

alter table public.reservations drop constraint if exists reservations_offer_id_fkey;
alter table public.reservations
  add constraint reservations_offer_id_fkey
  foreign key (offer_id) references public.store_offers(id) on delete set null;

create index if not exists idx_reservations_offer on public.reservations (offer_id);
