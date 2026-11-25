import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, IndianRupee, Loader2, LogOut, Package, ReceiptText, TicketPercent } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductsTab } from "@/components/console/ProductsTab";
import { CouponsTab } from "@/components/console/CouponsTab";
import { OrdersTab } from "@/components/console/OrdersTab";
import { SettingsTab } from "@/components/console/SettingsTab";
import { getConsoleStatus, lockConsole, unlockConsole } from "@/lib/admin.functions";

export const Route = createFileRoute("/console")({
  loader: () => getConsoleStatus(),
  head: () => ({
    meta: [
      { title: "Studio console — WarmStitch" },
      { name: "description", content: "Private store management." },
      { property: "og:title", content: "Studio console — WarmStitch" },
      { property: "og:description", content: "Private store management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConsolePage,
});

function ConsolePage() {
  const { unlocked } = Route.useLoaderData();
  return unlocked ? <Dashboard /> : <PasscodeGate />;
}

function PasscodeGate() {
  const router = useRouter();
  const unlock = useServerFn(unlockConsole);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await unlock({ data: { passcode } });
      if (res.ok) await router.invalidate();
      else setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-weave px-4 py-8">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-full bg-terracotta-soft text-primary">
          <KeyRound className="size-5" />
        </div>
        <div>
          <h1 className="font-serif text-3xl">Studio console</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter the passcode to continue.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="passcode">Passcode</Label>
          <Input
            id="passcode"
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="h-11"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">That passcode isn't right.</p>}
        </div>
        <Button type="submit" className="w-full rounded-full" size="lg" disabled={busy || !passcode}>
          {busy && <Loader2 className="size-4 animate-spin" />} Unlock
        </Button>
      </form>
    </div>
  );
}

function Dashboard() {
  const router = useRouter();
  const lock = useServerFn(lockConsole);
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div>
            <p className="font-serif text-xl sm:text-2xl">
              Warm<span className="italic text-primary">Stitch</span> <span className="text-muted-foreground">studio</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={async () => {
              await lock();
              await router.invalidate();
            }}
          >
            <LogOut className="size-4" /> Lock
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 pb-16 sm:px-6 sm:py-8 lg:px-8">
        <Tabs defaultValue="orders">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted p-1.5 text-sm sm:inline-flex sm:w-auto sm:grid-cols-none sm:rounded-full sm:p-1">
            <TabsTrigger value="orders" className="justify-start gap-2 rounded-xl px-3 py-2.5 sm:justify-center sm:rounded-full sm:px-4 sm:py-2"><ReceiptText className="size-4 shrink-0" /> Orders</TabsTrigger>
            <TabsTrigger value="products" className="justify-start gap-2 rounded-xl px-3 py-2.5 sm:justify-center sm:rounded-full sm:px-4 sm:py-2"><Package className="size-4 shrink-0" /> Products</TabsTrigger>
            <TabsTrigger value="coupons" className="justify-start gap-2 rounded-xl px-3 py-2.5 sm:justify-center sm:rounded-full sm:px-4 sm:py-2"><TicketPercent className="size-4 shrink-0" /> Coupons</TabsTrigger>
            <TabsTrigger value="payments" className="justify-start gap-2 rounded-xl px-3 py-2.5 sm:justify-center sm:rounded-full sm:px-4 sm:py-2"><IndianRupee className="size-4 shrink-0" /> Payments</TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="mt-5 sm:mt-6"><OrdersTab /></TabsContent>
          <TabsContent value="products" className="mt-5 sm:mt-6"><ProductsTab /></TabsContent>
          <TabsContent value="coupons" className="mt-5 sm:mt-6"><CouponsTab /></TabsContent>
          <TabsContent value="payments" className="mt-5 sm:mt-6"><SettingsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
