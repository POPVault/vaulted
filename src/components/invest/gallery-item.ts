import type { Item } from "@/db/schema";

export type GalleryItem = Pick<Item, "id" | "number" | "title" | "photographer" | "year" | "description" | "image" | "caption">;

export function plateNumber(n: number): string {
  return String(n).padStart(2, "0");
}

/** "Photographer, 1968" without dangling separators when one part is missing. */
export function credit(item: Pick<GalleryItem, "photographer" | "year">): string {
  return [item.photographer, item.year].filter(Boolean).join(", ");
}

/** SVG placeholders cannot go through the image optimizer. */
export function isSvg(src: string): boolean {
  return /\.svg(\?.*)?$/i.test(src);
}
