import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Link2, Loader2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUpload, adminFinishUpload, adminSaveProduct } from "@/lib/admin.functions";
import { CATEGORIES, imageUrl, type Category, type Product } from "@/lib/catalog";

type Form = {
  name: string;
  category: Category;
  description: string;
  materials: string;
  colors: string;
  images: string[];
  price: string;
  sale_price: string;
  stock: string;
  made_to_order: boolean;
  sold_out: boolean;
};

const blank: Form = {
  name: "",
  category: "wearables",
  description: "",
  materials: "",
  colors: "",
  images: [],
  price: "",
  sale_price: "",
  stock: "0",
  made_to_order: false,
  sold_out: false,
};

function fromProduct(p: Product): Form {
  return {
    name: p.name,
    category: p.category as Category,
    description: p.description,
    materials: p.materials,
    colors: p.colors.join(", "),
    images: p.images,
    price: String(p.price),
    sale_price: p.sale_price != null ? String(p.sale_price) : "",
    stock: String(p.stock),
    made_to_order: p.made_to_order,
    sold_out: p.sold_out,
  };
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: Product | null;
  onSaved: () => void;
}) {
  const save = useServerFn(adminSaveProduct);
  const createUpload = useServerFn(adminCreateUpload);
  const finishUpload = useServerFn(adminFinishUpload);
  const [form, setForm] = useState<Form>(blank);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(product ? fromProduct(product) : blank);
      setUrlInput("");
    }
  }, [open, product]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function addUrl() {
    const u = urlInput.trim();
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "https:") throw new Error();
    } catch {
      return void toast.error("Paste a full image link starting with https://");
    }
    set("images", [...form.images, u].slice(0, 10));
    setUrlInput("");
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, 10 - form.images.length)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10 MB`);
          continue;
        }
        const { path, token } = await createUpload({ data: { filename: file.name } });
        const { error } = await supabase.storage.from("product-images").uploadToSignedUrl(path, token, file, {
          contentType: file.type,
        });
        if (error) throw error;
        const { url } = await finishUpload({ data: { path } });
        added.push(url);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...added].slice(0, 10) }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const sale = form.sale_price.trim() === "" ? null : Number(form.sale_price);
    const stock = Number(form.stock || 0);
    if (!form.name.trim()) return void toast.error("Give the product a name");
    if (!Number.isFinite(price) || price < 0) return void toast.error("Enter a valid regular price");
    if (sale != null && (!Number.isFinite(sale) || sale < 0 || sale >= price))
      return void toast.error("Sale price must be lower than the regular price");
    if (!Number.isInteger(stock) || stock < 0) return void toast.error("Stock must be a whole number");
    if (form.images.length === 0) return void toast.error("Add at least one photo");

    setSaving(true);
    try {
      await save({
        data: {
          id: product?.id,
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          materials: form.materials.trim(),
          images: form.images,
          colors: form.colors.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 12),
          price,
          sale_price: sale,
          stock,
          made_to_order: form.made_to_order,
          sold_out: form.sold_out,
        },
      });
      toast.success(product ? "Product updated" : "Product added");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl sm:text-2xl">{product ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>Shoppers see changes as soon as you save.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cat">Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v as Category)}>
                <SelectTrigger id="p-cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea id="p-desc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-mat">Yarn & materials</Label>
              <Textarea id="p-mat" rows={2} value={form.materials} onChange={(e) => set("materials", e.target.value)} maxLength={1000} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-colors">Color options <span className="font-normal text-muted-foreground">(comma separated)</span></Label>
              <Textarea id="p-colors" rows={2} value={form.colors} onChange={(e) => set("colors", e.target.value)} placeholder="Oat Cream, Sage, Rust" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Images</Label>
            <div className="flex flex-wrap gap-3">
              {form.images.map((src, i) => (
                <div key={src + i} className="group relative size-20 overflow-hidden rounded-lg border border-border">
                  <img src={imageUrl(src, 160)} alt="" className="size-full object-cover" />
                  {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-foreground/70 text-center text-[10px] text-background">Cover</span>}
                  <button type="button" aria-label="Remove image" onClick={() => set("images", form.images.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-card/95 p-1 opacity-100 shadow-soft transition-opacity sm:bg-card/90 sm:p-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-xs text-muted-foreground hover:border-primary hover:text-primary">
                {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                Upload
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} disabled={uploading} />
              </label>
            </div>
            <div className="flex gap-2">
              <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="…or paste an image link (https://)" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} />
              <Button type="button" variant="outline" onClick={addUrl} disabled={!urlInput.trim()}><Link2 className="size-4" /> Add</Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Regular price (₹)</Label>
              <Input id="p-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sale">Sale price (₹)</Label>
              <Input id="p-sale" type="number" min="0" step="0.01" value={form.sale_price} onChange={(e) => set("sale_price", e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-stock">Stock quantity</Label>
              <Input id="p-stock" type="number" min="0" step="1" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl bg-linen px-4 py-3 text-sm">
              <span><span className="font-medium">Made to order</span><br /><span className="text-xs text-muted-foreground">Sell without stock limits</span></span>
              <Switch checked={form.made_to_order} onCheckedChange={(v) => set("made_to_order", v)} />
            </label>
            <label className="flex items-center justify-between rounded-xl bg-linen px-4 py-3 text-sm">
              <span><span className="font-medium">Sold out</span><br /><span className="text-xs text-muted-foreground">Hide the Add button for now</span></span>
              <Switch checked={form.sold_out} onCheckedChange={(v) => set("sold_out", v)} />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || uploading} className="rounded-full">
              {saving && <Loader2 className="size-4 animate-spin" />} {product ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
