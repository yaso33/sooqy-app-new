
-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('customer', 'merchant', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ===== Wilayas =====
CREATE TABLE public.wilayas (
  id int PRIMARY KEY,
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  home_price int NOT NULL,
  desk_price int NOT NULL
);
GRANT SELECT ON public.wilayas TO anon, authenticated;
GRANT ALL ON public.wilayas TO service_role;
ALTER TABLE public.wilayas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wilayas are public" ON public.wilayas FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.wilayas (id, name_ar, name_fr, home_price, desk_price)
SELECT v.id, v.ar, v.fr,
  CASE WHEN v.id = 16 THEN 400
       WHEN v.id IN (11,33,37,50,54,56) THEN 1600
       WHEN v.id IN (1,8,30,39,47,49,52,53,55,57,58) THEN 1100
       WHEN v.id IN (3,7,17,32,45,51) THEN 850
       ELSE 650 END,
  CASE WHEN v.id = 16 THEN 250
       WHEN v.id IN (11,33,37,50,54,56) THEN 1000
       WHEN v.id IN (1,8,30,39,47,49,52,53,55,57,58) THEN 700
       WHEN v.id IN (3,7,17,32,45,51) THEN 550
       ELSE 400 END
FROM (VALUES
 (1,'أدرار','Adrar'),(2,'الشلف','Chlef'),(3,'الأغواط','Laghouat'),(4,'أم البواقي','Oum El Bouaghi'),
 (5,'باتنة','Batna'),(6,'بجاية','Béjaïa'),(7,'بسكرة','Biskra'),(8,'بشار','Béchar'),
 (9,'البليدة','Blida'),(10,'البويرة','Bouira'),(11,'تمنراست','Tamanrasset'),(12,'تبسة','Tébessa'),
 (13,'تلمسان','Tlemcen'),(14,'تيارت','Tiaret'),(15,'تيزي وزو','Tizi Ouzou'),(16,'الجزائر','Alger'),
 (17,'الجلفة','Djelfa'),(18,'جيجل','Jijel'),(19,'سطيف','Sétif'),(20,'سعيدة','Saïda'),
 (21,'سكيكدة','Skikda'),(22,'سيدي بلعباس','Sidi Bel Abbès'),(23,'عنابة','Annaba'),(24,'قالمة','Guelma'),
 (25,'قسنطينة','Constantine'),(26,'المدية','Médéa'),(27,'مستغانم','Mostaganem'),(28,'المسيلة','M''Sila'),
 (29,'معسكر','Mascara'),(30,'ورقلة','Ouargla'),(31,'وهران','Oran'),(32,'البيض','El Bayadh'),
 (33,'إليزي','Illizi'),(34,'برج بوعريريج','Bordj Bou Arréridj'),(35,'بومرداس','Boumerdès'),(36,'الطارف','El Tarf'),
 (37,'تندوف','Tindouf'),(38,'تيسمسيلت','Tissemsilt'),(39,'الوادي','El Oued'),(40,'خنشلة','Khenchela'),
 (41,'سوق أهراس','Souk Ahras'),(42,'تيبازة','Tipaza'),(43,'ميلة','Mila'),(44,'عين الدفلى','Aïn Defla'),
 (45,'النعامة','Naâma'),(46,'عين تموشنت','Aïn Témouchent'),(47,'غرداية','Ghardaïa'),(48,'غليزان','Relizane'),
 (49,'تيميمون','Timimoun'),(50,'برج باجي مختار','Bordj Badji Mokhtar'),(51,'أولاد جلال','Ouled Djellal'),(52,'بني عباس','Béni Abbès'),
 (53,'عين صالح','In Salah'),(54,'عين قزام','In Guezzam'),(55,'تقرت','Touggourt'),(56,'جانت','Djanet'),
 (57,'المغير','El M''Ghair'),(58,'المنيعة','El Meniaa')
) AS v(id, ar, fr);

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  wilaya_id int REFERENCES public.wilayas(id),
  commune text,
  is_phone_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND is_phone_verified = false);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.become_merchant()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'merchant') ON CONFLICT DO NOTHING;
END $$;

-- ===== Stores =====
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  phone text,
  whatsapp text,
  wilaya_id int NOT NULL REFERENCES public.wilayas(id),
  commune text,
  address_line text,
  latitude double precision,
  longitude double precision,
  opening_hours jsonb NOT NULL DEFAULT '{"open":"09:00","close":"20:00","closed_days":[5]}'::jsonb,
  logo_url text,
  cover_url text,
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stores public read" ON public.stores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Merchants create own store" ON public.stores FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'merchant') AND is_verified = false);
CREATE POLICY "Owners update store" ON public.stores FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete store" ON public.stores FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- prevent self-verification
CREATE OR REPLACE FUNCTION public.protect_store_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified AND NOT public.has_role(auth.uid(), 'admin') AND auth.uid() IS NOT NULL THEN
    NEW.is_verified := OLD.is_verified;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER stores_protect_verify BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.protect_store_verification();

