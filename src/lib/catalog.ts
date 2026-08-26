import { queryOptions } from "@tanstack/react-query";
import { getCatalog, getSlotLoad } from "./catalog.functions";

export type Service = {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  description: string;
  benefits: string[];
  popular: boolean;
};

export type StaffMember = {
  id: string;
  slug: string;
  name: string;
  role_title: string;
  experience: string;
  rating: number;
};

export type Coupon = {
  code: string;
  discount_type: string;
  value: number;
  min_order: number;
  label: string;
};

export const catalogQueryOptions = () =>
  queryOptions({
    queryKey: ["catalog"],
    queryFn: () => getCatalog(),
    staleTime: 60_000,
  });

export const slotLoadQueryOptions = (date: string | null) =>
  queryOptions({
    queryKey: ["slot-load", date],
    queryFn: () => getSlotLoad({ data: { date: date as string } }),
    enabled: Boolean(date),
  });

export function couponDiscount(coupon: Coupon | undefined, subtotal: number) {
  if (!coupon || subtotal < coupon.min_order) return 0;
  return coupon.discount_type === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
}
