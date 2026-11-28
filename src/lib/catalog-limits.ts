/**
 * Shared catalog limits. The form shows these numbers in the UI and the Zod
 * schema enforces them, so providers always see the same rules the API applies.
 */
export const MAX_GEAR_IMAGES = 5;
export const MAX_GEAR_SPECS = 10;
export const MAX_SPEC_KEY_LENGTH = 60;
export const MAX_SPEC_VALUE_LENGTH = 200;

/** Allow-list of specification keys, grouped by the category slug they belong to. */
export const ALLOWED_SPEC_KEYS: Record<string, string[]> = {
  consoles: ["نسل", "نسخه", "حافظه", "دسته", "بازی همراه", "اشتراک", "رزولوشن"],
  bikes: [
    "مدل",
    "جنس بدنه",
    "سایز چرخ",
    "سایز",
    "دنده",
    "ترمز",
    "وزن",
    "سبد حمل بار",
    "قفل و چراغ",
    "برند",
  ],
  cameras: [
    "حسگر",
    "لنز",
    "رزولوشن",
    "لرزشگیر",
    "فیلمبرداری",
    "کارت حافظه",
    "باتری همراه",
    "ضدآب",
    "لوازم جانبی",
  ],
  laptops: ["پردازنده", "رم", "حافظه", "نمایشگر", "گرافیک", "شارژدهی"],
  sports: ["سطح", "تعداد راکت", "توپ همراه", "کیف حمل", "برند"],
};

/** Flat list used when the category is not (yet) known. */
export const ALL_SPEC_KEYS = Array.from(
  new Set(Object.values(ALLOWED_SPEC_KEYS).flat()),
);

/**
 * Image URLs may be absolute http(s) links or local paths served by the app
 * (e.g. `/images/gear/canon.jpg`). Anything else is rejected with a clear,
 * field-specific message.
 */
const IMAGE_URL_PATTERN = /^(https?:\/\/\S+|(\/)[^\s]*)$/i;

export function isValidImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return false;
  if (!IMAGE_URL_PATTERN.test(trimmed)) return false;
  if (trimmed.startsWith("http")) {
    try {
      const url = new URL(trimmed);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
  return true;
}
