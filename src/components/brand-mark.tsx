import { cn } from "@/lib/utils";

/**
 * Rentino brand mark — a monogram "R" in a rounded tile.
 *
 * The previous mark was a camera aperture, left over from the project's old
 * name; it has been replaced so no trace of that branding remains.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("h-6 w-6", className)}
    >
      <rect
        x="1.4"
        y="1.4"
        width="29.2"
        height="29.2"
        rx="9"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path
        d="M11.6 23V9h5.6a4.4 4.4 0 0 1 0 8.8h-5.6"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.4 17.8 22 23"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
