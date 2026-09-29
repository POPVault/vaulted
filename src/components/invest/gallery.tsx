"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { credit, isSvg, plateNumber, type GalleryItem } from "./gallery-item";
import { Lightbox } from "./lightbox";

export function Gallery({ items }: { items: GalleryItem[] }) {
  // index survives closing so the lightbox keeps its content during the close animation.
  const [view, setView] = useState({ index: 0, open: false });
  const openAt = (index: number) => setView({ index, open: true });
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  if (items.length === 0) {
    return <p className="font-serif text-2xl text-cream/80">Photographs of the collection will appear here.</p>;
  }

  const [featured, ...rest] = items;

  return (
    <>
      <Plate
        item={featured}
        index={0}
        featured
        onOpen={openAt}
        buttonRef={(el) => {
          triggers.current[0] = el;
        }}
      />
      {rest.length > 0 ? (
        <ul className="mt-16 grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((item, i) => (
            <li key={item.id}>
              <Plate
                item={item}
                index={i + 1}
                onOpen={openAt}
                buttonRef={(el) => {
                  triggers.current[i + 1] = el;
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <Lightbox
        items={items}
        index={view.index}
        open={view.open}
        onIndexChange={openAt}
        onClose={() => setView((v) => ({ ...v, open: false }))}
        // Focus goes back to the plate that was last on screen, not the one first clicked.
        onReturnFocus={() => triggers.current[view.index]?.focus()}
      />
    </>
  );
}

type PlateProps = {
  item: GalleryItem;
  index: number;
  featured?: boolean;
  onOpen: (index: number) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
};

function Plate({ item, index, featured = false, onOpen, buttonRef }: PlateProps) {
  const caption = (
    <div className={cn("flex flex-col gap-1", featured && "lg:gap-3")}>
      <p className="tabular text-sm font-semibold text-gold">No. {plateNumber(item.number)}</p>
      <h3 className={cn("leading-[1.15] font-medium text-cream", featured ? "text-[32px] lg:text-[44px]" : "text-[26px]")}>
        {item.title}
      </h3>
      {credit(item) ? <p className="tabular text-[15px] text-cream/75">{credit(item)}</p> : null}
      {featured && item.caption ? <p className="mt-2 max-w-[30em] text-[15px] text-cream/75">{item.caption}</p> : null}
    </div>
  );

  return (
    <figure className={cn("m-0 flex flex-col gap-5", featured && "lg:grid lg:grid-cols-12 lg:items-end lg:gap-8")}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onOpen(index)}
        aria-label={`View ${item.title} full screen`}
        className={cn(
          "group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-green p-3 focus-visible:outline-gold md:p-4",
          featured && "lg:col-span-8",
        )}
      >
        <span className="relative block size-full">
          <Image
            src={item.image}
            alt=""
            fill
            unoptimized={isSvg(item.image)}
            priority={featured}
            sizes={featured ? "(min-width: 1024px) 800px, 100vw" : "(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"}
            className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.015] motion-reduce:transition-none"
          />
        </span>
      </button>
      <figcaption className={cn(featured && "lg:col-span-4 lg:pb-2")}>{caption}</figcaption>
    </figure>
  );
}
