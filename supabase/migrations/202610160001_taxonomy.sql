-- شجرة تصنيفات SooQy: تصنيفات كبيانات لا كبنية
--
-- الهدف: إضافة تصنيف أو فئة فرعية مستقبلًا = صف واحد في `public.categories` (أو سطر في
-- `src/lib/taxonomy.ts` للواجهة) دون أي تغيير في بنية التطبيق.
--
--  * categories: شجرة ثنائية المستوى (id نصي ثابت، parent_id للفئة الفرعية).
--  * stores.category + stores.subcategories: تصنيف المتجر الرئيسي وفئاته الفرعية
--    (تصنيف المنتج في products.category مستقل تمامًا عن تصنيف المتجر).
--  * category_stats(): أعداد المنتجات/المتاجر لكل تصنيف — تُستعمل في الواجهة لإخفاء
--    الأقسام الفارغة. التطبيق يعمل بدونها (يعرض كل التصنيفات بلا أعداد).

create table if not exists public.categories (
  id text primary key,
  parent_id text references public.categories(id) on delete cascade,
  label_ar text not null,
  emoji text not null default '🛍️',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_parent on public.categories (parent_id);

alter table public.categories enable row level security;

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select using (true);

grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;

-- ===== التعبئة: مطابقة تمامًا لـ src/lib/taxonomy.ts =====
insert into public.categories (id, parent_id, label_ar, emoji, sort_order) values
  -- 1) الأزياء والملابس
  ('fashion',           null,          'الأزياء والملابس',            '👗',  10),
  ('clothes',           'fashion',     'الملابس',                     '👕',  11),
  ('shoes',             'fashion',     'الأحذية',                     '👟',  12),
  ('bags',              'fashion',     'الحقائب والإكسسوارات',        '👜',  13),
  -- 2) الإلكترونيات
  ('electronics',       null,          'الإلكترونيات',                '📱',  20),
  ('phones',            'electronics', 'الهواتف والأجهزة اللوحية',    '📱',  21),
  ('computers',         'electronics', 'الحواسيب ومستلزماتها',        '💻',  22),
  ('gadgets',           'electronics', 'الأجهزة الإلكترونية',         '🎧',  23),
  ('phone-accessories', 'electronics', 'إكسسوارات الهواتف',           '🔌',  24),
  -- 3) الجمال والعناية الشخصية
  ('beauty',            null,          'الجمال والعناية الشخصية',     '💄',  30),
  ('perfumes',          'beauty',      'العطور',                      '🌸',  31),
  ('makeup',            'beauty',      'مستحضرات التجميل',            '💄',  32),
  ('skincare',          'beauty',      'العناية بالبشرة والشعر',      '🧴',  33),
  -- 4) المنزل والديكور
  ('home',              null,          'المنزل والديكور',             '🛋️',  40),
  ('furniture',         'home',        'الأثاث',                      '🪑',  41),
  ('home-tools',        'home',        'الأدوات المنزلية',            '🧺',  42),
  ('decor',             'home',        'الديكور والإضاءة',            '💡',  43),
  ('kitchenware',       'home',        'أدوات المطبخ',                '🍽️',  44),
  -- 5) الأطفال والألعاب
  ('kids',              null,          'الأطفال والألعاب',            '🧸',  50),
  ('kids-clothes',      'kids',        'ملابس الأطفال',               '👶',  51),
  ('toys',              'kids',        'ألعاب الأطفال',               '🧸',  52),
  ('kids-essentials',   'kids',        'مستلزمات الأطفال',            '🍼',  53),
  -- 6) الرياضة والترفيه
  ('sports',            null,          'الرياضة والترفيه',            '🏀',  60),
  ('sportswear',        'sports',      'الملابس والأحذية الرياضية',   '👟',  61),
  ('sports-gear',       'sports',      'المعدات الرياضية',            '🏋️',  62),
  ('hobbies',           'sports',      'مستلزمات الهوايات',           '🎣',  63),
  -- 7) الأغذية والحلويات
  ('food',              null,          'الأغذية والحلويات',           '🍰',  70),
  ('sweets',            'food',        'الحلويات والمخبوزات',         '🍰',  71),
  ('groceries',         'food',        'المنتجات الغذائية',           '🛒',  72),
  ('home-food',         'food',        'المأكولات المنزلية',          '🥘',  73),
  -- 8) الهدايا والحرف اليدوية
  ('gifts-crafts',      null,          'الهدايا والحرف اليدوية',      '🎁',  80),
  ('gifts',             'gifts-crafts','الهدايا',                     '🎁',  81),
  ('handmade',          'gifts-crafts','المنتجات اليدوية',            '🧶',  82),
  ('stationery',        'gifts-crafts','القرطاسية ومستلزمات المكتب',  '✏️',  83),
  -- 9) الخدمات والمشاريع الرقمية
  ('digital',           null,          'الخدمات والمشاريع الرقمية',   '💻',  90),
  ('design',            'digital',     'التصميم والجرافيك',           '🎨',  91),
  ('web-dev',           'digital',     'تطوير المواقع والتطبيقات',    '⌨️',  92),
  ('digital-services',  'digital',     'الخدمات الرقمية',             '🛠️',  93),
  ('digital-products',  'digital',     'المنتجات الرقمية',            '📦',  94),
  -- 10) السيارات وملحقاتها
  ('cars',              null,          'السيارات وملحقاتها',          '🚗', 100),
  ('car-accessories',   'cars',        'إكسسوارات السيارات',          '🚙', 101),
  ('car-parts',         'cars',        'قطع الغيار',                  '🔧', 102),
  ('car-maintenance',   'cars',        'مستلزمات الصيانة',            '🧰', 103),
  -- تصنيفات أخرى (مستوى واحد)
  ('books',             null,          'الكتب والتعليم',              '📚', 110),
  ('industrial',        null,          'الأدوات المهنية والصناعية',   '⚙️', 111),
  ('used',              null,          'المنتجات المستعملة',          '♻️', 112),
  ('flowers',           null,          'الزهور والنباتات',            '🌿', 113),
  ('pets',              null,          'مستلزمات الحيوانات الأليفة',  '🐾', 114),
  ('misc',              null,          'منتجات أخرى',                 '🛍️', 115)
