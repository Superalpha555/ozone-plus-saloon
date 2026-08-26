import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SALON, formatINR } from "@/lib/salon-data";
import { catalogQueryOptions, couponDiscount, slotLoadQueryOptions } from "@/lib/catalog";
import { createAppointment } from "@/lib/catalog.functions";
import { useBooking } from "@/lib/booking-store";

export const Route = createFileRoute("/book")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(catalogQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "Book an Appointment Online | Ozone Plus Salon & Spa New Sangavi" },
      {
        name: "description",
        content:
          "Book your salon or spa appointment at Ozone Plus, New Sangavi in under a minute. Pick services, stylist, date and time slot — pay online or at the salon.",
      },
      { property: "og:title", content: "Book an Appointment — Ozone Plus Unisex Salon & Spa" },
      { property: "og:description", content: "Choose services, stylist, date and slot. Instant confirmation on WhatsApp." },
    ],
  }),
  component: BookPage,
});

const STEPS = ["Services", "Stylist", "Date & Time", "Your Details", "Review & Pay"] as const;

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(80),
  phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").max(160).or(z.literal("")),
  gender: z.string().min(1, "Select an option"),
  notes: z.string().trim().max(500),
});

// Local calendar date (YYYY-MM-DD). toISOString() would shift to UTC and, in IST,
// return the previous day for dates picked in the morning.
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function useDates(closedDates: Set<string>) {
  return useMemo(() => {
    const out: { date: Date; closed: boolean }[] = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      out.push({ date: d, closed: closedDates.has(ymd(d)) });
    }
    return out;
  }, [closedDates]);
}

