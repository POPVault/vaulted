"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { credit, isSvg, plateNumber, type GalleryItem } from "./gallery-item";

type LightboxProps = {
  items: GalleryItem[];
  /** The item on screen. Kept while closed so the close animation has content. */
  index: number;
  open: boolean;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Called once the dialog has closed and released focus. */
  onReturnFocus: () => void;
};

const controlClass =
  "inline-flex size-12 items-center justify-center border border-cream/30 text-cream transition-colors hover:bg-cream/10 focus-visible:outline-gold disabled:opacity-40";

/** Full-screen image viewer on ink. Arrow keys move, Escape closes. */
export function Lightbox({ items, index, open, onIndexChange, onClose, onReturnFocus }: LightboxProps) {
  const current = items[index];
  const count = items.length;
  const many = count > 1;

  const step = (delta: number) => {
    if (!many) return;
    onIndexChange((index + delta + count) % count);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            step(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            step(-1);
          }
        }}
        className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 bg-ink p-0 text-cream ring-0 sm:max-w-none data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        {current ? (
          <>
            <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-5">
              <p className="tabular text-sm text-cream/75" aria-live="polite">
                {index + 1} of {count}
              </p>
              <DialogClose className={controlClass} aria-label="Close">
                <X className="size-5" aria-hidden="true" />
              </DialogClose>
            </div>

            <div className="relative min-h-0 flex-1 px-4 md:px-24">
              <div className="relative size-full">
                <Image
                  key={current.id}
                  src={current.image}
                  alt={current.caption || current.title}
                  fill
                  unoptimized={isSvg(current.image)}
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
              {many ? (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Previous photograph"
                    className={cn(controlClass, "absolute top-1/2 left-4 hidden -translate-y-1/2 bg-ink/60 md:inline-flex")}
                  >
                    <ChevronLeft className="size-6" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next photograph"
                    className={cn(controlClass, "absolute top-1/2 right-4 hidden -translate-y-1/2 bg-ink/60 md:inline-flex")}
                  >
                    <ChevronRight className="size-6" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>

            <div className="flex items-end justify-between gap-6 px-4 pt-5 pb-6 md:px-8 md:pb-8">
              <div className="flex max-w-[44em] min-w-0 flex-col gap-1">
                <p className="tabular text-sm font-semibold text-gold">No. {plateNumber(current.number)}</p>
                <DialogTitle className="font-serif text-[26px] leading-[1.15] font-medium text-cream md:text-[32px]">
                  {current.title}
                </DialogTitle>
                {credit(current) ? <p className="tabular text-[15px] text-cream/75">{credit(current)}</p> : null}
                <DialogDescription className="mt-1 line-clamp-4 text-[15px] text-cream/85 md:line-clamp-none">
                  {current.description || current.caption}
                </DialogDescription>
              </div>
              {many ? (
                <div className="flex shrink-0 gap-2 md:hidden">
                  <button type="button" onClick={() => step(-1)} aria-label="Previous photograph" className={controlClass}>
                    <ChevronLeft className="size-6" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => step(1)} aria-label="Next photograph" className={controlClass}>
                    <ChevronRight className="size-6" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
