## SEO

- مكون `src/components/seo/SeoHead.tsx` يُستخدم في كل route لـ meta tags, Open Graph, Twitter Card, JSON-LD (Organization/WebSite/Product/Breadcrumb).
- Sitemap: `public/sitemap.xml` — يُ Serve من dist/client.
- robots.txt: `public/robots.txt` — يُ Serve من dist/client.
- OG image: `public/seo/og.svg` (default).
- canonical: يُستخدم window.location.origin كـ base.
- vercel.json: rewrite لـ /sitemap.xml و /robots.txt و /seo/*.
- build: `npm run build` (terser installed).

## إدارة الصور المتعددة (Product Images)

- جدول `product_images` يدعم صور متعددة لكل عرض (`offer_id`, `image_url`, `is_primary`).
- `src/components/sooqy/image-uploader.tsx` — مكون رفع صور متعددة مع معاينة، حذف، تحديد أساسي، وحد 10 صور.
- `src/lib/sooqy.ts` — دوال API: `merchantQuickAddProduct` (يقبل `File[]`)، `merchantAddOfferImages(offerId, files)`، `merchantRemoveOfferImage(imageId)`، `merchantSetPrimaryImage(imageId)`.
- `src/routes/studio.index.tsx` — زر "إدارة الصور" في بطاقة كل منتج يفتح نافذة إدارة الصور مع `ImageUploader` مرتبط بدوال API للحذف وتحديد الأساس وإضافة صور جديدة.