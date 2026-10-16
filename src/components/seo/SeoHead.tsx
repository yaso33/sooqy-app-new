import { useEffect, useState } from "react";

export interface SeoHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  keywords?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SITE_NAME = "SOOQY";
const DEFAULT_DESC = "SOOQY — سوق جزائري: شاهد السلعة قبل الخروج للبحث عنها. منتج، متجر، تصنيف، طلب وتتبع.";
const DEFAULT_OG = "/seo/og.svg";

function toAbsolute(base: string, path?: string) {
  if (!path) return undefined;
  try {
    const u = new URL(path, base);
    return u.toString();
  } catch {
    return path;
  }
}

export function SeoHead({
  title,
  description = DEFAULT_DESC,
  canonical,
  ogImage = DEFAULT_OG,
  ogType = "website",
  keywords,
  noindex = false,
  jsonLd,
}: SeoHeadProps) {
  const [path, setPath] = useState("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPath(window.location.pathname + window.location.search + window.location.hash);
    }
  }, []);

  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const base = "https://sooqy.app";
  const url = canonical ? toAbsolute(base, canonical) : toAbsolute(base, path) || base;
  const ogImgAbs = toAbsolute(base, ogImage) || base + DEFAULT_OG;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      {url ? <link rel="canonical" href={url} /> : null}
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />}
      <meta property="og:locale" content="ar_DZ" />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      {fullTitle ? <meta property="og:title" content={fullTitle} /> : null}
      {description ? <meta property="og:description" content={description} /> : null}
      {url ? <meta property="og:url" content={url} /> : null}
      {ogImgAbs ? <meta property="og:image" content={ogImgAbs} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      {fullTitle ? <meta name="twitter:title" content={fullTitle} /> : null}
      {description ? <meta name="twitter:description" content={description} /> : null}
      {ogImgAbs ? <meta name="twitter:image" content={ogImgAbs} /> : null}
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
    </>
  );
}
