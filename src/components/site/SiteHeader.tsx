import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Phone, ShoppingBag, X } from "lucide-react";
import { SALON } from "@/lib/salon-data";
import { useBooking } from "@/lib/booking-store";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/gallery", label: "Gallery" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { count } = useBooking();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-panel border-b border-border/60" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full border border-gold/50 font-display text-lg text-gold-deep">
            O
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg tracking-wide">Ozone Plus</span>
            <span className="block text-[0.6rem] tracking-[0.28em] text-muted-foreground uppercase">
              Unisex Salon &amp; Spa
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative text-sm text-foreground/80 transition-colors hover:text-gold-deep after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
              activeProps={{ className: "text-gold-deep after:w-full" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${SALON.phone}`}
            className="hidden items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs tracking-wide transition-colors hover:border-gold hover:text-gold-deep lg:flex"
          >
            <Phone className="size-3.5" />
            {SALON.phoneDisplay}
          </a>
          <Link
            to="/book"
            className="btn-gold hidden items-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium tracking-wide sm:flex"
          >
            <ShoppingBag className="size-3.5" />
            Book Appointment
            {count > 0 ? (
              <span className="ml-1 rounded-full bg-ink px-1.5 py-0.5 text-[0.6rem] text-primary-foreground">{count}</span>
            ) : null}
          </Link>
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-full border border-border md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="glass-panel border-t border-border/60 px-5 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="border-b border-border/60 py-3.5 font-display text-lg"
              >
                {item.label}
              </Link>
            ))}
            <Link to="/book" onClick={() => setOpen(false)} className="btn-gold mt-5 rounded-full py-3 text-center text-sm">
              Book Appointment
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
