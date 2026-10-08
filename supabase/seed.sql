-- بيانات تجريبية لـ SOOQY (تُشغَّل فقط إذا كانت الجداول فارغة)
-- محلات بدون مالك (owner_id null) — العرض العام يعمل، ويمكن ربطها لاحقًا بحساب تاجر

-- المحلات
insert into public.stores (name, slug, description, phone, whatsapp, wilaya_id, commune, address_line, latitude, longitude, opening_hours, is_verified, rating) values
  ('متجر الأمانة للإلكترونيات', 'al-amana-electronics', 'هواتف وإلكترونيات أصلية بضمان', '0550123456', '0550123456', 16, 'حسين داي', 'شارع محمد الخامس، حسين داي', 36.7538, 3.0588, '{"open":"09:00","close":"20:00","closed_days":[5]}', true, 4.6),
  ('دار الأناقة للملابس', 'dar-al-anaka', 'أحدث صيحات الملابس الرجالية والنسائية', '0551234567', '0551234567', 16, 'الحراش', 'حي 5 جويلية، الحراش', 36.7278, 3.0876, '{"open":"10:00","close":"21:00","closed_days":[5]}', true, 4.3),
  ('جمالك لمواد التجميل', 'jamalik-cosmetics', 'مستحضرات تجميل أصلية 100%', '0552345678', '0552345678', 9, 'بوفاريك', 'شارع الاستقلال، بوفاريك', 36.5747, 2.9104, '{"open":"09:30","close":"19:30","closed_days":[6]}', true, 4.1),
  ('رياضة المدينة', 'madina-sport', 'معدات وأحذية رياضية', '0553456789', '0553456789', 31, 'وهران', 'شارع العربي بن مهيدي، وهران', 35.6969, -0.6331, '{"open":"09:00","close":"20:00","closed_days":[5]}', true, 4.5),
  ('قهوة الصباح', 'sabah-coffee', 'كبسولات وحبوب قهوة مختصة', '0554567890', '0554567890', 16, 'بئر مراد رايس', 'شارع فلسطين، بئر مراد رايس', 36.7313, 3.0383, '{"open":"08:00","close":"19:00","closed_days":[5]}', true, 4.8);

-- المنتجات
insert into public.products (id, name, description, brand, category, rating) values
  ('11111111-1111-1111-1111-111111111101', 'هاتف Samsung Galaxy A55', 'شاشة 6.6 بوصة AMOLED، كاميرا 50MP، بطارية 5000mAh', 'Samsung', 'phones', 4.6),
  ('11111111-1111-1111-1111-111111111102', 'هاتف Xiaomi Redmi Note 13', 'شاشة 6.67 بوصة، كاميرا 108MP، شحن سريع 67W', 'Xiaomi', 'phones', 4.4),
  ('11111111-1111-1111-1111-111111111103', 'حذاء رياضي Nike Air', 'حذاء جري مريح بنعل مرن', 'Nike', 'shoes', 4.7),
  ('11111111-1111-1111-1111-111111111104', 'حذاء كاجوال جلد طبيعي', 'حذاء رجالي أنيق من الجلد الطبيعي', 'Bata', 'shoes', 4.2),
  ('11111111-1111-1111-1111-111111111105', 'كريم ترطيب بالعسل', 'كريم مغذي للبشرة بمكونات طبيعية', 'Ducray', 'cosmetics', 4.5),
  ('11111111-1111-1111-1111-111111111106', 'عطر مسك الليل', 'عطر شرقي فاخر ثابت طوال اليوم', 'Al Haramain', 'cosmetics', 4.8),
  ('11111111-1111-1111-1111-111111111107', 'قميص قطني رجالي', 'قميص قطني 100% بمقاسات متعددة', 'Sindbad', 'clothes', 4.3),
  ('11111111-1111-1111-1111-111111111108', 'فستان سهرة نسائي', 'فستان أنيق بألوان راقية', 'Zara', 'clothes', 4.6),
  ('11111111-1111-1111-1111-111111111109', 'كبسولات قهوة اسبريسو (10)', 'كبسولات متوافقة مع Nespresso', 'Lavazza', 'capsules', 4.7),
  ('11111111-1111-1111-1111-111111111110', 'كبسولات قهوة محمصة محليًا', 'قهوة جزائرية محمصة طازجة، 10 كبسولات', 'Café Sahel', 'capsules', 4.9);

