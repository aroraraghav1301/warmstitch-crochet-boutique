import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Tag, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { imageUrl } from "@/lib/catalog";
import { formatMoney } from "@/lib/pricing";
import { checkCoupon } from "@/lib/store.functions";
import { QuantityStepper } from "./QuantityStepper";

export function CouponField() {
  const { coupon, applyCoupon } = useCart();
  const check = useServerFn(checkCoupon);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onApply(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await check({ data: { code: trimmed } });
      if (res.ok) {
        applyCoupon(res.coupon);
        setCode("");
      } else setError("That code isn't valid or has expired.");
    } catch {
      setError("Couldn't check that code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (coupon) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/50 bg-terracotta-soft px-3 py-2 text-sm">
        <span className="inline-flex items-center gap-2 font-medium text-accent-foreground">
          <Tag className="size-4" /> {coupon.code} ·{" "}
          {coupon.discount_type === "percent" ? `${coupon.value}% off` : `${formatMoney(coupon.value)} off`}
        </span>
        <button type="button" onClick={() => applyCoupon(null)} className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-foreground" aria-label="Remove coupon">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onApply} className="space-y-1.5">
      <label htmlFor="coupon" className="text-sm font-medium">Coupon code</label>
      <div className="flex gap-2">
        <input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. WELCOME10"
          maxLength={40}
          className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm uppercase outline-none placeholder:normal-case focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <Button type="submit" variant="outline" disabled={busy || !code.trim()}>
          {busy ? "Checking…" : "Apply"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

export function CartDrawer() {
  const cart = useCart();
  const navigate = useNavigate();
  const empty = cart.lines.length === 0;

  return (
    <Sheet open={cart.open} onOpenChange={cart.setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle className="font-serif text-2xl">Your bag</SheetTitle>
          <SheetDescription>
            {empty ? "Nothing here yet." : `${cart.count} handmade item${cart.count === 1 ? "" : "s"}`}
          </SheetDescription>
        </SheetHeader>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="rounded-full bg-linen p-6 text-primary">
              <Gift className="size-8" />
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              Your bag is waiting for something cozy. Browse the collection and add a piece you love.
            </p>
            <Button className="rounded-full" onClick={() => cart.setOpen(false)} asChild>
              <Link to="/" hash="collection">Shop the collection</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <ul className="space-y-4">
                {cart.lines.map((l) => (
                  <li key={l.key} className="flex gap-4 rounded-xl border border-border bg-card p-3">
                    <img src={imageUrl(l.image, 200)} alt="" className="size-20 shrink-0 rounded-lg object-cover" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-serif text-base leading-tight">{l.name}</p>
                          {l.color && <p className="text-xs text-muted-foreground">Color: {l.color}</p>}
                        </div>
                        <button type="button" onClick={() => cart.removeItem(l.key)} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Remove ${l.name}`}>
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <QuantityStepper size="sm" value={l.quantity} max={l.maxQty} onChange={(n) => cart.setQuantity(l.key, n)} />
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatMoney(l.unitPrice * l.quantity)}</p>
                          {l.unitPrice < l.regularPrice && (
                            <p className="text-xs text-muted-foreground line-through">{formatMoney(l.regularPrice * l.quantity)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <CouponField />

              <div className="space-y-1.5">
                <label htmlFor="cart-note" className="text-sm font-medium">Order notes / gift message <span className="font-normal text-muted-foreground">(optional)</span></label>
                <Textarea
                  id="cart-note"
                  value={cart.note}
                  onChange={(e) => cart.setNote(e.target.value)}
                  placeholder="Wrapping it as a gift? Write your message here."
                  maxLength={1000}
                  rows={3}
                  className="bg-card"
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-border bg-linen px-6 py-5">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatMoney(cart.totals.subtotal)}</dd></div>
                {cart.totals.discount > 0 && (
                  <div className="flex justify-between text-primary"><dt>Discount ({cart.coupon?.code})</dt><dd>−{formatMoney(cart.totals.discount)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>Free</dd></div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(cart.totals.total)}</dd></div>
              </dl>
              <Button
                size="lg"
                className="w-full rounded-full"
                onClick={() => {
                  cart.setOpen(false);
                  navigate({ to: "/checkout" });
                }}
              >
                Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
