import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminCreateCoupon, adminDeleteCoupon, adminListCoupons, adminSetCouponActive } from "@/lib/admin.functions";
import { formatMoney } from "@/lib/pricing";

export function CouponsTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCoupons);
  const create = useServerFn(adminCreateCoupon);
  const setActive = useServerFn(adminSetCouponActive);
  const remove = useServerFn(adminDeleteCoupon);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "coupons"], queryFn: () => list() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] });

  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [active, setActiveNew] = useState(true);

  const createMut = useMutation({
    mutationFn: () => create({ data: { code, discount_type: type, value: Number(value), active } }),
    onSuccess: (res) => {
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Coupon ${code.toUpperCase()} created`);
      setCode("");
      setValue("");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't create coupon"),
  });
  const toggleMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => setActive({ data: v }),
    onSuccess: refresh,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: refresh,
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!code.trim() || !Number.isFinite(n) || n <= 0) return void toast.error("Enter a code and a positive value");
    if (type === "percent" && n > 100) return void toast.error("A percentage can't be more than 100");
    createMut.mutate();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
      <form onSubmit={onSubmit} className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-serif text-2xl">New promo code</h2>
        <div className="space-y-1.5">
          <Label htmlFor="c-code">Code name</Label>
          <Input id="c-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="COZYWINTER" maxLength={40} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-type">Discount type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "percent" | "fixed")}>
              <SelectTrigger id="c-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed amount ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-value">Value</Label>
            <Input id="c-value" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "percent" ? "15" : "5.00"} />
          </div>
        </div>
        <label className="flex items-center justify-between rounded-xl bg-linen px-4 py-3 text-sm">
          Active right away
          <Switch checked={active} onCheckedChange={setActiveNew} />
        </label>
        <Button type="submit" className="w-full rounded-full" disabled={createMut.isPending}>
          {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create coupon
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-serif text-2xl">Coupons</h2>
          <p className="text-sm text-muted-foreground">{data ? `${data.filter((c) => c.active).length} active of ${data.length}` : "\u00a0"}</p>
        </div>
        {isLoading ? (
          <Loader2 className="mx-auto my-10 size-6 animate-spin text-muted-foreground" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="pr-6 text-right">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-6 font-mono font-semibold">{c.code}</TableCell>
                  <TableCell>{c.discount_type === "percent" ? `${Number(c.value)}% off` : `${formatMoney(Number(c.value))} off`}</TableCell>
                  <TableCell>
                    <Switch checked={c.active} onCheckedChange={(v) => toggleMut.mutate({ id: c.id, active: v })} aria-label={`Toggle ${c.code}`} />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${c.code}`}
                      onClick={() => {
                        if (window.confirm(`Delete coupon ${c.code}?`)) deleteMut.mutate(c.id);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
