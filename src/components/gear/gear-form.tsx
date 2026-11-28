"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { gearFormSchema, type GearFormInput } from "@/lib/validations";
import { api, ApiRequestError } from "@/lib/api";
import {
  ALLOWED_SPEC_KEYS,
  ALL_SPEC_KEYS,
  MAX_GEAR_IMAGES,
  MAX_GEAR_SPECS,
  MAX_SPEC_VALUE_LENGTH,
} from "@/lib/catalog-limits";
import { formatNumber, parseDigits } from "@/lib/format";

import type { GearItem, Category } from "@/types";

interface GearFormProps {
  initialGear?: GearItem;
}

function GearFormSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-surface-muted" />
            </div>

            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-surface-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-surface-muted" />
          </div>

          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-24 w-full animate-pulse rounded-md bg-surface-muted" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-surface-muted" />
            </div>

            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-surface-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
            <div className="h-9 w-24 animate-pulse rounded-md bg-surface-muted" />
          </div>

          <div className="h-10 w-full animate-pulse rounded-md bg-surface-muted" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
            <div className="h-9 w-24 animate-pulse rounded-md bg-surface-muted" />
          </div>

          <div className="grid grid-cols-[1fr_1fr_40px] gap-2">
            <div className="h-10 animate-pulse rounded-md bg-surface-muted" />
            <div className="h-10 animate-pulse rounded-md bg-surface-muted" />
            <div className="h-10 animate-pulse rounded-md bg-surface-muted" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <div className="h-10 w-20 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-10 w-28 animate-pulse rounded-md bg-surface-muted" />
      </div>
    </div>
  );
}