function BookPage() {
  const { items, add, remove, subtotal, duration, count, clear } = useBooking();
  const { staff, coupons, slots, closures } = useSuspenseQuery(catalogQueryOptions()).data;
  const closedDates = useMemo(
    () => new Set(closures.map((c) => c.closure_date)),
    [closures],
  );
  const dates = useDates(closedDates);

  const [step, setStep] = useState(0);
  const [stylist, setStylist] = useState("any");
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: "", phone: "", email: "", gender: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [payment, setPayment] = useState("salon");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitBooking = useServerFn(createAppointment);

  const slotLoad = useQuery(slotLoadQueryOptions(date));
  const groupedSlots = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of slots) {
      const list = map.get(s.period) ?? [];
      list.push(s.time_label);
      map.set(s.period, list);
    }
    return [...map.entries()];
  }, [slots]);

  const coupon = coupons.find((c) => c.code === applied);
  const discount = couponDiscount(coupon, subtotal);
  const total = Math.max(subtotal - discount, 0);
  const advance = Math.round(total * 0.25);

  const unavailable = (time: string) => {
    const rows = (slotLoad.data?.load ?? []).filter((r) => r.slot_time === time);
    if (!rows.length) return false;
    if (stylist !== "any") return rows.some((r) => r.staff_id === stylist);
    const booked = rows.reduce((sum, r) => sum + r.booked, 0);
    return booked >= Math.max(slotLoad.data?.staffCount ?? 1, 1);
  };

  const applyCoupon = (): void => {
    const key = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code === key);
    if (!found) {
      toast.error("Invalid coupon code");
      return;
    }
    if (subtotal < found.min_order) {
      toast.error(`Minimum order ${formatINR(found.min_order)} required`);
      return;
    }
    setApplied(key);
    toast.success(`${key} applied`);
  };

  const next = () => {
    if (step === 0 && count === 0) {
      toast.error("Add at least one service to continue");
      return;
    }
    if (step === 2 && (!date || !slot)) {
      toast.error("Select a date and a time slot");
      return;
    }
    if (step === 3) {
      const parsed = detailsSchema.safeParse(details);
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
        setErrors(next);
        return;
      }
      setErrors({});
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirm = async () => {
    if (!date || !slot) {
      toast.error("Select a date and a time slot");
      return;
    }
    setSaving(true);
    try {
      const res = await submitBooking({
        data: {
          items: items.map((i) => ({ id: i.service.id, qty: i.qty })),
          staffId: stylist === "any" ? null : stylist,
          date,
          slot,
          name: details.name,
          phone: details.phone,
          email: details.email,
          gender: details.gender,
          notes: details.notes,
          couponCode: applied,
          paymentMethod: payment as "salon" | "advance" | "full",
        },
      });
      setBookingId(res.bookingRef);
      toast.success("Appointment confirmed!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your booking. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectedStylist = staff.find((s) => s.id === stylist);
  const stylistName = selectedStylist?.name ?? "Any available expert";
  const prettyDate = date
    ? new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
    : "—";

  if (bookingId) {
    const summary = items.map((i) => `${i.service.name} x${i.qty}`).join(", ");
    return (
      <div className="pt-32 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl px-5 lg:px-8"
        >
          <div className="rounded-[2rem] border border-gold/40 bg-card p-8 text-center shadow-[var(--shadow-luxe)] sm:p-12">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary">
              <Check className="size-7 text-ink" />
            </span>
            <h1 className="mt-7 text-3xl">Your appointment is confirmed</h1>
            <p className="eyebrow mt-3">Booking ID · {bookingId}</p>
            <div className="mt-8 space-y-3 rounded-2xl bg-muted/50 p-6 text-left text-sm">
              <p className="flex justify-between gap-4">
                <span className="text-muted-foreground">Services</span>
                <span className="text-right">{summary}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-muted-foreground">Stylist</span>
                <span>{stylistName}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-muted-foreground">When</span>
                <span>
                  {prettyDate} · {slot}
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-muted-foreground">Payment</span>
                <span>{payment === "salon" ? "Cash / card at salon" : payment === "advance" ? `${formatINR(advance)} advance online` : `${formatINR(total)} paid online`}</span>
              </p>
              <p className="flex justify-between gap-4 border-t border-border pt-3 font-display text-lg">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </p>
            </div>
            <p className="mt-6 flex items-start justify-center gap-2 text-left text-xs leading-relaxed text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
              {SALON.addressLines.join(", ")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${SALON.mapsQuery}`}
                target="_blank"
                rel="noreferrer"
                className="btn-gold rounded-full px-6 py-3 text-xs font-medium"
              >
                Open in Google Maps
              </a>
              <a href={`tel:${SALON.phone}`} className="btn-ink flex items-center gap-2 rounded-full px-6 py-3 text-xs font-medium">
                <Phone className="size-3.5" /> Call Salon
              </a>
              <a
                href={`https://wa.me/${SALON.whatsapp}?text=${encodeURIComponent(
                  `Hi ${SALON.shortName}, please confirm my appointment.\nBooking ID: ${bookingId}\nName: ${details.name}\nWhen: ${prettyDate} at ${slot}\nStylist: ${stylistName}\nServices: ${summary}\nTotal: ${formatINR(total)}`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full border border-border px-6 py-3 text-xs font-medium hover:border-gold"
              >
                <MessageCircle className="size-3.5 text-[#25D366]" /> Send confirmation on WhatsApp
              </a>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Save your booking ID. You can view or cancel this appointment any time on the{" "}
              <Link to="/my-booking" className="text-gold-deep underline">
                booking desk
              </Link>
              .
            </p>
            <button
              onClick={() => {
                clear();
                setBookingId(null);
                setStep(0);
              }}
              className="mt-8 text-xs tracking-[0.2em] text-muted-foreground uppercase hover:text-gold-deep"
            >
              Book another appointment
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <p className="eyebrow">Appointment Booking</p>
        <h1 className="mt-3 text-4xl leading-tight tracking-tight md:text-5xl">Reserve your slot</h1>

        {/* Stepper */}
        <ol className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2 text-xs">
              <span
                className={`flex size-7 items-center justify-center rounded-full border text-[0.7rem] ${
                  i < step
                    ? "border-ink bg-ink text-primary-foreground"
                    : i === step
                      ? "border-ink bg-ink text-primary-foreground"
                      : "border-border text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={i === step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
          <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            {/* Step 1 — services */}
            {step === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-7">
                <h2 className="font-display text-2xl">Selected services</h2>
                {count === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
                    <p className="text-sm text-muted-foreground">You haven't added any services yet.</p>
                    <Link to="/services" className="btn-gold mt-5 inline-block rounded-full px-6 py-3 text-xs font-medium">
                      Browse Services
                    </Link>
                  </div>
                ) : (
                  <>
                    <ul className="mt-6 divide-y divide-border">
                      {items.map((item) => (
                        <li key={item.service.id} className="flex items-center justify-between gap-4 py-4">
                          <span>
                            <span className="block text-sm font-medium">{item.service.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.service.category} · {item.service.duration} min · {formatINR(item.service.price)}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <button
                              onClick={() => remove(item.service.id)}
                              aria-label="Remove one"
                              className="flex size-7 items-center justify-center rounded-full border border-border"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="w-4 text-center text-sm">{item.qty}</span>
                            <button
                              onClick={() => add(item.service)}
                              aria-label="Add one"
                              className="flex size-7 items-center justify-center rounded-full border border-border"
                            >
                              <Plus className="size-3" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/services" className="mt-5 inline-block text-xs tracking-[0.2em] text-gold-deep uppercase">
                      + Add more services
                    </Link>
                  </>
                )}
              </div>
            ) : null}

            {/* Step 2 — stylist */}
            {step === 1 ? (
              <div className="rounded-3xl border border-border bg-card p-7">
                <h2 className="font-display text-2xl">Choose your stylist</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => setStylist("any")}
                    className={`rounded-2xl border p-5 text-left transition-all ${
                      stylist === "any" ? "border-gold bg-accent/50" : "border-border hover:border-gold/60"
                    }`}
                  >
                    <span className="block text-sm font-medium">Any available expert</span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      We'll assign the best available stylist for your services.
                    </span>
                  </button>
                  {staff.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setStylist(st.id);
                        setSlot(null);
                      }}
                      className={`rounded-2xl border p-5 text-left transition-all ${
                        stylist === st.id ? "border-gold bg-accent/50" : "border-border hover:border-gold/60"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-full bg-accent font-display text-gold-deep">
                          {st.name.slice(0, 1)}
                        </span>
                        <span>
                          <span className="block text-sm font-medium">{st.name}</span>
                          <span className="block text-xs text-muted-foreground">{st.role_title}</span>
                        </span>
                      </span>
                      <span className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Experience: {st.experience}</span>
                        <span className="flex items-center gap-1">
                          <Star className="size-3 fill-gold text-gold" /> {st.rating}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Step 3 — date & time */}
            {step === 2 ? (
              <div className="space-y-5">
                <div className="rounded-3xl border border-border bg-card p-7">
                  <h2 className="flex items-center gap-2 font-display text-2xl">
                    <CalendarDays className="size-5 text-gold-deep" /> Select a date
                  </h2>
                  <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {dates.map(({ date: d, closed }) => {
                      const key = ymd(d);
                      const selected = date === key;
                      return (
                        <button
                          key={key}
                          disabled={closed}
                          onClick={() => {
                            setDate(key);
                            setSlot(null);
                          }}
                          className={`rounded-2xl border py-3 text-center transition-all ${
                            closed
                              ? "cursor-not-allowed border-border text-muted-foreground/40 line-through"
                              : selected
                                ? "border-ink bg-ink text-primary-foreground"
                                : "border-border hover:border-gold/60"
                          }`}
                        >
                          <span className="block text-[0.65rem] tracking-widest uppercase">
                            {d.toLocaleDateString("en-IN", { weekday: "short" })}
                          </span>
                          <span className="mt-1 block font-display text-lg">{d.getDate()}</span>
                          <span className="block text-[0.6rem] text-muted-foreground">
                            {d.toLocaleDateString("en-IN", { month: "short" })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">Struck-out dates are salon maintenance days.</p>
                </div>

                <div className="rounded-3xl border border-border bg-card p-7">
                  <h2 className="flex items-center gap-2 font-display text-2xl">
                    <Clock className="size-5 text-gold-deep" /> Pick a time slot
                  </h2>
                  {!date ? (
                    <p className="mt-5 text-sm text-muted-foreground">Select a date to see live availability.</p>
                  ) : slotLoad.isLoading ? (
                    <p className="mt-5 text-sm text-muted-foreground">Checking live availability…</p>
                  ) : (
                    <div className="mt-6 space-y-6">
                      {groupedSlots.map(([label, times]) => (
                        <div key={label}>
                          <p className="eyebrow">{label}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {times.map((t) => {
                              const taken = unavailable(t);
                              return (
                                <button
                                  key={t}
                                  disabled={taken}
                                  onClick={() => setSlot(t)}
                                  className={`rounded-full border px-4 py-2 text-xs transition-all ${
                                    taken
                                      ? "cursor-not-allowed border-border text-muted-foreground/40 line-through"
                                      : slot === t
                                        ? "border-ink bg-ink text-primary-foreground"
                                        : "border-border hover:border-gold/60"
                                  }`}
                                >
                                  {t}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Step 4 — details */}
            {step === 3 ? (
              <div className="rounded-3xl border border-border bg-card p-7">
                <h2 className="font-display text-2xl">Your details</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      { key: "name", label: "Full Name*", type: "text", ph: "Aditi Joshi" },
                      { key: "phone", label: "Phone Number*", type: "tel", ph: "98765 43210" },
                      { key: "email", label: "Email (optional)", type: "email", ph: "you@email.com" },
                    ] as const
                  ).map((f) => (
                    <label key={f.key} className="block">
                      <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">{f.label}</span>
                      <input
                        type={f.type}
                        value={details[f.key]}
                        maxLength={160}
                        onChange={(e) => setDetails({ ...details, [f.key]: e.target.value })}
                        placeholder={f.ph}
                        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
                      />
                      {errors[f.key] ? <span className="mt-1 block text-xs text-destructive">{errors[f.key]}</span> : null}
                    </label>
                  ))}
                  <label className="block">
                    <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Gender*</span>
                    <select
                      value={details.gender}
                      onChange={(e) => setDetails({ ...details, gender: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
                    >
                      <option value="">Select</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Prefer not to say</option>
                    </select>
                    {errors["gender"] ? (
                      <span className="mt-1 block text-xs text-destructive">{errors["gender"]}</span>
                    ) : null}
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Special instructions</span>
                    <textarea
                      rows={4}
                      maxLength={500}
                      value={details.notes}
                      onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                      placeholder="Allergies, preferred products, occasion…"
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {/* Step 5 — review & pay */}
            {step === 4 ? (
              <div className="space-y-5">
                <div className="rounded-3xl border border-border bg-card p-7">
                  <h2 className="font-display text-2xl">Review your booking</h2>
                  <dl className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd>{details.name}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd>{details.phone}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Stylist</dt>
                      <dd>{stylistName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Date &amp; time</dt>
                      <dd>
                        {prettyDate} · {slot}
                      </dd>
                    </div>
                    {details.notes ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Notes</dt>
                        <dd className="max-w-xs text-right">{details.notes}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <div className="rounded-3xl border border-border bg-card p-7">
                  <h2 className="font-display text-2xl">Payment</h2>
                  <div className="mt-6 space-y-3">
                    {[
                      { id: "salon", label: "Pay at salon", note: "Cash, UPI or card after your service" },
                      { id: "advance", label: `Pay ${formatINR(advance)} advance now`, note: "25% advance, balance at salon" },
                      { id: "full", label: `Pay ${formatINR(total)} in full`, note: "UPI, cards, net banking & wallets" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPayment(p.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-all ${
                          payment === p.id ? "border-gold bg-accent/50" : "border-border hover:border-gold/60"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-medium">{p.label}</span>
                          <span className="block text-xs text-muted-foreground">{p.note}</span>
                        </span>
                        <span
                          className={`flex size-5 items-center justify-center rounded-full border ${
                            payment === p.id ? "border-gold bg-gold" : "border-border"
                          }`}
                        >
                          {payment === p.id ? <Check className="size-3 text-ink" /> : null}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    Free cancellation or rescheduling up to 4 hours before your appointment.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Nav */}
            <div className="mt-7 flex items-center justify-between gap-3">
              <button
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                disabled={step === 0}
                className="flex items-center gap-2 rounded-full border border-border px-5 py-3 text-xs tracking-wide transition-colors hover:border-gold disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={next} className="btn-gold rounded-full px-8 py-3.5 text-sm font-medium">
                  Continue
                </button>
              ) : (
                <button
                  onClick={confirm}
                  disabled={saving}
                  className="btn-gold rounded-full px-8 py-3.5 text-sm font-medium disabled:opacity-60"
                >
                  {saving ? "Confirming…" : "Confirm Appointment"}
                </button>
              )}
            </div>
          </motion.div>

          {/* Sticky summary */}
          <aside>
            <div className="sticky top-28 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h2 className="font-display text-xl">Booking Summary</h2>
              {count === 0 ? (
                <p className="mt-5 text-sm text-muted-foreground">No services added yet.</p>
              ) : (
                <ul className="mt-5 space-y-3 text-sm">
                  {items.map((i) => (
                    <li key={i.service.id} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {i.service.name} × {i.qty}
                      </span>
                      <span>{formatINR(i.service.price * i.qty)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Coupon code"
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-gold"
                />
                <button onClick={applyCoupon} className="btn-ink shrink-0 rounded-full px-5 text-xs">
                  Apply
                </button>
              </div>

              <dl className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Duration</dt>
                  <dd>
                    {Math.floor(duration / 60)}h {duration % 60}m
                  </dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd>{formatINR(subtotal)}</dd>
                </div>
                {discount > 0 ? (
                  <div className="flex justify-between text-gold-deep">
                    <dt>Discount ({applied})</dt>
                    <dd>-{formatINR(discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-border pt-3 font-display text-lg">
                  <dt>Total</dt>
                  <dd>{formatINR(total)}</dd>
                </div>
              </dl>

              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-gold" />
                {SALON.addressLines[2]}, {SALON.addressLines[3]}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
