import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
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

const EMPTY: FormValues = { name: "", email: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "United States" };

function CheckoutPage() {
  const cart = useCart();
  const submit = useServerFn(placeOrder);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

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
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-2xl">Your details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", "Full name", { autoComplete: "name", maxLength: 100 })}
              {field("email", "Email", { type: "email", autoComplete: "email", maxLength: 255 })}
            </div>
          </section>
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-2xl">Shipping address</h2>
            {field("line1", "Street address", { autoComplete: "address-line1", maxLength: 200 })}
            {field("line2", "Apartment, suite (optional)", { autoComplete: "address-line2", maxLength: 200 })}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("city", "City", { autoComplete: "address-level2", maxLength: 100 })}
              {field("state", "State / region", { autoComplete: "address-level1", maxLength: 100 })}
              {field("postalCode", "Postal code", { autoComplete: "postal-code", maxLength: 20 })}
              {field("country", "Country", { autoComplete: "country-name", maxLength: 100 })}
            </div>
          </section>
          <section className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-2xl">Order note</h2>
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

        <aside className="h-fit space-y-5 rounded-2xl border border-border bg-linen p-6 lg:sticky lg:top-28">
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
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-lift sm:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-sage-soft text-sage">
          <CheckCircle2 className="size-9" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-sage">Order confirmed</p>
        <h1 className="mt-2 font-serif text-4xl">Thank you, {order.customerName.split(" ")[0]}!</h1>
        <p className="mt-3 text-muted-foreground">
          Your order <span className="font-semibold text-foreground">{order.orderNumber}</span> is in. We'll start
          wrapping (or hooking) your pieces and reach out at {order.customerEmail}.
        </p>

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
          <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold"><dt>Total paid</dt><dd>{formatMoney(order.total)}</dd></div>
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
