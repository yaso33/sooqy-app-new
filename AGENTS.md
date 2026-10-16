## SEO

- مكون `src/components/seo/SeoHead.tsx` يُستخدم في كل route لـ meta tags, Open Graph, Twitter Card, JSON-LD (Organization/WebSite/Product/Breadcrumb).
- Sitemap: `public/sitemap.xml` — يُ Serve من dist/client.
- robots.txt: `public/robots.txt` — يُ Serve من dist/client.
- OG image: `public/seo/og.svg` (default).
- canonical: يُستخدم window.location.origin كـ base.
- vercel.json: rewrite لـ /sitemap.xml و /robots.txt و /seo/*.
- build: `npm run build` (terser installed).