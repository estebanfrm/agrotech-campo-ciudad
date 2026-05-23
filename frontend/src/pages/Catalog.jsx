import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import ProductCard from "../components/ProductCard.jsx";
import { apiRequest } from "../lib/api.js";

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categories = useMemo(() => [...new Set(products.map((product) => product.categoria))].sort(), [products]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoria) params.set("categoria", categoria);

    setLoading(true);
    apiRequest(`/products/${params.toString() ? `?${params.toString()}` : ""}`, { signal: controller.signal })
      .then(setProducts)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [search, categoria]);

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-forest">Catálogo agrícola</h1>
          <p className="mt-2 text-gray-600">Productos disponibles publicados por productores rurales.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_220px] md:min-w-[560px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-gray-400" size={18} />
            <input className="field pl-10" placeholder="Buscar por nombre" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select className="field" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? (
        <div className="panel p-8 text-center font-semibold text-gray-600">Cargando productos...</div>
      ) : products.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="panel p-8 text-center font-semibold text-gray-600">No hay productos disponibles con esos filtros.</div>
      )}
    </section>
  );
}
