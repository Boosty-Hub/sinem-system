import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  setProducts: (fn: (prev: Product[]) => Product[]) => void;
}

const CATEGORIES = [
  { key: "SE", label: "SE - Smart Infrastructure" },
  { key: "DI", label: "DI - Digital Industries" },
  { key: "MO", label: "MO - Mobility" },
  { key: "EP", label: "EP - Energy" },
];

const ProductsDialog = ({ open, onOpenChange, products, setProducts }: Props) => {
  const { toast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("SE");
  const [search, setSearch] = useState("");

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setEditId(null); setName(""); setCategory("SE"); };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editId) {
      setProducts((prev) => prev.map((p) => p.id === editId ? { ...p, name: name.trim(), category } : p));
      toast({ title: "Producto actualizado" });
    } else {
      const newProduct: Product = { id: crypto.randomUUID(), name: name.trim(), category };
      setProducts((prev) => [...prev, newProduct]);
      toast({ title: "Producto creado" });
    }
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setEditId(product.id);
    setName(product.name);
    setCategory(product.category);
  };

  const handleDelete = (product: Product) => {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    if (editId === product.id) resetForm();
    toast({ title: "Producto eliminado" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Catálogo de Productos
          </DialogTitle>
        </DialogHeader>

        {/* Add/Edit form */}
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Nombre del producto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.key}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
            {editId ? "Guardar" : <><Plus className="h-4 w-4 mr-1" /> Crear</>}
          </Button>
          {editId && (
            <Button size="sm" variant="outline" onClick={resetForm}>Cancelar</Button>
          )}
        </div>

        {/* Search */}
        <Input
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2"
        />

        {/* Product list */}
        <div className="space-y-1 mt-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay productos</p>
          ) : (
            filtered.map((product) => {
              const catLabel = CATEGORIES.find((c) => c.key === product.category)?.label ?? product.category;
              return (
                <div
                  key={product.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg group transition-colors ${
                    editId === product.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground">{catLabel}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(product)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(product)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductsDialog;
