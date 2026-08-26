import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { X } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import heroImg from "@/assets/hero-salon.jpg";
import hairImg from "@/assets/g-hair.jpg";
import spaImg from "@/assets/g-spa.jpg";
import bridalImg from "@/assets/g-bridal.jpg";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery | Ozone Plus Unisex Salon & Spa, New Sangavi" },
      {
        name: "description",
        content:
          "See our work — hair transformations, bridal makeup, facials, nails, spa rooms and salon interiors at Ozone Plus, New Sangavi, Pimpri-Chinchwad.",
      },
      { property: "og:title", content: "Gallery — Ozone Plus Unisex Salon & Spa" },
      { property: "og:description", content: "Hair, bridal, spa, facial and interior photos from our New Sangavi studio." },
    ],
  }),
  component: GalleryPage,
});

const CATS = ["All", "Hair", "Spa", "Bridal", "Facials", "Interior"] as const;

const ITEMS = [
  { src: hairImg, alt: "Glossy blow-dry finish on long layered hair", cat: "Hair" },
  { src: spaImg, alt: "Relaxing candlelit spa massage room", cat: "Spa" },
  { src: bridalImg, alt: "Bridal makeup and hair styling look", cat: "Bridal" },
  { src: heroImg, alt: "White and gold luxury salon interior", cat: "Interior" },
  { src: hairImg, alt: "Balayage colour melt result", cat: "Hair" },
  { src: bridalImg, alt: "Airbrush bridal base with soft glam eyes", cat: "Bridal" },
  { src: spaImg, alt: "Aroma oil therapy setup with warm towels", cat: "Facials" },
  { src: heroImg, alt: "Styling stations with gold arch mirrors", cat: "Interior" },
  { src: hairImg, alt: "Precision haircut with soft waves", cat: "Hair" },
];

function GalleryPage() {
  const [cat, setCat] = useState<string>("All");
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const shown = ITEMS.filter((i) => cat === "All" || i.cat === cat);

  return (
    <div className="pt-32 pb-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          eyebrow="Gallery"
          title="A look inside Ozone Plus"
          subtitle="Real work by our stylists and therapists — hair, bridal, skin, spa and our studio itself."
        />

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-4 py-2 text-xs tracking-wide transition-all ${
                cat === c
                  ? "border-ink bg-ink text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-gold/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item, i) => (
            <Reveal key={`${item.alt}-${i}`} delay={i * 0.05}>
              <button
                onClick={() => setLightbox(item)}
                className="group block w-full overflow-hidden rounded-3xl border border-border"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="aspect-4/3 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-5"
          onClick={() => setLightbox(null)}
        >
          <button aria-label="Close" className="absolute top-6 right-6 text-primary-foreground">
            <X className="size-6" />
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="max-h-[85vh] max-w-5xl rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
