"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Pin, Image as ImageIcon, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export interface ImageUploaderItem {
  /** معرف الصورة في قاعدة البيانات (للصور الموجودة من الخادم) */
  id?: string;
  file: File;
  preview: string;
  isPrimary: boolean;
}

export interface ImageUploaderProps {
  /** الصور الحالية (للتعديل) — تحتوي على file للصور الجديدة، وpreview للصور الموجودة */
  initialItems?: ImageUploaderItem[];
  /** الحد الأقصى للصور */
  maxFiles?: number;
  /** دالة استدعاء عند تغيير القائمة */
  onChange: (items: ImageUploaderItem[]) => void;
  /** نص الزر */
  label?: string;
  /** هل الصور مطلوبة */
  required?: boolean;
  /** clase CSS للحاوية */
  className?: string;
  /** عند حذف صورة موجودة من الخادم (تُستدعى قبل الإزالة من الواجهة) */
  onRemove?: (item: ImageUploaderItem) => Promise<void>;
  /** عند تحديد صورة موجودة كأساسية في الخادم (تُستدعى قبل التحديث في الواجهة) */
  onSetPrimary?: (item: ImageUploaderItem) => Promise<void>;
}

export function ImageUploader({
  initialItems = [],
  maxFiles = MAX_FILES,
  onChange,
  label = "إضافة صور المنتج",
  required = false,
  className,
}: ImageUploaderProps) {
  const [items, setItems] = useState<ImageUploaderItem[]>(initialItems);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = useMemo(() => maxFiles - items.length, [items.length, maxFiles]);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const files = Array.from(fileList).filter((f) => ACCEPTED_TYPES.includes(f.type));
      if (files.length === 0) return;

      const availableSlots = maxFiles - items.length;
      const toAdd = files.slice(0, availableSlots);
      if (toAdd.length === 0) {
        return;
      }

      const hasPrimary = items.some((i) => i.isPrimary);
      const newItems = toAdd.map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
        isPrimary: !hasPrimary && items.length === 0 && newItems.indexOf(f) === 0,
      }));

      setItems((prev) => [...prev, ...newItems]);
      onChange([...items, ...newItems]);

      // إعادة تعيين input لإعادة اختيار نفس الملفات لاحقاً
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [items, maxFiles, onChange],
  );

  const removeItem = useCallback(
    async (index: number) => {
      const removed = items[index];
      // إذا كانت صورة موجودة من الخادم، احذفها من الخادم أولاً
      if (removed && !removed.file && onRemove) {
        try {
          await onRemove(removed);
        } catch {
          toast.error("تعذر حذف الصورة من الخادم.");
          return;
        }
      }

      setItems((prev) => {
        const next = prev.filter((_, i) => i !== index);
        // إذا حُذفت الصورة الأساسية، اجعل أول صورة متبقية أساسية
        if (next.length > 0 && !next.some((i) => i.isPrimary)) {
          next[0].isPrimary = true;
        }
        // إلغاء كائنات URL المحذوفة لتحرير الذاكرة
        const removedItem = prev[index];
        if (removedItem && removedItem.file) {
          URL.revokeObjectURL(removedItem.preview);
        }
        onChange(next);
        return next;
      });
    },
    [items, onRemove, onChange],
  );

  const setPrimary = useCallback(
    async (index: number) => {
      const item = items[index];
      // إذا كانت صورة موجودة من الخادم، حددها أساسية في الخادم أولاً
      if (item && !item.file && onSetPrimary) {
        try {
          await onSetPrimary(item);
        } catch {
          toast.error("تعذر تحديد الصورة الأساسية في الخادم.");
          return;
        }
      }

      setItems((prev) => {
        const next = [...prev];
        next.forEach((i) => (i.isPrimary = false));
        next[index].isPrimary = true;
        onChange(next);
        return next;
      });
    },
    [items, onSetPrimary, onChange],
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const isOverLimit = items.length >= maxFiles;

  return (
    <div className={cn("space-y-3", className)}>
      {/* منطقة الإدراج / السحب */}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-neutral-50/50 p-4 text-center transition hover:border-primary hover:bg-primary-50",
          isOverLimit ? "opacity-60 pointer-events-none" : "",
        )}
        onClick={triggerFileInput}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && triggerFileInput()}
        aria-label={label}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
          aria-hidden="true"
        />
        <Plus className="size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          حتى {maxFiles} صورة · JPG, PNG, WEBP · حتى 10 ميغابايت للصورة
        </p>
      </div>

      {/* معرض الصور المختارة */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <div
                key={index}
                className="relative group rounded-xl overflow-hidden border border-border bg-neutral-100 aspect-square"
              >
                <img
                  src={item.preview}
                  alt={`صورة المنتج ${index + 1}`}
                  className="size-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNlMmU4ZjAiLz48cGF0aCBkPSJNMTUwIDEwMGMwIDI3LjYtMjIuNCA1MC01MCA1MHMtNTAtMjIuNC01MC01MCAyMi40LTUwIDUwLTUwIDUwIDIyLjQgNTAgNTAgNTB6bTAgMTgwYzcyLjYgMCAxMzAtNTkuNCAxMzAtMTMwUzE3Mi42IDUwIDEwMCA1MHoiIHN0cm9rZT0iIzYzNjZmMSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9zdmc+";
                  }}
                />
                {/* شارة الصورة الأساسية */}
                {item.isPrimary && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                    <Pin className="size-3" /> أساسي
                  </div>
                )}
                {/* زر الحذف */}
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  aria-label="حذف الصورة"
                  className="absolute top-2 right-2 size-7 shrink-0 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                >
                  <Trash2 className="size-4" />
                </button>
                {/* زر تحديد أساسي */}
                {!item.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(index)}
                    aria-label="تحديد كأساسية"
                    className="absolute bottom-2 left-2 size-7 shrink-0 rounded-full bg-white/90 p-1 text-foreground transition hover:bg-white"
                  >
                    <Pin className="size-4 text-primary" />
                  </button>
                )}
                {/* مؤشر حد الصور */}
                {isLast && remaining <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <span className="text-xs font-bold text-white">الحد الأقصى</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {required && items.length === 0 && (
        <p className="text-xs text-danger">الصور مطلوبة</p>
      )}
    </div>
  );
}
