-- التوثيق التلقائي: أي تاجر يفتح متجرًا يكون موثقًا فورًا (لا موافقة إدارية)
-- فتح المتجر اختياري — المستخدم يبقى زبونًا عاديًا ما لم يفتح متجرًا بنفسه.

-- المتاجر الجديدة تُنشأ موثقة تلقائيًا
alter table public.stores alter column is_verified set default true;

-- السماح للتاجر بإنشاء متجر موثق مباشرة (بدلًا من فرض is_verified = false)
drop policy "Merchants create own store" on public.stores;
create policy "Merchants create own store" on public.stores
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.has_role(auth.uid(), 'merchant')
    and is_verified = true
  );

-- المحلات القائمة (منها التجريبية) تصبح موثقة
update public.stores set is_verified = true where not is_verified;