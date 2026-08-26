export const SALON = {
  name: "Ozone Plus Unisex Salon & Spa",
  shortName: "Ozone Plus",
  phone: "+918421306060",
  phoneDisplay: "+91 84213 06060",
  whatsapp: "918421306060",
  addressLines: [
    "Monginiz Cakes, Besides, Near Kedar Hospital",
    "Opp. Delhi Chat, Dnyanesh Park",
    "New Sangavi, Krishna Chowk",
    "Pimpri-Chinchwad, Maharashtra – 411061",
  ],
  mapsQuery:
    "Ozone+Plus+Unisex+Salon+%26+Spa+Dnyanesh+Park+New+Sangavi+Krishna+Chowk+Pimpri-Chinchwad+411061",
  hours: [
    { day: "Monday – Friday", time: "10:00 AM – 9:30 PM" },
    { day: "Saturday", time: "9:00 AM – 10:00 PM" },
    { day: "Sunday", time: "9:00 AM – 9:00 PM" },
  ],
  rating: 4.8,
  reviewCount: 620,
} as const;

export const CATEGORIES = [
  "Hair",
  "Skin",
  "Spa",
  "Bridal",
  "Nails",
  "Waxing",
  "Threading",
  "Facials",
  "Massage",
  "Makeup",
  "Laser",
  "Packages",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const REVIEWS = [
  { name: "Aditi Joshi", initials: "AJ", rating: 5, text: "Easily the most premium salon in New Sangavi. The hair spa left my hair unbelievably soft and the interiors feel like a 5-star hotel." },
  { name: "Rahul Pawar", initials: "RP", rating: 5, text: "Booked a haircut online, got a slot in 10 minutes. Zero waiting, very hygienic and the stylist actually listened to what I wanted." },
  { name: "Sanika More", initials: "SM", rating: 5, text: "Did my bridal makeup here. The trial session was so detailed and the final look lasted through a 12-hour wedding day." },
  { name: "Imran Shaikh", initials: "IS", rating: 4, text: "Great beard styling and head massage. Slightly busy on weekends, so book in advance — worth it." },
  { name: "Neha Kadam", initials: "NK", rating: 5, text: "The advanced facial gave me a glow I've never had before. Products are genuine and the therapist explained every step." },
  { name: "Suresh Iyer", initials: "SI", rating: 5, text: "Clean, calm and professional. My whole family gets services here now — the packages are very reasonably priced." },
];

export const FAQS = [
  { q: "Do I need an appointment or can I walk in?", a: "Walk-ins are always welcome, but weekends and evenings fill up fast. Booking online holds your slot instantly and there is no booking fee." },
  { q: "Is Ozone Plus a unisex salon?", a: "Yes. We offer full hair, skin, spa and grooming services for men and women, with separate private rooms for spa and intimate services." },
  { q: "Which products do you use?", a: "We work only with professional lines such as L'Oréal Professionnel, Wella, Rica and Casmara — all genuine and sealed at the time of service." },
  { q: "Can I choose my stylist?", a: "Absolutely. Select a preferred stylist during booking, or let us assign the first available expert for the earliest slot." },
  { q: "What is your cancellation policy?", a: "Cancel or reschedule free of charge up to 4 hours before your appointment. Bridal bookings require 48 hours' notice." },
  { q: "Do you offer bridal packages at home?", a: "Yes, our mobile salon and bridal teams travel within 8 km of New Sangavi. Share your date and we'll confirm availability." },
];

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
