import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StockBadge } from "@/components/store/StockBadge";
import { PriceTag } from "@/components/store/PriceTag";
import { adminDeleteProduct, adminListProducts, adminSetSoldOut } from "@/lib/admin.functions";
import { categoryLabel, imageUrl, stockStatus, type Product } from "@/lib/catalog";
import { ProductDialog } from "./ProductDialog";

export function ProductsTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListProducts);
  const setSoldOut = useServerFn(adminSetSoldOut);
  const remove = useServerFn(adminDeleteProduct);
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "products"], queryFn: () => list() });
  const [editing, setEditing] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["product"] });
  };

  const soldOutMut = useMutation({
    mutationFn: (v: { id: string; soldOut: boolean }) => setSoldOut({ data: v }),
    onSuccess: refresh,
    onError: () => toast.error("Couldn't update the product"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      refresh();
    },
    onError: () => toast.error("Couldn't delete the product"),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl">Products</h2>
          <p className="text-sm text-muted-foreground">{data ? `${data.length} items in the shop` : "\u00a0"}</p>
        </div>
        <Button className="shrink-0 rounded-full" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="size-4" /> Add Product
        </Button>
      </div>
      {isLoading ? (
        <Loader2 className="mx-auto my-12 size-6 animate-spin text-muted-foreground" />
      ) : isError ? (
        <p className="p-6 text-destructive">Couldn't load products.</p>
      ) : (
        <>
          {/* Phones: stacked cards instead of a sideways-scrolling table */}
          <ul className="divide-y divide-border md:hidden">
            {data?.map((p) => (
              <li key={p.id} className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <img src={imageUrl(p.images[0], 120)} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabel(p.category)} · {p.made_to_order ? "Made to order" : `${p.stock} in stock`}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <StockBadge status={stockStatus(p)} />
                      <PriceTag price={Number(p.price)} salePrice={p.sale_price != null ? Number(p.sale_price) : null} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={p.sold_out}
                      onCheckedChange={(v) => soldOutMut.mutate({ id: p.id, soldOut: v })}
                      aria-label={`Mark ${p.name} as sold out`}
                    />
                    Sold out
                  </label>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} onClick={() => { setEditing(p); setDialogOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`} onClick={() => setToDelete(p)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Tablets and up: full table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Sold out</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <img src={imageUrl(p.images[0], 120)} alt="" className="size-12 rounded-lg object-cover" />
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{categoryLabel(p.category)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><StockBadge status={stockStatus(p)} /></TableCell>
                    <TableCell className="tabular-nums">{p.made_to_order ? "—" : p.stock}</TableCell>
                    <TableCell><PriceTag price={Number(p.price)} salePrice={p.sale_price != null ? Number(p.sale_price) : null} /></TableCell>
                    <TableCell>
                      <Switch
                        checked={p.sold_out}
                        onCheckedChange={(v) => soldOutMut.mutate({ id: p.id, soldOut: v })}
                        aria-label={`Mark ${p.name} as sold out`}
                      />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} onClick={() => { setEditing(p); setDialogOpen(true); }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`} onClick={() => setToDelete(p)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} onSaved={refresh} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear from the shop right away. Past orders keep their details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (toDelete) deleteMut.mutate(toDelete.id); setToDelete(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
