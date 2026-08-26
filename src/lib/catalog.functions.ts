import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { publicClient } from "./catalog.server";

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();
  const [services, staff, offers, coupons, slots, closures] = await Promise.all([
    db
      .from("services")
      .select("id,name,category,price,duration,description,benefits,popular")
      .eq("active", true)
      .order("sort"),
    db.from("staff").select("id,slug,name,role_title,experience,rating").eq("active", true).order("sort"),
    db.from("offers").select("id,title,price_label,was_label,note,service_id").eq("active", true).order("sort"),
    db.from("coupons").select("code,discount_type,value,min_order,label").eq("active", true).order("code"),
    db.from("time_slots").select("id,period,time_label,capacity").eq("active", true).order("sort"),
    db.from("closures").select("closure_date,reason"),
  ]);

  return {
    services: services.data ?? [],
    staff: staff.data ?? [],
    offers: offers.data ?? [],
    coupons: coupons.data ?? [],
    slots: slots.data ?? [],
    closures: closures.data ?? [],
  };
});

export const getSlotLoad = createServerFn({ method: "GET" })
  .inputValidator((data: { date: string }) => z.object({ date: z.string().min(10).max(10) }).parse(data))
  .handler(async ({ data }) => {
    const db = publicClient();
    const { data: rows } = await db.rpc("slot_load", { p_date: data.date });
    const { count } = await db.from("staff").select("id", { count: "exact", head: true }).eq("active", true);
    return { load: rows ?? [], staffCount: count ?? 1 };
  });
