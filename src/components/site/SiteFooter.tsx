import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, MapPin, Phone } from "lucide-react";
import { SALON } from "@/lib/salon-data";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="font-display text-2xl">Ozone Plus</p>
          <p className="eyebrow mt-1">Unisex Salon &amp; Spa</p>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            A luxury hair, beauty and spa destination in New Sangavi, Pimpri-Chinchwad — where certified experts,
            premium products and calm interiors come together.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href="https://instagram.com"
              aria-label="Instagram"
              className="flex size-9 items-center justify-center rounded-full border border-border transition-colors hover:border-gold hover:text-gold-deep"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="https://facebook.com"
              aria-label="Facebook"
              className="flex size-9 items-center justify-center rounded-full border border-border transition-colors hover:border-gold hover:text-gold-deep"
            >
              <Facebook className="size-4" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg">Quick Links</h3>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            {[
              { to: "/", label: "Home" },
              { to: "/services", label: "Services & Prices" },
              { to: "/book", label: "Book Appointment" },
              { to: "/gallery", label: "Gallery" },
              { to: "/contact", label: "Contact" },
              { to: "/auth", label: "Staff Login" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="transition-colors hover:text-gold-deep">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-lg">Popular Services</h3>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            {["Haircut & Styling", "L'Oréal Hair Spa", "Advanced Facials", "Bridal Makeup", "Laser Hair Removal", "Spa & Massage"].map(
              (t) => (
                <li key={t}>
                  <Link to="/services" className="transition-colors hover:text-gold-deep">
                    {t}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-lg">Visit Us</h3>
          <p className="mt-5 flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
            <span>{SALON.addressLines.join(", ")}</span>
          </p>
          <a
            href={`tel:${SALON.phone}`}
            className="mt-4 flex items-center gap-3 text-sm transition-colors hover:text-gold-deep"
          >
            <Phone className="size-4 text-gold" />
            {SALON.phoneDisplay}
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${SALON.mapsQuery}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ink mt-6 inline-block rounded-full px-5 py-2.5 text-xs tracking-wide"
          >
            Get Directions
          </a>
        </div>
      </div>

      <div className="border-t border-border px-5 py-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SALON.name}. All rights reserved.</p>
          <p className="flex gap-5">
            <Link to="/my-booking" className="hover:text-gold-deep">Manage Booking</Link>
            <Link to="/contact" className="hover:text-gold-deep">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-gold-deep">Terms &amp; Conditions</Link>
            <Link to="/contact" className="hover:text-gold-deep">Cancellation Policy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