on conflict (id) do update set
  parent_id = excluded.parent_id,
  label_ar = excluded.label_ar,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order;

-- ===== تصنيف المتجر =====
alter table public.stores add column if not exists category text;
alter table public.stores add column if not exists subcategories text[] not null default '{}';

create index if not exists idx_stores_category on public.stores (category);

comment on column public.stores.category is
  'التصنيف الرئيسي للمتجر — معرّف من public.categories (أو src/lib/taxonomy.ts)';
comment on column public.stores.subcategories is
  'الفئات الفرعية التي يبيعها المتجر — مصفوفة معرّفات فرعية';
comment on column public.products.category is
  'تصنيف المنتج: معرّف فئة فرعية، أو تصنيف رئيسي إن لم تكن له فرعيات — مستقل عن تصنيف المتجر';

-- ===== إحصاءات التصنيفات =====
create or replace function public.category_stats()
returns table (id text, products bigint, stores bigint)
language sql
stable
security definer
set search_path = public
as $$
  with p as (
    select coalesce(nullif(btrim(category), ''), 'misc') as id, count(*)::bigint as n
    from public.products
    group by 1
  ), s as (
    select coalesce(nullif(btrim(category), ''), 'misc') as id, count(*)::bigint as n
    from public.stores
    group by 1
  )
  select coalesce(p.id, s.id) as id,
         coalesce(p.n, 0)::bigint as products,
         coalesce(s.n, 0)::bigint as stores
  from p full outer join s on p.id = s.id;
$$;

grant execute on function public.category_stats() to anon, authenticated;
grant execute on function public.category_stats() to service_role;
