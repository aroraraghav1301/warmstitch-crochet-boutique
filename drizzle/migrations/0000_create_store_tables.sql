CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('wearables','amigurumi','home-decor','accessories')),
  description text NOT NULL DEFAULT '',
  materials text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}',
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  sale_price numeric(10,2) CHECK (sale_price IS NULL OR sale_price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  made_to_order boolean NOT NULL DEFAULT false,
  sold_out boolean NOT NULL DEFAULT false,
  popularity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  value numeric(10,2) NOT NULL CHECK (value > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL,
  note text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  coupon_code text,
  total numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

INSERT INTO public.coupons (code, discount_type, value, active) VALUES ('WELCOME10', 'percent', 10, true);

INSERT INTO public.products (slug, name, category, description, materials, images, colors, price, sale_price, stock, made_to_order, popularity) VALUES
('chunky-cable-knit-blanket', 'Chunky Cable Knit Blanket', 'home-decor',
 'An heirloom-weight throw worked in plump, oversized loops that hold warmth like a hug. Drape it over the sofa for slow Sunday mornings or fold it at the foot of the bed. Each blanket takes around 14 hours to hand-loop, so no two are exactly alike.',
 '100% chunky merino-blend chenille, 1.5" loops. Approx. 50" × 60". Spot clean or gentle cold hand wash, dry flat.',
 ARRAY['https://images.unsplash.com/photo-1674475760738-8c7af859f821','https://images.unsplash.com/photo-1674475762498-75310193b4f4','https://images.unsplash.com/photo-1605189549971-305d135c8269'],
 ARRAY['Oat Cream','Storm Grey','Sage'], 100, 85, 6, false, 48),
('amigurumi-sleepy-bear', 'Amigurumi Sleepy Bear', 'amigurumi',
 'A drowsy little companion with embroidered closed eyes and a rosy scarf, crocheted in tight, safe stitches and stuffed until perfectly squishy. Made for naps, bedtime stories, and being carried everywhere.',
 'Soft cotton yarn, hypoallergenic polyester fill, embroidered safety features (no buttons). Approx. 9" tall.',
 ARRAY['https://images.unsplash.com/photo-1602773974733-b56200c8653f','https://images.unsplash.com/photo-1753370230699-8e21227afeb6','https://images.unsplash.com/photo-1686151271777-12efa81f65e0'],
 ARRAY['Honey Brown','Blush Pink','Cream'], 32, NULL, 12, false, 72),
('daisy-granny-square-tote', 'Daisy Granny Square Tote Bag', 'accessories',
 'Sunny granny squares joined by hand into a roomy market tote, finished with sturdy braided straps. Fits a book, a sweater, and a bunch of tulips from the farmers market.',
 'Mercerized cotton, fully lined with linen, reinforced straps. Approx. 14" × 13".',
 ARRAY['https://images.unsplash.com/photo-1789406075648-fd2688a93865','https://images.unsplash.com/photo-1567303594219-01425314f0fb','https://images.unsplash.com/photo-1594638963668-52eb9798e8ca'],
 ARRAY['Meadow Multi','Terracotta & Cream','Ocean Blue'], 45, NULL, 0, true, 35),
('slouchy-merino-wool-beanie', 'Slouchy Merino Wool Beanie', 'wearables',
 'A relaxed, slouchy fit in deep ribbing that folds into a cozy brim. Soft enough for all-day wear and warm enough for the first snow.',
 '100% extra-fine merino wool. One size fits most adults. Hand wash cold, lay flat to dry.',
 ARRAY['https://images.unsplash.com/photo-1674433859621-979ae6e39c1a','https://images.unsplash.com/photo-1547449604-6fde1c1b306e','https://images.unsplash.com/photo-1543334270-a1c233b25539'],
 ARRAY['Camel','Rust Red','Charcoal'], 35, 28, 15, false, 60),
('ribbed-plant-pot-cozy', 'Ribbed Plant Pot Cozy', 'home-decor',
 'Dress up a plain nursery pot with a ribbed crochet sleeve in warm earthy tones. A small, cheerful way to bring texture to windowsills and shelves.',
 'Recycled cotton cord. Fits 4–5" pots (pot and plant not included). Machine wash cold in a laundry bag.',
 ARRAY['https://images.unsplash.com/photo-1689999015707-7734e1962dd4','https://images.unsplash.com/photo-1667333638944-d911a1c0526f','https://images.unsplash.com/photo-1783943579121-da2fab12bbf9'],
 ARRAY['Terracotta','Sage','Natural'], 18, NULL, 20, false, 41);