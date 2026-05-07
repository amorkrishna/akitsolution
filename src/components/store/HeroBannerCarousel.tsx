import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroBannerCarouselProps {
  images: string[];
  isDark: boolean;
}

export function HeroBannerCarousel({ images, isDark }: HeroBannerCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center" },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  if (images.length === 0) return null;

  return (
    <div className="relative group/banner">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((url, i) => (
            <div key={i} className="min-w-0 flex-shrink-0 basis-full">
              <div className="relative w-full aspect-[21/5] sm:aspect-[21/4]">
                <img
                  src={url}
                  alt={`Banner ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                />
                <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-t from-[#080510]/60 to-transparent" : "bg-gradient-to-t from-white/40 to-transparent"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full flex items-center justify-center opacity-0 group-hover/banner:opacity-100 transition-all ${
              isDark ? "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md" : "bg-white/80 hover:bg-white text-gray-700 shadow-lg"
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full flex items-center justify-center opacity-0 group-hover/banner:opacity-100 transition-all ${
              isDark ? "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md" : "bg-white/80 hover:bg-white text-gray-700 shadow-lg"
            }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === selectedIndex
                  ? `w-6 ${isDark ? "bg-white" : "bg-primary"}`
                  : `w-2 ${isDark ? "bg-white/40" : "bg-black/30"}`
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
