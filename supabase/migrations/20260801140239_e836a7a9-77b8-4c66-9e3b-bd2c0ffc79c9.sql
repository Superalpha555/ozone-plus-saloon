-- roles
CREATE TYPE public.app_role AS ENUM ('admin','staff');

CREATE TABLE public.profiles (\
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,\
  full_name TEXT,\
  email TEXT,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (\
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,\
  role public.app_role NOT NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  UNIQUE (user_id, role)\
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- new users: profile + first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- catalog
CREATE TABLE public.services (\
  id TEXT PRIMARY KEY,\
  name TEXT NOT NULL,\
  category TEXT NOT NULL,\
  price INTEGER NOT NULL DEFAULT 0,\
  duration INTEGER NOT NULL DEFAULT 30,\
  description TEXT NOT NULL DEFAULT '',\
  benefits TEXT[] NOT NULL DEFAULT '{}',\
  popular BOOLEAN NOT NULL DEFAULT false,\
  active BOOLEAN NOT NULL DEFAULT true,\
  sort INTEGER NOT NULL DEFAULT 0,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()\
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services public read" ON public.services FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "services admin all" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER services_touch BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.staff (\
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\
  slug TEXT NOT NULL UNIQUE,\
  name TEXT NOT NULL,\
  role_title TEXT NOT NULL DEFAULT '',\
  experience TEXT NOT NULL DEFAULT '',\
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.8,\
  active BOOLEAN NOT NULL DEFAULT true,\
  sort INTEGER NOT NULL DEFAULT 0,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\
);
GRANT SELECT ON public.staff TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff public read" ON public.staff FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "staff admin all" ON public.staff FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.time_slots (\
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\
  period TEXT NOT NULL,\
  time_label TEXT NOT NULL,\
  active BOOLEAN NOT NULL DEFAULT true,\
  capacity INTEGER NOT NULL DEFAULT 3,\
  sort INTEGER NOT NULL DEFAULT 0,\
  UNIQUE (period, time_label)\
);
GRANT SELECT ON public.time_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_slots TO authenticated;
GRANT ALL ON public.time_slots TO service_role;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slots public read" ON public.time_slots FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "slots admin all" ON public.time_slots FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.closures (\
  closure_date DATE PRIMARY KEY,\
  reason TEXT NOT NULL DEFAULT 'Salon closed'\
);
GRANT SELECT ON public.closures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.closures TO authenticated;
GRANT ALL ON public.closures TO service_role;
ALTER TABLE public.closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closures public read" ON public.closures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "closures admin all" ON public.closures FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.offers (\
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\
  title TEXT NOT NULL,\
  price_label TEXT NOT NULL,\
  was_label TEXT NOT NULL DEFAULT '',\
  note TEXT NOT NULL DEFAULT '',\
  service_id TEXT REFERENCES public.services(id) ON DELETE SET NULL,\
  active BOOLEAN NOT NULL DEFAULT true,\
  sort INTEGER NOT NULL DEFAULT 0,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\
);
GRANT SELECT ON public.offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers public read" ON public.offers FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "offers admin all" ON public.offers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.coupons (\
  code TEXT PRIMARY KEY,\
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','flat')),\
  value INTEGER NOT NULL DEFAULT 0,\
  min_order INTEGER NOT NULL DEFAULT 0,\
  label TEXT NOT NULL DEFAULT '',\
  active BOOLEAN NOT NULL DEFAULT true,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\
);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons public read" ON public.coupons FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "coupons admin all" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.appointments (\
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\
  booking_ref TEXT NOT NULL UNIQUE DEFAULT ('OZP-' || upper(substr(md5(gen_random_uuid()::text),1,5))),\
  customer_name TEXT NOT NULL,\
  customer_phone TEXT NOT NULL,\
  customer_email TEXT,\
  gender TEXT,\
  notes TEXT,\
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,\
  appointment_date DATE NOT NULL,\
  slot_time TEXT NOT NULL,\
  items JSONB NOT NULL DEFAULT '[]'::jsonb,\
  duration INTEGER NOT NULL DEFAULT 0,\
  subtotal INTEGER NOT NULL DEFAULT 0,\
  discount INTEGER NOT NULL DEFAULT 0,\
  total INTEGER NOT NULL DEFAULT 0,\
  coupon_code TEXT,\
  payment_method TEXT NOT NULL DEFAULT 'salon',\
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()\
);
GRANT INSERT ON public.appointments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can book" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "appointments admin read" ON public.appointments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "appointments admin update" ON public.appointments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "appointments admin delete" ON public.appointments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER appointments_touch BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX appointments_date_idx ON public.appointments (appointment_date, slot_time);\

-- public slot availability without exposing appointment rows
CREATE OR REPLACE FUNCTION public.slot_load(p_date date)
RETURNS TABLE (slot_time text, staff_id uuid, booked integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.slot_time, a.staff_id, count(*)::int
  FROM public.appointments a
  WHERE a.appointment_date = p_date AND a.status NOT IN ('cancelled','no_show')
  GROUP BY a.slot_time, a.staff_id
$$;
GRANT EXECUTE ON FUNCTION public.slot_load(date) TO anon, authenticated;

INSERT INTO public.services (id,name,category,price,duration,description,benefits,popular,sort) VALUES
('haircut','Haircut','Hair',399,40,'Consultation-led precision cut finished with a signature blow dry.',ARRAY['Face-shape mapping','Senior stylist','Complimentary wash']::text[],true,0),
('blow-dry','Blow Dry','Hair',449,35,'Salon-smooth volume and shine with heat-protected styling.',ARRAY['Frizz control','Long-lasting hold']::text[],false,1),
('hairstyling','Hairstyling','Hair',899,50,'Event-ready styling — curls, waves, sleek buns and updos.',ARRAY['Occasion ready','Photo finish']::text[],false,2),
('shampoo-conditioning','Shampoo & Conditioning','Hair',299,25,'Deep cleansing wash with a nourishing conditioner ritual.',ARRAY['Scalp cleanse','Softness boost']::text[],false,3),
('loreal-hair-spa','Basic L''Oréal Hair Spa','Hair',999,55,'Professional L''Oréal spa therapy for dry, dull hair.',ARRAY['Deep hydration','Scalp massage']::text[],true,4),
('balayage','Balayage','Hair',4999,150,'Hand-painted, sun-kissed dimension tailored to your base.',ARRAY['Low maintenance','Ammonia-free options']::text[],false,5),
('balayage-ombre','Balayage / Ombre','Hair',5499,165,'Seamless gradient colour melt with premium global toner.',ARRAY['Custom toning','Gloss finish']::text[],false,6),
('hair-extensions','Hair Extensions','Hair',6999,120,'Length and volume with colour-matched premium extensions.',ARRAY['Instant volume','Blended match']::text[],false,7),
('braids','Braids','Hair',799,60,'Classic and creative braiding for everyday or events.',ARRAY['Protective styling']::text[],false,8),
('box-braids','Box Braids','Hair',2499,180,'Neat, long-lasting box braids with a comfortable tension.',ARRAY['Weeks of wear']::text[],false,9),
('dreadlocks','Dreadlocks','Hair',3499,210,'Installation and maintenance by trained loc specialists.',ARRAY['Custom sizing']::text[],false,10),
('hair-threading','Hair Threading','Threading',149,15,'Precise thread work for clean, defined lines.',ARRAY['No chemicals']::text[],false,11),
('eyebrow-threading','Eyebrow Threading','Threading',99,10,'Sharp, symmetrical brow definition in minutes.',ARRAY['Gentle technique']::text[],true,12),
('eyebrow-shaping','Eyebrow Shaping','Threading',199,20,'Brow mapping and shaping suited to your features.',ARRAY['Golden-ratio mapping']::text[],false,13),
('eyebrow-beautification','Eyebrow Beautification','Threading',599,35,'Shaping, tinting and grooming for fuller-looking brows.',ARRAY['Tint included']::text[],false,14),
('brow-lamination','Brow Lamination','Skin',1499,45,'Sets brows in a fuller, brushed-up shape for weeks.',ARRAY['4–6 weeks hold']::text[],false,15),
('lash-lift','Lash Lift','Skin',1899,60,'Lifts and curls natural lashes — no mascara needed.',ARRAY['6–8 weeks','Keratin infused']::text[],false,16),
('eyelashes','Eyelashes','Makeup',1299,50,'Classic to volume lash extensions applied strand by strand.',ARRAY['Feather-light']::text[],false,17),
('facials','Facials','Facials',899,55,'Classic clean-up facial for instant glow and clarity.',ARRAY['Deep cleanse','Steam & extraction']::text[],true,18),
('advanced-facials','Advanced Facials','Facials',2499,75,'Result-driven facials — hydra, vitamin C, gold and korean glass.',ARRAY['Dermat-grade actives','Visible glow']::text[],true,19),
('acne-treatments','Acne Treatments','Skin',1799,60,'Targeted anti-acne protocol with salicylic and blue light care.',ARRAY['Oil control','Calms breakouts']::text[],false,20),
('skin-care','Skin Care','Skin',1299,50,'Consultation plus a custom treatment for your skin concern.',ARRAY['Skin analysis']::text[],false,21),
('tanning','Tanning','Skin',1599,45,'Even, streak-free bronze with premium tanning products.',ARRAY['Natural finish']::text[],false,22),
('spa-services','Spa Services','Spa',1999,75,'Signature spa journey with aroma oils and warm towels.',ARRAY['Full body relaxation','Aromatherapy']::text[],true,23),
('massage','Massage','Massage',1499,60,'Swedish, deep tissue or aroma massage by certified therapists.',ARRAY['Stress relief','Muscle recovery']::text[],false,24),
('manicure','Manicure','Nails',599,40,'Cuticle care, shaping and polish with a hand massage.',ARRAY['Hand mask']::text[],false,25),
('pedicure','Pedicure','Nails',799,50,'Soothing soak, scrub and heel therapy for tired feet.',ARRAY['Callus care']::text[],true,26),
('acrylic-nails','Acrylic Nails','Nails',2199,90,'Sculpted acrylic extensions with your choice of art.',ARRAY['Durable finish','Nail art']::text[],false,27),
('waxing','Waxing','Waxing',499,30,'Rica and honey wax options for smooth, comfortable results.',ARRAY['Low pain','Single-use spatula']::text[],false,28),
('body-waxing','Body Waxing','Waxing',1699,70,'Full body waxing with premium imported wax.',ARRAY['Smooth up to 4 weeks']::text[],false,29),
('brazilian-waxing','Brazilian Waxing','Waxing',1299,45,'Discreet, hygienic intimate waxing by trained female staff.',ARRAY['Private room']::text[],false,30),
('laser-hair-removal','Laser Hair Removal','Laser',2999,60,'US-FDA approved diode laser for long-term hair reduction.',ARRAY['Painless cooling tip','Permanent reduction']::text[],false,31),
('makeup-services','Make-up Services','Makeup',2499,75,'Party, HD or airbrush makeup with premium brands.',ARRAY['HD finish','Long wear']::text[],false,32),
('bridal-services','Bridal Services','Bridal',15999,240,'Complete bridal look — makeup, hair, draping and touch-ups.',ARRAY['Trial included','Airbrush base']::text[],true,33),
('wedding-event-prep','Wedding & Event Preparation','Bridal',8999,180,'Pre-function grooming package for the whole family.',ARRAY['Group booking','On-time service']::text[],false,34),
('mobile-salon','Mobile Salon Service','Packages',2499,90,'Our stylists come to your home with sanitised salon kits.',ARRAY['At-home comfort','Within 8 km']::text[],false,35),
('online-booking-package','Online Beauty Salon Booking','Packages',0,5,'Reserve any service online and pay at the salon.',ARRAY['Zero booking fee','Instant slot hold']::text[],false,36),
('spa-haircut-combo','Hair Spa + Haircut Combo','Packages',1299,90,'Our best-selling duo — nourishing spa plus a precision cut.',ARRAY['Save ₹399','Under 90 minutes']::text[],true,37),
('luxury-facial-package','Luxury Facial Package','Packages',3499,120,'Advanced facial, de-tan and eyebrow shaping together.',ARRAY['Save ₹800']::text[],false,38);

INSERT INTO public.staff (slug,name,role_title,experience,rating,sort) VALUES
('rohit','Rohit Salunkhe','Creative Director – Hair','12 years',4.9,0),
('sneha','Sneha Kulkarni','Bridal & Makeup Artist','9 years',4.9,1),
('amit','Amit Deshmukh','Colour Specialist','7 years',4.7,2),
('priya','Priya Nair','Skin & Spa Therapist','8 years',4.8,3);

INSERT INTO public.offers (title,price_label,was_label,note,service_id,sort) VALUES
('Hair Spa + Haircut','₹1,299','₹1,698','Best seller combo','spa-haircut-combo',0),
('Bridal Package','₹15,999','₹19,999','Trial + draping included','bridal-services',1),
('Luxury Facial','₹3,499','₹4,299','Facial + de-tan + brows','luxury-facial-package',2),
('Monsoon Glow Offer','₹999','₹1,499','Advanced facial, 30% off','advanced-facials',3),
('Festival Special','₹1,999','₹2,499','Spa journey for two','spa-services',4);

INSERT INTO public.coupons (code,discount_type,value,min_order,label) VALUES
('OZONE10','percent',10,500,'10% off orders above ₹500'),
('GLOW300','flat',300,1500,'₹300 off orders above ₹1,500'),
('FIRSTVISIT','percent',15,999,'15% off your first visit');

INSERT INTO public.time_slots (period,time_label,sort) VALUES
('Morning','10:00 AM',0),
('Morning','10:30 AM',1),
('Morning','11:00 AM',2),
('Morning','11:30 AM',3),
('Morning','12:00 PM',4),
('Afternoon','12:30 PM',5),
('Afternoon','1:00 PM',6),
('Afternoon','2:00 PM',7),
('Afternoon','2:30 PM',8),
('Afternoon','3:00 PM',9),
('Afternoon','3:30 PM',10),
('Evening','4:00 PM',11),
('Evening','4:30 PM',12),
('Evening','5:00 PM',13),
('Evening','5:30 PM',14),
('Evening','6:00 PM',15),
('Evening','6:30 PM',16),
('Night','7:00 PM',17),
('Night','7:30 PM',18),
('Night','8:00 PM',19),
('Night','8:30 PM',20),
('Night','9:00 PM',21);