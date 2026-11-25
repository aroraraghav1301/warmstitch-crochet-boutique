import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, CheckCircle2, Copy, IndianRupee, Loader2, Lock, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CouponField } from "@/components/store/CartDrawer";
import { useCart } from "@/lib/cart";
import { imageUrl } from "@/lib/catalog";
import { formatMoney } from "@/lib/pricing";
import { placeOrder, type PlacedOrder } from "@/lib/store.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — WarmStitch" },
      { name: "description", content: "Complete your WarmStitch order of handmade crochet goods." },
      { property: "og:title", content: "Checkout — WarmStitch" },
      { property: "og:description", content: "Complete your WarmStitch order of handmade crochet goods." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const formSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  line1: z.string().trim().min(1, "Please enter your street address").max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().min(1, "Please enter your city").max(100),
  state: z.string().trim().min(1, "Please enter your state or region").max(100),
  postalCode: z.string().trim().min(1, "Please enter your postal code").max(20),
  country: z.string().trim().min(1, "Please enter your country").max(100),
});
type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = { name: "", email: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "India" };

type PaymentMethod = "cod" | "upi";

function upiUri(upiId: string, amount: number, orderNumber: string) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: "WarmStitch",
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Order ${orderNumber}`,
  });
  return `upi://pay?${params.toString()}`;
}

async function openUpiApp(uri: string) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { AppLauncher } = await import("@capacitor/app-launcher");
      const { value } = await AppLauncher.canOpenUrl({ url: uri });
      if (!value) {
        toast.error("No UPI app found on this device");
        return;
      }
      await AppLauncher.openUrl({ url: uri });
      return;
    }
  } catch {
    // fall through to the browser deep link
  }
  window.location.href = uri;
}

