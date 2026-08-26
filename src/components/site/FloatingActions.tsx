import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUp, CalendarCheck, MessageCircle, Phone } from "lucide-react";
import { SALON } from "@/lib/salon-data";
import { useBooking } from "@/lib/booking-store";

export function FloatingActions() {
  const [showTop, setShowTop] = useState(false);
  const { count } = useBooking();

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="fixed right-4 bottom-24 z-40 flex flex-col gap-3 sm:bottom-8">
        {showTop ? (
          <button
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="glass-panel flex size-11 items-center justify-center rounded-full"
          >
            <ArrowUp className="size-4" />
          </button>
        ) : null}
        <a
          href={`https://wa.me/${SALON.whatsapp}?text=Hi%20Ozone%20Plus%2C%20I%27d%20like%20to%20book%20an%20appointment.`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp us"
          className="flex size-13 items-center justify-center rounded-full bg-[#25D366] text-primary-foreground shadow-[var(--shadow-luxe)] transition-transform hover:-translate-y-1"
        >
          <MessageCircle className="size-5" />
        </a>
        <a
          href={`tel:${SALON.phone}`}
          aria-label="Call salon"
          className="btn-ink hidden size-13 items-center justify-center rounded-full sm:flex"
        >
          <Phone className="size-5" />
        </a>
        <Link
          to="/book"
          aria-label="Book appointment"
          className="btn-gold hidden size-13 items-center justify-center rounded-full lg:flex"
        >
          <CalendarCheck className="size-5" />
        </Link>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur-lg sm:hidden">
        <a href={`tel:${SALON.phone}`} className="flex flex-1 items-center justify-center gap-2 py-4 text-xs font-medium">
          <Phone className="size-4 text-gold-deep" /> Call Now
        </a>
        <Link to="/book" className="btn-gold flex flex-1 items-center justify-center gap-2 rounded-none py-4 text-xs font-medium">
          <CalendarCheck className="size-4" /> Book {count > 0 ? `(${count})` : ""}
        </Link>
      </div>
    </>
  );
}