CREATE OR REPLACE FUNCTION public.is_store_owner(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = auth.uid())
$$;

-- ===== Products =====
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  brand text,
  category text NOT NULL DEFAULT 'other',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products public read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Merchants add products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'merchant'));
CREATE POLICY "Creators update products" ON public.products FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- ===== Store offers =====
CREATE TABLE public.store_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price int NOT NULL CHECK (price >= 0),
  old_price int,
  stock_quantity int NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_available boolean NOT NULL DEFAULT true,
  last_confirmed_at timestamptz NOT NULL DEFAULT now(),
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id)
);
GRANT SELECT ON public.store_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_offers TO authenticated;
GRANT ALL ON public.store_offers TO service_role;
ALTER TABLE public.store_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Offers public read" ON public.store_offers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners insert offers" ON public.store_offers FOR INSERT TO authenticated WITH CHECK (public.is_store_owner(store_id));
CREATE POLICY "Owners update offers" ON public.store_offers FOR UPDATE TO authenticated USING (public.is_store_owner(store_id)) WITH CHECK (public.is_store_owner(store_id));
CREATE POLICY "Owners delete offers" ON public.store_offers FOR DELETE TO authenticated USING (public.is_store_owner(store_id));

CREATE OR REPLACE FUNCTION public.is_offer_owner(_offer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.store_offers o JOIN public.stores s ON s.id = o.store_id WHERE o.id = _offer_id AND s.owner_id = auth.uid())
$$;

