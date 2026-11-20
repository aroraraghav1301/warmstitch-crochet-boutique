# WarmStitch Crochet Boutique

Build "WarmStitch", a full-fledged, cozy handmade crochet online store with a customer storefront and a hidden admin management console.

1. Brand Aesthetic & Design:
- Palette: Soft warm cream background (#FAF7F2), terracotta/amber accents (#C86D51), sage green, and warm charcoal text (#2C2A29).
- Styling: Artisanal, tactile, and boutique. Use elegant serif headers, clean sans-serif body, generous card padding, and subtle rounded corners.

2. Customer Storefront (Public Routes):
- Header: WarmStitch brand logo/text, category navigation (All, Wearables, Amigurumi & Toys, Home Decor, Accessories), search bar, and cart icon with item count badge. Zero admin or console links anywhere on the storefront.
- Hero Section: Warm handcrafted story banner ("Handmade with warmth, one stitch at a time") with a "Shop Collection" button.
- Catalog & Filters: Category pills, sorting (price, popularity), and responsive product grid.
- Product Card: High-resolution photo, category tag, title, original price with strikethrough and sale/discount badge if discounted, stock badge ("In Stock", "Sold Out", or "Made to Order"), and quick "Add to Cart" button (disabled or marked sold out when unavailable).
- Product Detail Modal / Page: Multi-image preview, detailed description, yarn material details, color variation picker, quantity selector, and "Add to Bag".
- Cart Drawer: Slide-out drawer showing line items with thumbnails, quantity steppers, subtotal, discount calculation, coupon code input (pre-configure a working sample coupon like "WELCOME10" for 10% off), an optional "Order notes / gift message" textarea, and a "Checkout" button.
- Checkout Flow: Collects customer name, email, shipping address, and order note, calculates final total, and displays an order confirmation screen upon submission.

3. Order Notification Email:
- On order placement, save the order to the database and trigger an email notification to raghavarora1301@gmail.com.
- Email contents: Order ID, customer details, list of items with product names, thumbnail image URLs, quantities, item prices, applied coupon/discount, total price, and the optional customer note.

4. Hidden Admin Console (/console):
- Accessible ONLY via direct URL navigation to `/console` (no customer-facing buttons or hints).
- Security gate: Simple admin passcode prompt (e.g. default PIN `admin123`) before revealing the dashboard.
- Dashboard Tabs:
  a. Products Tab: Table of all products with status, stock, and prices. "Add Product" dialog with fields for Name, Category, Description, Images (upload or URL), Regular Price, Sale/Discount Price, Stock Quantity, and Made-to-order toggle. Each product must also have a "Sold Out" option (mark/toggle as sold out) and a "Delete" option in the console.
  b. Discounts & Coupons Tab: List active coupons. Ability to create new promo codes with code name, discount type (percentage or fixed dollar amount), discount value, and active/inactive toggle.
  c. Orders Tab: Real-time list of all placed customer orders with customer info, line items, thumbnails, total amount, customer note, and fulfillment status toggle (Pending / Completed).

5. Initial Seed Data:
- Pre-populate 5 realistic crochet items with authentic Unsplash yarn/crochet photos:
  1. Chunky Cable Knit Blanket ($85, on sale from $100)
  2. Amigurumi Sleepy Bear ($32)
  3. Daisy Granny Square Tote Bag ($45)
  4. Slouchy Merino Wool Beanie ($28, on sale from $35)
  5. Ribbed Plant Pot Cozy ($18)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/52720de2-ace8-4155-96a4-dc8618dc46b2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
