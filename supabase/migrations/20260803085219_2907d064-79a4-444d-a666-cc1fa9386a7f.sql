REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.slot_load(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.slot_load(date) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "anyone can book" ON public.appointments;
CREATE POLICY "anyone can book" ON public.appointments
FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND appointment_date >= (current_date - interval '1 day')
  AND length(btrim(customer_name)) BETWEEN 2 AND 80
  AND length(btrim(customer_phone)) BETWEEN 7 AND 20
  AND subtotal >= 0 AND discount >= 0 AND total >= 0
  AND total <= subtotal
  AND jsonb_typeof(items) = 'array'
  AND jsonb_array_length(items) BETWEEN 1 AND 30
);

CREATE POLICY "customers cannot read appointments" ON public.appointments
FOR SELECT TO anon USING (false);