-- ===== Product images =====
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.store_offers(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Images public read" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage images" ON public.product_images FOR ALL TO authenticated USING (public.is_offer_owner(offer_id)) WITH CHECK (public.is_offer_owner(offer_id));

-- ===== Reservations =====
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.store_offers(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','collected','cancelled','expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reservations" ON public.reservations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_store_owner(store_id));

CREATE OR REPLACE FUNCTION public.create_reservation(_offer_id uuid, _quantity int DEFAULT 1, _hours int DEFAULT 3, _options jsonb DEFAULT '{}'::jsonb)
RETURNS public.reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.store_offers; r public.reservations; c text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _quantity < 1 OR _quantity > 10 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  IF _hours < 1 OR _hours > 24 THEN _hours := 3; END IF;
  SELECT * INTO o FROM public.store_offers WHERE id = _offer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'offer_not_found'; END IF;
  IF NOT o.is_available OR o.stock_quantity < _quantity THEN RAISE EXCEPTION 'out_of_stock'; END IF;
  LOOP
    c := 'SQ-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reservations WHERE code = c);
  END LOOP;
  UPDATE public.store_offers SET stock_quantity = stock_quantity - _quantity,
    is_available = (stock_quantity - _quantity) > 0 WHERE id = _offer_id;
  INSERT INTO public.reservations (code, user_id, store_id, offer_id, quantity, options, expires_at)
  VALUES (c, auth.uid(), o.store_id, o.id, _quantity, COALESCE(_options,'{}'::jsonb), now() + make_interval(hours => _hours))
  RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_reservation(_reservation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reservations;
BEGIN
  SELECT * INTO r FROM public.reservations WHERE id = _reservation_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pending' THEN RAISE EXCEPTION 'not_cancellable'; END IF;
  UPDATE public.reservations SET status = 'cancelled' WHERE id = r.id;
  UPDATE public.store_offers SET stock_quantity = stock_quantity + r.quantity, is_available = true WHERE id = r.offer_id;
END $$;

CREATE OR REPLACE FUNCTION public.merchant_confirm_reservation(_code text)
RETURNS public.reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reservations;
BEGIN
  SELECT * INTO r FROM public.reservations WHERE code = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND OR NOT public.is_store_owner(r.store_id) THEN RAISE EXCEPTION 'reservation_not_found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'reservation_%', r.status; END IF;
  IF r.expires_at < now() THEN
    UPDATE public.reservations SET status = 'expired' WHERE id = r.id;
    UPDATE public.store_offers SET stock_quantity = stock_quantity + r.quantity, is_available = true WHERE id = r.offer_id;
    RAISE EXCEPTION 'reservation_expired';
  END IF;
  UPDATE public.reservations SET status = 'collected' WHERE id = r.id RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.merchant_confirm_all_stock(_store_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.is_store_owner(_store_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.store_offers SET last_confirmed_at = now() WHERE store_id = _store_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ===== Orders =====
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  wilaya_id int NOT NULL REFERENCES public.wilayas(id),
  commune text NOT NULL,
  address_line text,
  delivery_type text NOT NULL CHECK (delivery_type IN ('home','desk')),
  payment_method text NOT NULL CHECK (payment_method IN ('cod','baridimob')),
  receipt_url text,
  subtotal int NOT NULL,
  shipping_fee int NOT NULL,
  total int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.store_offers(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  unit_price int NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  options jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_order_merchant(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.order_items i JOIN public.stores s ON s.id = i.store_id WHERE i.order_id = _order_id AND s.owner_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_order_owner(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND user_id = auth.uid())
$$;

CREATE POLICY "Order read" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_order_merchant(id));
CREATE POLICY "Merchant updates order" ON public.orders FOR UPDATE TO authenticated USING (public.is_order_merchant(id)) WITH CHECK (public.is_order_merchant(id));
CREATE POLICY "Order items read" ON public.order_items FOR SELECT TO authenticated USING (public.is_order_owner(order_id) OR public.is_store_owner(store_id));

CREATE OR REPLACE FUNCTION public.create_order(
  _items jsonb, _delivery_type text, _wilaya_id int, _commune text, _address_line text,
  _full_name text, _phone text, _payment_method text, _receipt_url text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it jsonb; o public.store_offers; pname text; q int; sub int := 0; fee int; oid uuid; w public.wilayas;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'empty_bag'; END IF;
  IF _payment_method = 'baridimob' AND (_receipt_url IS NULL OR _receipt_url = '') THEN RAISE EXCEPTION 'receipt_required'; END IF;
  SELECT * INTO w FROM public.wilayas WHERE id = _wilaya_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_wilaya'; END IF;
  fee := CASE WHEN _delivery_type = 'home' THEN w.home_price ELSE w.desk_price END;
  INSERT INTO public.orders (user_id, full_name, phone, wilaya_id, commune, address_line, delivery_type, payment_method, receipt_url, subtotal, shipping_fee, total)
  VALUES (auth.uid(), _full_name, _phone, _wilaya_id, _commune, _address_line, _delivery_type, _payment_method, _receipt_url, 0, fee, 0)
  RETURNING id INTO oid;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    q := (it->>'quantity')::int;
    IF q IS NULL OR q < 1 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
    SELECT * INTO o FROM public.store_offers WHERE id = (it->>'offer_id')::uuid FOR UPDATE;
    IF NOT FOUND OR NOT o.is_available OR o.stock_quantity < q THEN RAISE EXCEPTION 'out_of_stock'; END IF;
    SELECT name INTO pname FROM public.products WHERE id = o.product_id;
    INSERT INTO public.order_items (order_id, offer_id, store_id, product_name, unit_price, quantity, options)
    VALUES (oid, o.id, o.store_id, pname, o.price, q, COALESCE(it->'options','{}'::jsonb));
    UPDATE public.store_offers SET stock_quantity = stock_quantity - q, is_available = (stock_quantity - q) > 0 WHERE id = o.id;
    sub := sub + o.price * q;
  END LOOP;
  UPDATE public.orders SET subtotal = sub, total = sub + fee WHERE id = oid;
  RETURN oid;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_reservation(uuid,int,int,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_order(jsonb,text,int,text,text,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.become_merchant() FROM anon;

-- ===== Storage policies =====
CREATE POLICY "Media public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('store-media','product-media'));
CREATE POLICY "Media owner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('store-media','product-media','receipts') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Media owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('store-media','product-media') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Media owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('store-media','product-media','receipts') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Receipts owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ===== Demo seed =====
INSERT INTO public.stores (id, name, slug, description, phone, whatsapp, wilaya_id, commune, address_line, latitude, longitude, opening_hours, cover_url, rating, is_verified) VALUES
('11111111-0000-0000-0000-000000000001','Bab Ezzouar Sneakers','bab-ezzouar-sneakers','أحذية رياضية أصلية ومقاسات كاملة','0550123401','213550123401',16,'باب الزوار','المركز التجاري، الطابق الأول',36.7213,3.1830,'{"open":"09:00","close":"21:00","closed_days":[]}','https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',4.7,true),
('11111111-0000-0000-0000-000000000002','Hydra Mobile','hydra-mobile','هواتف وإكسسوارات مع ضمان','0661223402','213661223402',16,'حيدرة','شارع سويداني بوجمعة',36.7430,3.0430,'{"open":"10:00","close":"20:00","closed_days":[5]}','https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200',4.5,true),
('11111111-0000-0000-0000-000000000003','Oran Beauty Corner','oran-beauty-corner','كوزميتيك وعطور أصلية','0770333403','213770333403',31,'وهران','شارع العربي بن مهيدي',35.6971,-0.6337,'{"open":"09:30","close":"19:30","closed_days":[5]}','https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200',4.8,true),
('11111111-0000-0000-0000-000000000004','Constantine Style','constantine-style','ملابس رجالية ونسائية','0555444404','213555444404',25,'قسنطينة','نهج عبان رمضان',36.3650,6.6147,'{"open":"09:00","close":"20:00","closed_days":[]}','https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200',4.4,true),
('11111111-0000-0000-0000-000000000005','Didouche Café Shop','didouche-cafe-shop','كبسولات قهوة وآلات','0699555405','213699555405',16,'الجزائر الوسطى','شارع ديدوش مراد',36.7680,3.0520,'{"open":"08:00","close":"22:00","closed_days":[]}','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200',4.6,false);

INSERT INTO public.products (id, name, description, brand, category) VALUES
('22222222-0000-0000-0000-000000000001','Nike Air Max 90','حذاء رياضي كلاسيكي مريح للاستعمال اليومي','Nike','shoes'),
('22222222-0000-0000-0000-000000000002','Adidas Samba OG','الحذاء الأيقوني بجلد طبيعي','Adidas','shoes'),
('22222222-0000-0000-0000-000000000003','Samsung Galaxy A55','شاشة 6.6 بوصة، 128GB، بطارية 5000mAh','Samsung','phones'),
('22222222-0000-0000-0000-000000000004','iPhone 15 128GB','نسخة دولية مع ضمان المحل','Apple','phones'),
('22222222-0000-0000-0000-000000000005','Sony WH-1000XM5','سماعة لاسلكية بعزل ضوضاء','Sony','phones'),
('22222222-0000-0000-0000-000000000006','عطر Sauvage 100ml','عطر رجالي أصلي','Dior','cosmetics'),
('22222222-0000-0000-0000-000000000007','سيروم فيتامين C','عناية بالبشرة 30ml','The Ordinary','cosmetics'),
('22222222-0000-0000-0000-000000000008','جاكيت جلد رجالي','جلد صناعي عالي الجودة','Local','clothes'),
('22222222-0000-0000-0000-000000000009','تيشيرت قطن أساسي','قطن 100% بألوان متعددة','Local','clothes'),
('22222222-0000-0000-0000-000000000010','كبسولات Nespresso Intenso ×10','متوافقة مع آلات Nespresso','Nespresso','capsules');

INSERT INTO public.store_offers (id, store_id, product_id, price, old_price, stock_quantity, is_available, options) VALUES
('33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',18500,22000,12,true,'{"sizes":["40","41","42","43","44"],"colors":["أبيض","أسود"]}'),
('33333333-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000001',17900,NULL,3,true,'{"sizes":["41","42","43"],"colors":["أبيض"]}'),
('33333333-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002',16000,NULL,0,false,'{"sizes":["39","40","41","42"],"colors":["أبيض/أسود"]}'),
('33333333-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000002',15500,17000,6,true,'{"sizes":["40","41","42"],"colors":["أبيض/أسود","أخضر"]}'),
('33333333-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003',62000,68000,8,true,'{"colors":["أزرق","أسود"]}'),
('33333333-0000-0000-0000-000000000006','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000004',165000,NULL,2,true,'{"colors":["أسود","وردي"]}'),
('33333333-0000-0000-0000-000000000007','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000005',58000,NULL,5,true,'{"colors":["أسود","فضي"]}'),
('33333333-0000-0000-0000-000000000008','11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000006',24500,27000,4,true,'{}'),
('33333333-0000-0000-0000-000000000009','11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000007',3200,NULL,25,true,'{}'),
('33333333-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000008',9800,12500,7,true,'{"sizes":["M","L","XL"],"colors":["أسود","بني"]}'),
('33333333-0000-0000-0000-000000000011','11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000009',1500,NULL,40,true,'{"sizes":["S","M","L","XL"],"colors":["أبيض","أسود","رمادي"]}'),
('33333333-0000-0000-0000-000000000012','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000010',1200,NULL,60,true,'{}'),
('33333333-0000-0000-0000-000000000013','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000010',1350,NULL,2,true,'{}');

INSERT INTO public.product_images (offer_id, image_url, is_primary) VALUES
('33333333-0000-0000-0000-000000000001','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900',true),
('33333333-0000-0000-0000-000000000002','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900',true),
('33333333-0000-0000-0000-000000000003','https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900',true),
('33333333-0000-0000-0000-000000000004','https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900',true),
('33333333-0000-0000-0000-000000000005','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900',true),
('33333333-0000-0000-0000-000000000006','https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=900',true),
('33333333-0000-0000-0000-000000000007','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900',true),
('33333333-0000-0000-0000-000000000008','https://images.unsplash.com/photo-1541643600914-78b084683601?w=900',true),
('33333333-0000-0000-0000-000000000009','https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900',true),
('33333333-0000-0000-0000-000000000010','https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900',true),
('33333333-0000-0000-0000-000000000011','https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900',true),
('33333333-0000-0000-0000-000000000012','https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=900',true),
('33333333-0000-0000-0000-000000000013','https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=900',true);
