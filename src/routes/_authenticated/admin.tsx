import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarOff, Download, LayoutDashboard, LogOut, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/salon-data";
import {
  assignAppointmentStaff,
  deleteClosure,
  deleteCoupon,
  deleteOffer,
  deleteSlot,
  getAdminOverview,
  saveClosure,
  saveCoupon,
  saveOffer,
  saveService,
  saveSlot,
  saveStaff,
  setAppointmentStatus,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | Ozone Plus Salon & Spa Management" },
      {
        name: "description",
        content:
          "Manage appointments, stylists, time slots, service pricing, offers, coupons and closure days for Ozone Plus Unisex Salon & Spa.",
      },
      { property: "og:title", content: "Admin Dashboard — Ozone Plus Salon & Spa" },
      { property: "og:description", content: "Real workflows for appointments, staff, slots, pricing and promotions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const TABS = ["Appointments", "Reports", "Staff", "Slots", "Pricing", "Offers", "Coupons", "Closures"] as const;
const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold";
const cardCls = "rounded-3xl border border-border bg-card p-6";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getAdminOverview);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Appointments");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | (typeof STATUSES)[number]>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    retry: false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-overview"] });
    void qc.invalidateQueries({ queryKey: ["catalog"] });
    void qc.invalidateQueries({ queryKey: ["slot-load"] });
  };

  const action = <T,>(fn: (args: { data: T }) => Promise<unknown>, msg: string) =>
    useMutation({
      mutationFn: (data: T) => fn({ data }),
      onSuccess: () => {
        toast.success(msg);
        invalidate();
      },
      onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Action failed"),
    });

  const statusM = action(useServerFn(setAppointmentStatus), "Status updated");
  const assignM = action(useServerFn(assignAppointmentStaff), "Stylist assigned");
  const serviceM = action(useServerFn(saveService), "Service saved");
  const staffM = action(useServerFn(saveStaff), "Staff saved");
  const slotM = action(useServerFn(saveSlot), "Slot saved");
  const slotDelM = action(useServerFn(deleteSlot), "Slot removed");
  const offerM = action(useServerFn(saveOffer), "Offer saved");
  const offerDelM = action(useServerFn(deleteOffer), "Offer removed");
  const couponM = action(useServerFn(saveCoupon), "Coupon saved");
  const couponDelM = action(useServerFn(deleteCoupon), "Coupon removed");
  const closureM = action(useServerFn(saveClosure), "Closure saved");
  const closureDelM = action(useServerFn(deleteClosure), "Closure removed");

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const data = overview.data;

  const stats = useMemo(() => {
    const appts = data?.appointments ?? [];
    const now = new Date();
    // Local calendar day, not UTC — otherwise "today" is wrong for morning hours in IST.
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return {
      today: appts.filter((a) => a.appointment_date === today).length,
      pending: appts.filter((a) => a.status === "pending").length,
      revenue: appts
        .filter((a) => a.status === "completed")
        .reduce((sum, a) => sum + Number(a.total), 0),
      total: appts.length,
    };
  }, [data]);

  const appointments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.appointments ?? []).filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (from && a.appointment_date < from) return false;
      if (to && a.appointment_date > to) return false;
      if (!q) return true;
      return [a.booking_ref, a.customer_name, a.customer_phone, a.customer_email ?? "", a.slot_time]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, query, statusFilter, from, to]);

  const filteredRevenue = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "completed")
        .reduce((sum, a) => sum + Number(a.total), 0),
    [appointments],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, { bookings: number; revenue: number; cancelled: number }>();
    for (const a of appointments) {
      const row = map.get(a.appointment_date) ?? { bookings: 0, revenue: 0, cancelled: 0 };
      row.bookings += 1;
      if (a.status === "completed") row.revenue += Number(a.total);
      if (a.status === "cancelled" || a.status === "no_show") row.cancelled += 1;
      map.set(a.appointment_date, row);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [appointments]);

  const topServices = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const a of appointments) {
      for (const i of (a.items as { name: string; qty: number; price: number }[]) ?? []) {
        const row = map.get(i.name) ?? { qty: 0, revenue: 0 };
        row.qty += i.qty;
        row.revenue += (i.price ?? 0) * i.qty;
        map.set(i.name, row);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  }, [appointments]);

  const exportAppointments = () =>
    downloadCsv(
      `ozoneplus-appointments-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        ["Booking ref", "Date", "Slot", "Customer", "Phone", "Email", "Services", "Duration", "Subtotal", "Discount", "Total", "Coupon", "Payment", "Status"],
        ...appointments.map((a) => [
          a.booking_ref,
          a.appointment_date,
          a.slot_time,
          a.customer_name,
          a.customer_phone,
          a.customer_email ?? "",
          ((a.items as { name: string; qty: number }[]) ?? []).map((i) => `${i.name} x${i.qty}`).join("; "),
          a.duration,
          a.subtotal,
          a.discount,
          a.total,
          a.coupon_code ?? "",
          a.payment_method,
          a.status,
        ]),
      ],
    );

  if (overview.isError) {
    return (
      <div className="mx-auto max-w-lg px-5 pt-40 pb-24 text-center">
        <h1 className="text-3xl">Admin access required</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          This account does not have admin permissions. Ask the salon owner to grant you access, then reload.
        </p>
        <button onClick={signOut} className="btn-ink mt-8 rounded-full px-6 py-3 text-xs font-medium">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <LayoutDashboard className="size-3.5 text-gold-deep" /> Salon Control Centre
            </p>
            <h1 className="mt-3 text-4xl leading-tight tracking-tight">Admin dashboard</h1>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs hover:border-gold"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Today's appointments", value: String(stats.today) },
            { label: "Awaiting confirmation", value: String(stats.pending) },
            { label: "Completed revenue", value: formatINR(stats.revenue) },
            { label: "Total bookings", value: String(stats.total) },
          ].map((s) => (
            <div key={s.label} className={cardCls}>
              <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">{s.label}</p>
              <p className="mt-3 font-display text-3xl">{s.value}</p>
            </div>
          ))};
        </div>

        <div className="mt-10 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs tracking-wide transition-all ${
                tab === t
                  ? "border-ink bg-ink text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-gold/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {overview.isLoading || !data ? (
          <p className="mt-12 text-sm text-muted-foreground">Loading salon data…</p>
        ) : (
          <div className="mt-8">
            {tab === "Appointments" ? (
              <div className="space-y-4">
                <div className={`${cardCls} grid gap-3 sm:grid-cols-2 lg:grid-cols-5`}>
                  <Field label="Search">
                    <span className="relative block">
                      <Search className="absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
                      <input
                        className={`${inputCls} pl-9`}
                        placeholder="Name, phone, booking ID"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </span>
                  </Field>
                  <Field label="Status">
                    <select
                      className={inputCls}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    >
                      <option value="all">All statuses</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="From date">
                    <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
                  </Field>
                  <Field label="To date">
                    <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
                  </Field>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={exportAppointments}
                      className="btn-ink flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-xs font-medium"
                    >
                      <Download className="size-3.5" /> Export CSV
                    </button>
                    <button
                      onClick={() => {
                        setQuery("");
                        setStatusFilter("all");
                        setFrom("");
                        setTo("");
                      }}
                      className="rounded-full border border-border px-4 py-2.5 text-xs hover:border-gold"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                  {appointments.length} bookings · {formatINR(filteredRevenue)} completed revenue
                </p>
                {appointments.length === 0 ? (
                  <p className="rounded-3xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                    No appointments match these filters.
                  </p>
                ) : null}
                {appointments.map((a) => {
                  const items = (a.items as { name: string; qty: number }[]) ?? [];
                  return (
                    <div key={a.id} className={cardCls}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="eyebrow">{a.booking_ref}</p>
                          <h3 className="mt-2 text-xl">{a.customer_name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {a.customer_phone}
                            {a.customer_email ? ` · ${a.customer_email}` : ""}
                          </p>
                          <p className="mt-3 text-sm">
                            {new Date(a.appointment_date).toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            · {a.slot_time} · {a.duration} min
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                          </p>
                          {a.notes ? <p className="mt-2 text-xs text-muted-foreground">Note: {a.notes}</p> : null}
                        </div>
                        <div className="w-full space-y-2 sm:w-64">
                          <p className="font-display text-2xl">{formatINR(Number(a.total))}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.payment_method === "salon" ? "Pay at salon" : `Paid online (${a.payment_method})`}
                            {a.coupon_code ? ` · ${a.coupon_code}` : ""}
                          </p>
                          <select
                            value={a.status}
                            onChange={(e) => statusM.mutate({ id: a.id, status: e.target.value as never })}
                            className={inputCls}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                          <select
                            value={a.staff_id ?? ""}
                            onChange={(e) =>
                              assignM.mutate({ id: a.id, staffId: e.target.value || null })
                            }
                            className={inputCls}
                          >
                            <option value="">Any available expert</option>
                            {data.staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {tab === "Reports" ? (
              <div className="space-y-4">
                <div className={`${cardCls} flex flex-wrap items-end gap-3`}>
                  <Field label="From date">
                    <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
                  </Field>
                  <Field label="To date">
                    <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
                  </Field>
                  <button
                    onClick={() =>
                      downloadCsv(`ozoneplus-daily-report-${new Date().toISOString().slice(0, 10)}.csv`, [
                        ["Date", "Bookings", "Cancelled / no-show", "Completed revenue"],
                        ...byDay.map(([d, r]) => [d, r.bookings, r.cancelled, r.revenue]),
                      ])
                    }
                    className="btn-ink flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium"
                  >
                    <Download className="size-3.5" /> Export daily report
                  </button>
                </div>

                <div className={cardCls}>
                  <h2 className="font-display text-xl">Day by day</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[32rem] text-sm">
                      <thead>
                        <tr className="text-left text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                          <th className="py-2">Date</th>
                          <th className="py-2">Bookings</th>
                          <th className="py-2">Cancelled</th>
                          <th className="py-2 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {byDay.map(([d, r]) => (\
                          <tr key={d}>
                            <td className="py-3">
                              {new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="py-3">{r.bookings}</td>
                            <td className="py-3">{r.cancelled}</td>
                            <td className="py-3 text-right">{formatINR(r.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {byDay.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">No data for this range yet.</p>
                    ) : null}
                  </div>
                </div>

                <div className={cardCls}>
                  <h2 className="font-display text-xl">Top services</h2>
                  <ul className="mt-4 divide-y divide-border text-sm">
                    {topServices.map(([name, r]) => (
                      <li key={name} className="flex items-center justify-between gap-4 py-3">
                        <span>{name}</span>
                        <span className="text-muted-foreground">
                          {r.qty} booked · {formatINR(r.revenue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {topServices.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">No services booked yet.</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {tab === "Staff" ? (
              <div className="space-y-4">
                <StaffForm onSave={(d) => staffM.mutate(d)} />
                {data.staff.map((s) => (
                  <StaffForm key={s.id} initial={s} onSave={(d) => staffM.mutate(d)} />
                ))}
              </div>
            ) : null}

            {tab === "Slots" ? (
              <div className="space-y-4">
                <SlotForm onSave={(d) => slotM.mutate(d)} />
                {data.slots.map((s) => (
                  <SlotForm
                    key={s.id}
                    initial={s}
                    onSave={(d) => slotM.mutate(d)}
                    onDelete={() => slotDelM.mutate({ id: s.id })}
                  />
                ))}
              </div>
            ) : null}

            {tab === "Pricing" ? (
              <div className="space-y-4">
                {data.services.map((s) => (
                  <ServiceForm key={s.id} initial={s} onSave={(d) => serviceM.mutate(d)} />
                ))}
              </div>
            ) : null}

            {tab === "Offers" ? (
              <div className="space-y-4">
                <OfferForm services={data.services} onSave={(d) => offerM.mutate(d)} />
                {data.offers.map((o) => (
                  <OfferForm
                    key={o.id}
                    initial={o}
                    services={data.services}
                    onSave={(d) => offerM.mutate(d)}
                    onDelete={() => offerDelM.mutate({ id: o.id })}
                  />
                ))}
              </div>
            ) : null}

            {tab === "Coupons" ? (
              <div className="space-y-4">
                <CouponForm onSave={(d) => couponM.mutate(d)} />
                {data.coupons.map((c) => (
                  <CouponForm
                    key={c.code}
                    initial={{ ...c, discount_type: c.discount_type as "percent" | "flat" }}
                    onSave={(d) => couponM.mutate(d)}
                    onDelete={() => couponDelM.mutate({ code: c.code })}
                  />
                ))}
              </div>
            ) : null}

            {tab === "Closures" ? (
              <div className={cardCls}>
                <h2 className="flex items-center gap-2 font-display text-xl">
                  <CalendarOff className="size-4 text-gold-deep" /> Salon closure days
                </h2>
                <ClosureForm onSave={(d) => closureM.mutate(d)} />
                <ul className="mt-6 divide-y divide-border">
                  {data.closures.map((c) => (
                    <li key={c.closure_date} className="flex items-center justify-between py-3 text-sm">
                      <span>
                        {new Date(c.closure_date).toLocaleDateString("en-IN", {\
                          weekday: "short",\
                          day: "numeric",\
                          month: "short",\
                          year: "numeric",\
                        })}\
                        <span className="ml-3 text-xs text-muted-foreground">{c.reason}</span>
                      </span>
                      <button
                        onClick={() => closureDelM.mutate({ closure_date: c.closure_date })}
                        aria-label="Remove closure"
                        className="rounded-full border border-border p-2 hover:border-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function Row({ children, onDelete }: { children: React.ReactNode; onDelete?: () => void }) {
  return (
    <div className={cardCls}>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
      {onDelete ? (
        <button
          onClick={onDelete}
          className="mt-4 flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" /> Delete
        </button>
      ) : null}
    </div>
  );
}

type StaffInput = {
  id: string | null;
  name: string;
  slug: string;
  role_title: string;
  experience: string;
  rating: number;
  active: boolean;
};

function StaffForm({
  initial,
  onSave,
}: {
  initial?: Partial<StaffInput> & { id?: string };
  onSave: (d: StaffInput) => void;
}) {
  const [f, setF] = useState<StaffInput>({
    id: initial?.id ?? null,
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    role_title: initial?.role_title ?? "Stylist",
    experience: initial?.experience ?? "1 yr",
    rating: initial?.rating ?? 5,
    active: initial?.active ?? true,
  });
  return (
    <Row>
      <Field label="Name">
        <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field label="Slug">
        <input className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
      </Field>
      <Field label="Role">
        <input className={inputCls} value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} />
      </Field>
      <Field label="Experience">
        <input className={inputCls} value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} />
      </Field>
      <Field label="Rating">
        <input
          type="number"
          step="0.1"
          min="0"
          max="5"
          className={inputCls}
          value={f.rating}
          onChange={(e) => setF({ ...f, rating: Number(e.target.value) })}
        />
      </Field>
      <Field label="Active">
        <select
          className={inputCls}
          value={f.active ? "yes" : "no"}
          onChange={(e) => setF({ ...f, active: e.target.value === "yes" })}
        >
          <option value="yes">Bookable</option>
          <option value="no">Hidden</option>
        </select>
      </Field>
      <div className="flex items-end">
        <button onClick={() => onSave(f)} className="btn-gold w-full rounded-full py-2.5 text-xs font-medium">
          {f.id ? "Save" : (
            <span className="flex items-center justify-center gap-1">
              <Plus className="size-3" /> Add stylist
            </span>
          )}
        </button>
      </div>
    </Row>
  );
}

type SlotInput = { id: string | null; period: string; time_label: string; capacity: number; active: boolean };

function SlotForm({
  initial,
  onSave,
  onDelete,
}: {
  initial?: Partial<SlotInput> & { id?: string };
  onSave: (d: SlotInput) => void;
  onDelete?: () => void;
}) {
  const [f, setF] = useState<SlotInput>({
    id: initial?.id ?? null,
    period: initial?.period ?? "Morning",
    time_label: initial?.time_label ?? "",
    capacity: initial?.capacity ?? 1,
    active: initial?.active ?? true,
  });
  return (
    <Row {...(onDelete ? { onDelete } : {})}>
      <Field label="Period">
        <input className={inputCls} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} />
      </Field>
      <Field label="Time">
        <input
          className={inputCls}
          placeholder="10:30 AM"
          value={f.time_label}
          onChange={(e) => setF({ ...f, time_label: e.target.value })}
        />
      </Field>
      <Field label="Capacity">
        <input
          type="number"
          min="1"
          className={inputCls}
          value={f.capacity}
          onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })}
        />
      </Field>
      <Field label="Active">
        <select
          className={inputCls}
          value={f.active ? "yes" : "no"}
          onChange={(e) => setF({ ...f, active: e.target.value === "yes" })}
        >
          <option value="yes">Open</option>
          <option value="no">Closed</option>
        </select>
      </Field>
      <div className="flex items-end">
        <button onClick={() => onSave(f)} className="btn-gold w-full rounded-full py-2.5 text-xs font-medium">
          {f.id ? "Save" : "Add slot"}
        </button>
      </div>
    </Row>
  );
}

type ServiceInput = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  popular: boolean;
  active: boolean;
};

function ServiceForm({ initial, onSave }: { initial: ServiceInput; onSave: (d: ServiceInput) => void }) {
  const [f, setF] = useState<ServiceInput>({
    id: initial.id,
    name: initial.name,
    category: initial.category,
    description: initial.description,
    price: initial.price,
    duration: initial.duration,
    popular: initial.popular,
    active: initial.active,
  });
  return (
    <Row>
      <Field label="Service">
        <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field label="Category">
        <input className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
      </Field>
      <Field label="Price (INR)">
        <input
          type="number"
          min="0"
          className={inputCls}
          value={f.price}
          onChange={(e) => setF({ ...f, price: Number(e.target.value) })}
        />
      </Field>
      <Field label="Duration (min)">
        <input
          type="number"
          min="5"
          className={inputCls}
          value={f.duration}
          onChange={(e) => setF({ ...f, duration: Number(e.target.value) })}
        />
      </Field>
      <Field label="Popular">
        <select
          className={inputCls}
          value={f.popular ? "yes" : "no"}
          onChange={(e) => setF({ ...f, popular: e.target.value === "yes" })}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </Field>
      <Field label="Active">
        <select
          className={inputCls}
          value={f.active ? "yes" : "no"}
          onChange={(e) => setF({ ...f, active: e.target.value === "yes" })}
        >
          <option value="yes">Live</option>
          <option value="no">Hidden</option>
        </select>
      </Field>
      <Field label="Description">
        <input
          className={inputCls}
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </Field>
      <div className="flex items-end">
        <button onClick={() => onSave(f)} className="btn-gold w-full rounded-full py-2.5 text-xs font-medium">
          Save
        </button>
      </div>
    </Row>
  );
}

type OfferInput = {
  id: string | null;
  title: string;
  price_label: string;
  was_label: string;
  note: string;
  service_id: string | null;
  active: boolean;
};

function OfferForm({
  initial,
  services,
  onSave,
  onDelete,
}: {
  initial?: Partial<OfferInput> & { id?: string };
  services: { id: string; name: string }[];
  onSave: (d: OfferInput) => void;
  onDelete?: () => void;
}) {
  const [f, setF] = useState<OfferInput>({
    id: initial?.id ?? null,
    title: initial?.title ?? "",
    price_label: initial?.price_label ?? "",
    was_label: initial?.was_label ?? "",
    note: initial?.note ?? "Limited offer",
    service_id: initial?.service_id ?? null,
    active: initial?.active ?? true,
  });
  return (
    <Row {...(onDelete ? { onDelete } : {})}>
      <Field label="Title">
        <input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </Field>
      <Field label="Price label">
        <input
          className={inputCls}
          placeholder="₹1,499"
          value={f.price_label}
          onChange={(e) => setF({ ...f, price_label: e.target.value })}
        />
      </Field>
      <Field label="Was label">
        <input className={inputCls} value={f.was_label} onChange={(e) => setF({ ...f, was_label: e.target.value })} />
      </Field>
      <Field label="Badge note">
        <input className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <Field label="Adds service">
        <select
          className={inputCls}
          value={f.service_id ?? ""}
          onChange={(e) => setF({ ...f, service_id: e.target.value || null })}
        >
          <option value="">None</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Active">
        <select
          className={inputCls}
          value={f.active ? "yes" : "no"}
          onChange={(e) => setF({ ...f, active: e.target.value === "yes" })}
        >
          <option value="yes">Live</option>
          <option value="no">Hidden</option>
        </select>
      </Field>
      <div className="flex items-end">
        <button onClick={() => onSave(f)} className="btn-gold w-full rounded-full py-2.5 text-xs font-medium">
          {f.id ? "Save" : "Add offer"}
        </button>
      </div>
    </Row>
  );
}

type CouponInput = {
  code: string;
  discount_type: "percent" | "flat";
  value: number;
  min_order: number;
  label: string;
  active: boolean;
};

function CouponForm({
  initial,
  onSave,
  onDelete,
}: {
  initial?: Partial<CouponInput>;
  onSave: (d: CouponInput) => void;
  onDelete?: () => void;
}) {
  const existing = Boolean(initial?.code);
  const [f, setF] = useState<CouponInput>({
    code: initial?.code ?? "",
    discount_type: (initial?.discount_type as "percent" | "flat") ?? "percent",
    value: initial?.value ?? 10,
    min_order: initial?.min_order ?? 0,
    label: initial?.label ?? "",
    active: initial?.active ?? true,
  });
  return (
    <Row {...(onDelete ? { onDelete } : {})}>
      <Field label="Code">
        <input
          className={inputCls}
          disabled={existing}
          value={f.code}
          onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })}
        />
      </Field>
      <Field label="Type">
        <select
          className={inputCls}
          value={f.discount_type}
          onChange={(e) => setF({ ...f, discount_type: e.target.value as "percent" | "flat" })}
        >
          <option value="percent">Percent off</option>
          <option value="flat">Flat amount off</option>
        </select>
      </Field>
      <Field label="Value">
        <input
          type="number"
          min="1"
          className={inputCls}
          value={f.value}
          onChange={(e) => setF({ ...f, value: Number(e.target.value) })}
        />
      </Field>
      <Field label="Min order">
        <input
          type="number"
          min="0"
          className={inputCls}
          value={f.min_order}
          onChange={(e) => setF({ ...f, min_order: Number(e.target.value) })}
        />
      </Field>
      <Field label="Label">
        <input className={inputCls} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
      </Field>
      <Field label="Active">
        <select
          className={inputCls}
          value={f.active ? "yes" : "no"}
          onChange={(e) => setF({ ...f, active: e.target.value === "yes" })}
        >
          <option value="yes">Live</option>
          <option value="no">Paused</option>
        </select>
      </Field>
      <div className="flex items-end">
        <button onClick={() => onSave(f)} className="btn-gold w-full rounded-full py-2.5 text-xs font-medium">
          {existing ? "Save" : "Add coupon"}
        </button>
      </div>
    </Row>
  );
}

function ClosureForm({ onSave }: { onSave: (d: { closure_date: string; reason: string }) => void }) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("Maintenance day");
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <Field label="Date">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Reason">
        <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="flex items-end">
        <button
          onClick={() => {
            if (date.length !== 10) {
              toast.error("Pick a date");
              return;
            }
            onSave({ closure_date: date, reason });
          }}
          className="btn-gold w-full rounded-full py-2.5 text-xs font-medium"
        >
          Mark closed
        </button>
      </div>
    </div>
  );
}