-- العروض (الأسعار بالدينار الجزائري)
insert into public.store_offers (store_id, product_id, price, old_price, stock_quantity, is_available, options) values
  ((select id from public.stores where slug = 'al-amana-electronics'), '11111111-1111-1111-1111-111111111101', 89900, 94900, 5, true, '{"colors":["أسود","أزرق"]}'),
  ((select id from public.stores where slug = 'al-amana-electronics'), '11111111-1111-1111-1111-111111111102', 54900, null, 8, true, '{"colors":["أسود","أبيض"]}'),
  ((select id from public.stores where slug = 'madina-sport'), '11111111-1111-1111-1111-111111111103', 15900, 18900, 12, true, '{"sizes":["40","41","42","43"]}'),
  ((select id from public.stores where slug = 'dar-al-anaka'), '11111111-1111-1111-1111-111111111104', 7900, null, 10, true, '{"sizes":["40","41","42","43","44"]}'),
  ((select id from public.stores where slug = 'jamalik-cosmetics'), '11111111-1111-1111-1111-111111111105', 2400, 2900, 20, true, '{}'),
  ((select id from public.stores where slug = 'jamalik-cosmetics'), '11111111-1111-1111-1111-111111111106', 5200, null, 6, true, '{}'),
  ((select id from public.stores where slug = 'dar-al-anaka'), '11111111-1111-1111-1111-111111111107', 3200, 3800, 15, true, '{"sizes":["S","M","L","XL"]}'),
  ((select id from public.stores where slug = 'dar-al-anaka'), '11111111-1111-1111-1111-111111111108', 8900, null, 4, true, '{"sizes":["M","L"]}'),
  ((select id from public.stores where slug = 'sabah-coffee'), '11111111-1111-1111-1111-111111111109', 1450, 1650, 30, true, '{}'),
  ((select id from public.stores where slug = 'sabah-coffee'), '11111111-1111-1111-1111-111111111110', 1200, null, 25, true, '{}');

-- الصور
insert into public.product_images (offer_id, image_url, is_primary) values
  ((select id from public.store_offers where product_id = '11111111-1111-1111-1111-111111111101'), 'https://picsum.photos/seed/phone1/600/600', true),
  ((select id from public.store_offers where product_id = '11111111-1111-1111-1111-111111111102'), 'https://picsum.photos/seed/phone2/600/600', true),
  ((select id from public.store_offers where product_id = '11111111-1111-1111-1111-111111111103'), 'https://picsum.photos/seed/shoe1/600/600', true),
  ((select id from public.store_offers where product_id = '11111111-1111-1111-1111-111111111104'), 'https://picsum.photos/seed/shoe2/600/600', true),
  ((select id from public.store_offers where product_id = '11111111-1111-1111-1111-111111111105'), 'https://picsum.photos/seed/cream/600/600', true),
  ((select id from public.store_offers where product_id = '11111111-1111-1111-1111-111111111106'), 'https://picsum.photos/seed/perfume/600/600', true),
  ((select id from public.store_offers where product_id = '11111111-1111-1111-1111-111111111107'), 'https://picsum.photos/seed/shirt/600/600', true),
  ((select id from public.store_offers where product_id = '11111111-1111-1111-1111-111111111108'), 'https://picsum.photos/seed/dress/600/600', true),
  ((select id from public.store_offers where product_id = '11111111-1111-1111-1111-111111111109'), 'https://picsum.photos/seed/caps1/600/600', true),
  ((select id from public.store_offers where product_id = '11111111-1111-1111-1111-111111111110'), 'https://picsum.photos/seed/caps2/600/600', true);