export function GearForm({ initialGear }: GearFormProps) {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Display value for the price field — digits are grouped in threes while the
  // form value stays a plain integer number of Rials for the API.
  const [priceDisplay, setPriceDisplay] = useState(() =>
    initialGear ? formatNumber(initialGear.pricePerDay) : "",
  );
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GearFormInput>({
    resolver: zodResolver(gearFormSchema),

    defaultValues: initialGear
      ? {
          title: initialGear.title,
          brand: initialGear.brand,
          categoryId: initialGear.categoryId,
          description: initialGear.description,
          pricePerDay: initialGear.pricePerDay,
          stock: initialGear.stock,
          images: initialGear.images?.length > 0 ? initialGear.images : [""],

          specs:
            initialGear.specs && Object.keys(initialGear.specs).length > 0
              ? Object.entries(initialGear.specs).map(([key, value]) => ({
                  key,
                  value: String(value),
                }))
              : [
                  {
                    key: "",
                    value: "",
                  },
                ],
        }
      : {
          title: "",
          brand: "",
          categoryId: "",
          description: "",
          pricePerDay: 0,
          stock: 1,
          images: [""],
          specs: [
            {
              key: "",
              value: "",
            },
          ],
        },
  });

  const {
    fields: specFields,
    append: appendSpec,
    remove: removeSpec,
  } = useFieldArray({
    control,
    name: "specs",
  });

  const images = watch("images") ?? [];
  const specValues = watch("specs") ?? [];
  const selectedCategory = watch("categoryId");

  // Specification keys depend on the selected category so providers can only
  // choose meaningful attributes for what they are listing (#50).
  const specKeyOptions = selectedCategory
    ? (() => {
        const category = categories.find((c) => c.id === selectedCategory);
        const bySlug = category ? ALLOWED_SPEC_KEYS[category.slug] : undefined;
        return bySlug && bySlug.length > 0 ? bySlug : ALL_SPEC_KEYS;
      })()
    : ALL_SPEC_KEYS;

  // ---------------------------------------------
  // Load categories
  // ---------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        setCategoryLoading(true);
        setCategoryError(null);

        // `/categories` is wrapped in the standard envelope
        // (`{ success, message, data }`), so the list lives on `.data`.
        const response = await api.get<{ data: Category[] }>("/categories", {
          auth: false,
        });

        if (!mounted) return;

        const categoryData = Array.isArray(response?.data) ? response.data : [];

        setCategories(categoryData);
      } catch (error) {
        if (!mounted) return;

        setCategories([]);

        setCategoryError(
          error instanceof ApiRequestError
            ? error.message
            : "بارگذاری دسته‌بندی‌ها ممکن نشد.",
        );
      } finally {
        if (mounted) {
          setCategoryLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  // ---------------------------------------------
  // Submit
  // ---------------------------------------------

  async function onSubmit(data: GearFormInput) {
    const specifications = Object.fromEntries(
      data.specs
        .filter(({ key, value }) => key.trim() !== "" || value.trim() !== "")
        .map(({ key, value }) => [key.trim(), value.trim()]),
    );

    const payload = {
      name: data.title.trim(),
      brand: data.brand.trim(),
      categoryId: data.categoryId,
      description: data.description.trim(),

      images: data.images.filter((image) => image.trim() !== ""),

      pricePerDay: Number(data.pricePerDay),
      stock: Number(data.stock),

      specifications,
    };

    try {
      if (initialGear) {
        await api.put(`/provider/gear/${initialGear.id}`, payload);

        toast.success("کالا با موفقیت به‌روزرسانی شد");
      } else {
        await api.post("/provider/gear", payload);

        toast.success("کالا به فهرست شما اضافه شد");
      }

      router.push("/dashboard/provider/gear");
      router.refresh();
    } catch (error) {
      setServerErrors(
        error instanceof ApiRequestError ? (error.errors ?? {}) : {},
      );
      toast.error(
        error instanceof ApiRequestError
          ? error.message
          : initialGear
            ? "به‌روزرسانی کالا ممکن نشد. دوباره تلاش کنید."
            : "افزودن کالا ممکن نشد. دوباره تلاش کنید.",
      );
    }
  }

  // ---------------------------------------------
  // Image helpers
  // ---------------------------------------------

  function updateImage(index: number, value: string) {
    const next = [...images];

    next[index] = value;

    setValue("images", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function addImage() {
    if (images.length >= MAX_GEAR_IMAGES) return;
    setValue("images", [...images, ""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function uploadImage(index: number, file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("فقط فایل تصویر می‌توانید آپلود کنید");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم تصویر باید کمتر از ۲ مگابایت باشد");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingIndex(index);
    try {
      // The API client always sets JSON headers, so uploads use fetch directly.
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/uploads/images`,
        { method: "POST", body: formData, credentials: "include" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "آپلود تصویر ممکن نشد");
      }
      updateImage(index, payload.data.url as string);
      toast.success("تصویر آپلود شد");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "آپلود تصویر ممکن نشد",
      );
    } finally {
      setUploadingIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    const next = images.filter((_, idx) => idx !== index);

    setValue("images", next.length > 0 ? next : [""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  // ---------------------------------------------
  // Loading state
  // ---------------------------------------------

  if (categoryLoading) {
    return <GearFormSkeleton />;
  }

  // ---------------------------------------------
  // Form
  // ---------------------------------------------

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Basic information */}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Title */}

            <div className="space-y-1.5">
              <Label htmlFor="title">عنوان</Label>

              <Input
                id="title"
                placeholder="مثلاً: پلی‌استیشن ۵"
                {...register("title")}
              />

              {errors.title && (
                <p className="text-xs text-danger">{errors.title.message}</p>
              )}
            </div>

            {/* Brand */}

            <div className="space-y-1.5">
              <Label htmlFor="brand">برند</Label>

              <Input
                id="brand"
                placeholder="مثلاً: Sony"
                {...register("brand")}
              />

              {errors.brand && (
                <p className="text-xs text-danger">{errors.brand.message}</p>
              )}
            </div>
          </div>

          {/* Category */}

          <div className="space-y-1.5">
            <Label htmlFor="categoryId">دسته‌بندی</Label>

            <Select
              value={selectedCategory || ""}
              onValueChange={(value) =>
                setValue("categoryId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="یک دسته‌بندی انتخاب کنید" />
              </SelectTrigger>

              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {categoryError && (
              <p className="text-xs text-danger">{categoryError}</p>
            )}

            {errors.categoryId && (
              <p className="text-xs text-danger">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Description */}

          <div className="space-y-1.5">
            <Label htmlFor="description">توضیحات</Label>

            <Textarea
              id="description"
              rows={4}
              placeholder="وضعیت، اقلام همراه و کاربرد مناسب را توضیح دهید..."
              {...register("description")}
            />

            {errors.description && (
              <p className="text-xs text-danger">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Price + Stock */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pricePerDay">قیمت هر روز (ریال)</Label>

              <Controller
                name="pricePerDay"
                control={control}
                render={({ field }) => (
                  <Input
                    id="pricePerDay"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    className="text-end"
                    placeholder="مثلاً: ۴٬۰۰۰٬۰۰۰"
                    value={priceDisplay}
                    onChange={(event) => {
                      const digits = parseDigits(event.target.value).slice(
                        0,
                        12,
                      );
                      setPriceDisplay(
                        digits ? formatNumber(Number(digits)) : "",
                      );
                      field.onChange(digits ? Number(digits) : NaN);
                    }}
                    onBlur={() => {
                      field.onBlur();
                      const digits = parseDigits(priceDisplay);
                      setPriceDisplay(
                        digits ? formatNumber(Number(digits)) : "",
                      );
                    }}
                  />
                )}
              />
              {errors.pricePerDay && (
                <p className="text-xs text-danger">
                  {errors.pricePerDay.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stock">موجودی / تعداد واحد</Label>

              <Input
                id="stock"
                type="number"
                min="1"
                step="1"
                {...register("stock", {
                  valueAsNumber: true,
                })}
              />

              {errors.stock && (
                <p className="text-xs text-danger">{errors.stock.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>آدرس تصاویر</Label>
              <p className="mt-0.5 text-xs text-muted">
                {images.length} از {MAX_GEAR_IMAGES} تصویر — لینک http(s) یا
                مسیر محلی /images/... مجاز است.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const target = Math.min(images.length - 1, 0);
                  void uploadImage(target, file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingIndex !== null}
              >
                {uploadingIndex !== null ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
                )}
                آپلود تصویر
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImage}
                disabled={images.length >= MAX_GEAR_IMAGES}
              >
                <Plus className="h-3.5 w-3.5" />
                افزودن لینک
              </Button>
            </div>
          </div>

          {images.map((image, index) => (
            <div key={index} className="space-y-1">
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg یا /images/gear/…"
                  dir="ltr"
                  value={image}
                  onChange={(event) => updateImage(index, event.target.value)}
                  aria-invalid={
                    !!errors.images?.[index] || !!serverErrors.images?.[index]
                  }
                />
                {images.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                )}
              </div>
              {errors.images?.[index] && (
                <p className="text-xs text-danger">
                  {errors.images[index]?.message}
                </p>
              )}
              {serverErrors.images?.[index] && (
                <p className="text-xs text-danger">
                  {serverErrors.images[index]}
                </p>
              )}
            </div>
          ))}

          {typeof errors.images?.message === "string" && (
            <p className="text-xs text-danger">{errors.images.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Specifications */}

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>مشخصات</Label>
              <p className="mt-0.5 text-xs text-muted">
                {specFields.length} از {MAX_GEAR_SPECS} مشخصه — فقط مشخصات مجاز
                مربوط به دسته انتخابی پذیرفته میشود.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={specFields.length >= MAX_GEAR_SPECS}
              onClick={() =>
                appendSpec({
                  key: "",
                  value: "",
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              افزودن مشخصه
            </Button>
          </div>

          {specFields.map((field, index) => (
            <div key={field.id} className="space-y-1">
              <div className="flex flex-wrap gap-2">
                <Select
                  value={specValues[index]?.key || ""}
                  onValueChange={(value) =>
                    setValue(`specs.${index}.key`, value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="انتخاب مشخصه" />
                  </SelectTrigger>
                  <SelectContent>
                    {specKeyOptions.map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  placeholder="مقدار (مثلاً دندهای)"
                  maxLength={MAX_SPEC_VALUE_LENGTH}
                  {...register(`specs.${index}.value`)}
                />

                {specFields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSpec(index)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                )}
              </div>
              {errors.specs?.[index]?.key && (
                <p className="text-xs text-danger">
                  {errors.specs[index]?.key?.message}
                </p>
              )}
              {errors.specs?.[index]?.value && (
                <p className="text-xs text-danger">
                  {errors.specs[index]?.value?.message}
                </p>
              )}
            </div>
          ))}
          {typeof errors.specs?.message === "string" && (
            <p className="text-xs text-danger">{errors.specs.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          انصراف
        </Button>

        <Button type="submit" loading={isSubmitting}>
          {initialGear ? "ذخیره تغییرات" : "افزودن کالا"}
        </Button>
      </div>
    </form>
  );
}
