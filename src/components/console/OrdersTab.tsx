import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Loader2, MessageSquareQuote } from "lucide-react";
import { useState } from "react";
import { adminListOrders, adminSetOrderStatus, type OrderRow } from "@/lib/admin.functions";
import { imageUrl } from "@/lib/catalog";
import { formatMoney } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function OrdersTab() {
  const list = useServerFn(adminListOrders);
  const setStatus = useServerFn(adminSetOrderStatus);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => list(),
    refetchInterval: 5000,
  });
  const mutation = useMutation({
    mutationFn: (v: { id: string; status: "pending" | "completed" }) => setStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });

  if (isLoading) return <Loader2 className="mx-auto mt-16 size-6 animate-spin text-muted-foreground" />;
  if (isError || !data) return <p className="text-destructive">Couldn't load orders. Try unlocking the console again.</p>;

  const pending = data.filter((o) => o.status === "pending").length;
  const revenue = data.reduce((s, o) => s + Number(o.total), 0);
  const shown = filter === "all" ? data : data.filter((o) => o.status === filter);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total orders" value={String(data.length)} />
        <Stat label="Pending" value={String(pending)} accent />
        <Stat label="Revenue" value={formatMoney(revenue)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["all", "pending", "completed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm capitalize",
                filter === f ? "border-foreground bg-foreground text-background" : "border-border bg-card",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-sage opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-sage" /></span>
          Live — new orders appear automatically
        </p>
      </div>
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">No orders yet.</div>
      ) : (
        <div className="space-y-4">
          {shown.map((o) => (
            <OrderCard key={o.id} order={o} busy={mutation.isPending && mutation.variables?.id === o.id} onToggle={() => mutation.mutate({ id: o.id, status: o.status === "pending" ? "completed" : "pending" })} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-border p-5", accent ? "bg-terracotta-soft" : "bg-card")}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
    </div>
  );
}

function OrderCard({ order, onToggle, busy }: { order: OrderRow; onToggle: () => void; busy: boolean }) {
  const done = order.status === "completed";
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-serif text-xl">{order.order_number}</p>
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            done ? "bg-sage-soft text-secondary-foreground hover:bg-secondary" : "bg-accent text-accent-foreground hover:bg-terracotta-soft",
          )}
          aria-label={`Mark order ${order.order_number} as ${done ? "pending" : "completed"}`}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : done ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
          {done ? "Completed" : "Pending"}
        </button>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{order.customer_name}</p>
          <p className="text-muted-foreground">{order.customer_email}</p>
          <p className="text-muted-foreground">
            {order.address_line1}
            {order.address_line2 ? `, ${order.address_line2}` : ""}
            <br />
            {order.city}, {order.state} {order.postal_code}
            <br />
            {order.country}
          </p>
          {order.note && (
            <p className="mt-3 flex gap-2 rounded-xl bg-linen p-3 italic text-foreground/80">
              <MessageSquareQuote className="size-4 shrink-0 text-primary" /> {order.note}
            </p>
          )}
        </div>
        <div>
          <ul className="space-y-2">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <img src={imageUrl(i.image, 120)} alt="" className="size-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{i.color ? `${i.color} · ` : ""}{i.quantity} × {formatMoney(i.unitPrice)}</p>
                </div>
                <p className="text-sm font-medium">{formatMoney(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatMoney(order.subtotal)}</dd></div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-primary"><dt>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</dt><dd>−{formatMoney(order.discount)}</dd></div>
            )}
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatMoney(order.total)}</dd></div>
          </dl>
        </div>
      </div>
    </article>
  );
}
