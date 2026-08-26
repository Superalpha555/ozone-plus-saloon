import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { SALON } from "@/lib/salon-data";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Location | Ozone Plus Unisex Salon & Spa, New Sangavi" },
      {
        name: "description",
        content:
          "Visit Ozone Plus Unisex Salon & Spa at Dnyanesh Park, New Sangavi, Krishna Chowk, Pimpri-Chinchwad 411061. Call +91 84213 06060 or message us on WhatsApp.",
      },
      { property: "og:title", content: "Contact Ozone Plus Unisex Salon & Spa" },
      { property: "og:description", content: "Address, opening hours, directions and WhatsApp booking for our New Sangavi salon." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, "Enter a valid phone number"),
  message: z.string().trim().min(5, "Tell us how we can help").max(800),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    const text = `Hi Ozone Plus!%0AName: ${encodeURIComponent(parsed.data.name)}%0APhone: ${encodeURIComponent(
      parsed.data.phone,
    )}%0A${encodeURIComponent(parsed.data.message)}`;
    window.open(`https://wa.me/${SALON.whatsapp}?text=${text}`, "_blank", "noopener");
    toast.success("Opening WhatsApp — we'll reply right away!");
    setForm({ name: "", phone: "", message: "" });
  };

  return (
    <div className="pt-32 pb-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          eyebrow="Contact & Location"
          title="Find us at Krishna Chowk, New Sangavi"
          subtitle="Easy to reach, ample parking nearby, and always happy to answer a quick question before you book."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-4">
              <div className="rounded-3xl border border-border bg-card p-7">
                <h2 className="flex items-center gap-2 font-display text-xl">
                  <MapPin className="size-4 text-gold-deep" /> Salon Address
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {SALON.addressLines.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${SALON.mapsQuery}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-gold flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium"
                  >
                    <Navigation className="size-3.5" /> Get Directions
                  </a>
                  <a
                    href={`tel:${SALON.phone}`}
                    className="btn-ink flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium"
                  >
                    <Phone className="size-3.5" /> {SALON.phoneDisplay}
                  </a>
                  <a
                    href={`https://wa.me/${SALON.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-medium transition-colors hover:border-gold"
                  >
                    <MessageCircle className="size-3.5 text-[#25D366]" /> WhatsApp
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-7">
                <h2 className="flex items-center gap-2 font-display text-xl">
                  <Clock className="size-4 text-gold-deep" /> Business Hours
                </h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {SALON.hours.map((h) => (
                    <li key={h.day} className="flex justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                      <span className="text-muted-foreground">{h.day}</span>
                      <span>{h.time}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="overflow-hidden rounded-3xl border border-border">
                <iframe
                  title="Ozone Plus Unisex Salon & Spa location map"
                  src={`https://www.google.com/maps?q=${SALON.mapsQuery}&output=embed`}
                  className="h-80 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-7">
              <h2 className="font-display text-xl">Send us a message</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Fill this in and we'll continue the conversation on WhatsApp.
              </p>

              <div className="mt-6 space-y-4">
                {(
                  [
                    { key: "name", label: "Your Name", placeholder: "e.g. Aditi Joshi", type: "text" },
                    { key: "phone", label: "Phone Number", placeholder: "e.g. 98765 43210", type: "tel" },
                  ] as const
                ).map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">{f.label}</span>
                    <input
                      type={f.type}
                      value={form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      maxLength={80}
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
                    />
                    {errors[f.key] ? <span className="mt-1 block text-xs text-destructive">{errors[f.key]}</span> : null}
                  </label>
                ))}
                <label className="block">
                  <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Message</span>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    maxLength={800}
                    placeholder="Which service are you interested in?"
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
                  />
                  {errors["message"] ? (
                    <span className="mt-1 block text-xs text-destructive">{errors["message"]}</span>
                  ) : null}
                </label>
              </div>

              <button type="submit" className="btn-gold mt-6 w-full rounded-full py-3.5 text-sm font-medium">
                Send on WhatsApp
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
