import { useState } from "react";
import { ImageSearchBadge, ImageSearchButton } from "./ImageSearch";
import type { VisualProfile } from "@/lib/image-search";

type Props = {
  /** يُستدعى مع البصمة أو null عند الإزالة */
  onChange: (profile: VisualProfile | null) => void;
};

/** صف البحث بالصور: زر اختيار الصورة وشارة النتائج، في مكوّن واحد
 *  حتى يبقى ملف الصفحة خفيفًا. */
export function ImageSearchRow({ onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ImageSearchButton
        onSearch={(profile, previewUrl) => {
          setPreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return previewUrl;
          });
          onChange(profile);
        }}
      />
      {preview && (
        <ImageSearchBadge
          previewUrl={preview}
          onClear={() => {
            URL.revokeObjectURL(preview);
            setPreview(null);
            onChange(null);
          }}
        />
      )}
    </div>
  );
}