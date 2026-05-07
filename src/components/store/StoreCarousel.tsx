import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface StoreCarouselProps {
  children: React.ReactNode[];
  isDark: boolean;
  slideClass?: string;
  autoplayDelay?: number;
  noAutoplay?: boolean;
}

export function StoreCarousel({ children, isDark, slideClass = "basis-1/2 sm:basis-1/3 lg:basis-1/4", autoplayDelay = 3000, noAutoplay = false }: StoreCarouselProps) {
  const plugins = noAutoplay ? [] : [Autoplay({ delay: autoplayDelay, stopOnInteraction: false, stopOnMouseEnter: true })];
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", slidesToScroll: 1 },
    plugins
  );

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => { emblaApi.off("select", onSelect); emblaApi.off("reInit", onSelect); };
  }, [emblaApi, onSelect]);

  if (children.length === 0) return null;

  // For noAutoplay carousels, always show arrows (not just on hover)
  const arrowVisibility = noAutoplay
    ? "opacity-70 hover:opacity-100"
    : "opacity-0 group-hover/carousel:opacity-100";

  return (
    <div className="relative group/carousel">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-2 sm:-ml-3">
          {children.map((child, i) => (
            <div key={i} className={`pl-2 sm:pl-3 min-w-0 flex-shrink-0 ${slideClass}`}>
              {child}
            </div>
          ))}
        </div>
      </div>
      
      {children.length > 2 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 sm:-translate-x-3 z-10 h-7 w-7 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shadow-lg transition-all ${arrowVisibility} ${
              isDark ? "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md" : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
            } ${!canScrollPrev ? "hidden" : ""}`}
          >
            <ChevronLeft className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 sm:translate-x-3 z-10 h-7 w-7 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shadow-lg transition-all ${arrowVisibility} ${
              isDark ? "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md" : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
            } ${!canScrollNext ? "hidden" : ""}`}
          >
            <ChevronRight className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </button>
        </>
      )}

      {/* Swipe hint - only on touch-only carousels, fades after first interaction */}
      {noAutoplay && children.length > 2 && (
        <div className={`flex items-center justify-center gap-1 mt-2 text-[9px] sm:hidden ${isDark ? "text-white/30" : "text-gray-400"}`}>
          <ChevronLeft className="h-2.5 w-2.5" />
          <span>Swipe</span>
          <ChevronRight className="h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );
}