function CheckoutPage() {
  const cart = useCart();
  const submit = useServerFn(placeOrder);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  if (placed) return <Confirmation order={placed} />;

  if (!cart.hydrated) {
    return (
      <div className="flex justify-center py-32 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-serif text-4xl">Your bag is empty</h1>
        <p className="mt-3 text-muted-foreground">Add a cozy piece or two, then come back to check out.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/" hash="collection">Browse the collection</Link></Button>
      </div>
    );
  }

  const set = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof FormValues] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await submit({
        data: {
          items: cart.lines.map((l) => ({ productId: l.productId, color: l.color, quantity: l.quantity })),
          couponCode: cart.coupon?.code ?? null,
          customer: { ...parsed.data, line2: parsed.data.line2 || null },
          note: cart.note.trim() || null,
          paymentMethod,
        },
      });
      if (res.ok) {
        setPlaced(res.order);
        cart.clear();
        window.scrollTo({ top: 0 });
      } else setServerError(res.error);
    } catch {
      setServerError("Something went wrong placing your order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof FormValues, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={values[k]} onChange={set(k)} aria-invalid={!!errors[k]} className="h-11 bg-card" {...props} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Checkout</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <form onSubmit={onSubmit} className="space-y-8" noValidate>
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
            <h2 className="font-serif text-xl sm:text-2xl">Your details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", "Full name", { autoComplete: "name", maxLength: 100 })}
              {field("email", "Email", { type: "email", autoComplete: "email", maxLength: 255 })}
            </div>
          </section>
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
            <h2 className="font-serif text-xl sm:text-2xl">Shipping address</h2>
            {field("line1", "Street address", { autoComplete: "address-line1", maxLength: 200 })}
            {field("line2", "Apartment, suite (optional)", { autoComplete: "address-line2", maxLength: 200 })}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("city", "City", { autoComplete: "address-level2", maxLength: 100 })}
              {field("state", "State / region", { autoComplete: "address-level1", maxLength: 100 })}
              {field("postalCode", "Postal code", { autoComplete: "postal-code", maxLength: 20 })}
              {field("country", "Country", { autoComplete: "country-name", maxLength: 100 })}
            </div>
          </section>
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
            <h2 className="font-serif text-xl sm:text-2xl">Order note</h2>
            <Label htmlFor="note" className="sr-only">Order notes or gift message</Label>
            <Textarea
              id="note"
              value={cart.note}
              onChange={(e) => cart.setNote(e.target.value)}
              placeholder="Gift message, color questions, or anything we should know (optional)"
              maxLength={1000}
              rows={4}
              className="bg-background"
            />
          </section>
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
            <h2 className="font-serif text-xl sm:text-2xl">Payment</h2>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Choose a payment method</legend>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                  paymentMethod === "cod" ? "border-primary bg-terracotta-soft/40" : "border-border bg-background hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="mt-1 size-4 accent-[#C86D51]"
                />
                <span>
                  <span className="flex items-center gap-1.5 font-medium"><Banknote className="size-4 text-primary" /> Cash on delivery</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Pay in cash when your parcel arrives.</span>
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                  paymentMethod === "upi" ? "border-primary bg-terracotta-soft/40" : "border-border bg-background hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value="upi"
                  checked={paymentMethod === "upi"}
                  onChange={() => setPaymentMethod("upi")}
                  className="mt-1 size-4 accent-[#C86D51]"
                />
                <span>
                  <span className="flex items-center gap-1.5 font-medium"><QrCode className="size-4 text-primary" /> Instant pay (UPI)</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Scan a QR code and pay from any UPI app.</span>
                </span>
              </label>
            </fieldset>
          </section>
          {serverError && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}
          <Button type="submit" size="lg" disabled={busy} className="w-full rounded-full text-base">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-4" />}
            {busy ? "Placing your order…" : `Place order · ${formatMoney(cart.totals.total)}`}
          </Button>
        </form>

        <aside className="h-fit space-y-5 rounded-2xl border border-border bg-linen p-5 sm:p-6 lg:sticky lg:top-28">
          <h2 className="font-serif text-2xl">Order summary</h2>
          <ul className="space-y-4">
            {cart.lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3">
                <div className="relative">
                  <img src={imageUrl(l.image, 160)} alt="" className="size-16 rounded-lg object-cover" />
                  <span className="absolute -right-2 -top-2 rounded-full bg-foreground px-1.5 text-[11px] font-bold leading-5 text-background">{l.quantity}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.name}</p>
                  {l.color && <p className="text-xs text-muted-foreground">{l.color}</p>}
                </div>
                <p className="text-sm font-semibold">{formatMoney(l.unitPrice * l.quantity)}</p>
              </li>
            ))}
          </ul>
          <CouponField />
          <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatMoney(cart.totals.subtotal)}</dd></div>
            {cart.totals.discount > 0 && (
              <div className="flex justify-between text-primary"><dt>Discount ({cart.coupon?.code})</dt><dd>−{formatMoney(cart.totals.discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>Free</dd></div>
            <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold"><dt>Total</dt><dd>{formatMoney(cart.totals.total)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Confirmation({ order }: { order: PlacedOrder }) {
  const isUpi = order.paymentMethod === "upi";
  const upiId = order.upiId ?? "";
  const payLink = isUpi && upiId ? upiUri(upiId, order.total, order.orderNumber) : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-lift sm:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-sage-soft text-sage">
          <CheckCircle2 className="size-9" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-sage">Order confirmed</p>
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Thank you, {order.customerName.split(" ")[0]}!</h1>
        <p className="mt-3 text-muted-foreground">
          Your order <span className="font-semibold text-foreground">{order.orderNumber}</span> is in. We'll start
          wrapping (or hooking) your pieces and reach out at {order.customerEmail}.
        </p>

        {isUpi && upiId ? (
          <div className="mt-8 rounded-2xl border border-border bg-linen p-6 text-left">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="shrink-0 rounded-2xl bg-white p-3 shadow-soft">
                <QRCodeSVG value={payLink} size={188} level="M" marginSize={0} />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:justify-start">
                  <IndianRupee className="size-3.5" /> Amount due
                </p>
                <p className="mt-1 font-serif text-4xl">{formatMoney(order.total)}</p>
                <p className="mt-3 break-all text-sm text-muted-foreground">
                  Pay to <span className="font-semibold text-foreground">{upiId}</span> using GPay, PhonePe, Paytm or any UPI app.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Button type="button" size="sm" className="rounded-full" onClick={() => openUpiApp(payLink)}>
                    Open UPI app
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={async () => {
                      await navigator.clipboard.writeText(upiId);
                      toast.success("UPI ID copied");
                    }}
                  >
                    <Copy className="size-4" /> Copy UPI ID
                  </Button>
                </div>
                <p className="mt-4 rounded-xl bg-card px-3 py-2 text-xs text-muted-foreground">
                  Payment pending — we'll confirm your order as paid once the transfer reaches our UPI account.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-border bg-linen p-5 text-sm">
            <p className="flex items-center justify-center gap-2 font-medium">
              <Banknote className="size-4 text-primary" /> Cash on delivery
            </p>
            <p className="mt-1 text-muted-foreground">
              Please keep {formatMoney(order.total)} ready to pay when your order arrives.
            </p>
          </div>
        )}

        <ul className="mt-8 space-y-3 text-left">
          {order.items.map((i) => (
            <li key={i.productId + (i.color ?? "")} className="flex items-center gap-3 rounded-xl bg-linen p-3">
              <img src={imageUrl(i.image, 160)} alt="" className="size-14 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground">
                  {i.color ? `${i.color} · ` : ""}Qty {i.quantity} × {formatMoney(i.unitPrice)}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatMoney(i.lineTotal)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-1.5 border-t border-border pt-4 text-left text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatMoney(order.subtotal)}</dd></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-primary"><dt>Discount ({order.couponCode})</dt><dd>−{formatMoney(order.discount)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>Free</dd></div>
          <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
            <dt>{isUpi ? "Amount due" : "Amount due on delivery"}</dt>
            <dd>{formatMoney(order.total)}</dd>
          </div>
        </dl>
        {order.note && (
          <p className="mt-6 rounded-xl border border-dashed border-border p-4 text-left text-sm italic text-muted-foreground">“{order.note}”</p>
        )}
        <Button asChild size="lg" className="mt-8 rounded-full">
          <Link to="/">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
