import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { IndianRupee, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminGetSettings, adminSaveUpiId } from "@/lib/admin.functions";

export function SettingsTab() {
  const getSettings = useServerFn(adminGetSettings);
  const saveUpi = useServerFn(adminSaveUpiId);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => getSettings(),
  });
  const [upiId, setUpiId] = useState("");

  useEffect(() => {
    if (data) setUpiId(data.upiId);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => saveUpi({ data: { upiId } }),
    onSuccess: (res) => {
      toast.success(res.upiId ? "UPI ID saved" : "UPI ID cleared");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't save the UPI ID"),
  });

  if (isLoading) return <Loader2 className="mx-auto mt-16 size-6 animate-spin text-muted-foreground" />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-terracotta-soft text-primary">
            <IndianRupee className="size-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl">Instant pay settings</h2>
            <p className="text-sm text-muted-foreground">Where customers' UPI payments land.</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Label htmlFor="upi-id">UPI ID</Label>
          <Input
            id="upi-id"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="warmstitch@okhdfcbank"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={120}
            className="h-11 bg-background"
          />
          <p className="text-xs text-muted-foreground">
            The QR code on the checkout screen pays into this ID. Leave it empty to hide Instant Pay for customers.
          </p>
        </div>

        <Button
          type="button"
          className="mt-5 rounded-full"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save UPI ID
        </Button>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-linen p-5 text-sm text-muted-foreground">
        UPI payments are confirmed by you. After the amount shows in your UPI app, open the Orders tab and press
        <span className="font-semibold text-foreground"> Mark paid</span> on that order.
      </div>
    </div>
  );
}
