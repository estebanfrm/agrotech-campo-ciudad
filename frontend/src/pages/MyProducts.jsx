import { Edit, PackagePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest, statusLabel, toCurrency } from "../lib/api.js";

export default function MyProducts() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadProducts = () => {
    setLoading(true);
    apiRequest("/products/?mine=true")
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("¿Eliminar este producto?");
    if (!confirmed) return;
    try {
      await apiRequest(`/products/${id}/`, { method: "DELETE" });
      loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-forest">Mis productos</h1>
          <p className="mt-2 text-gray-600">Gestiona las publicaciones de tu finca o asociación.</p>
        </div>
        <Link className="btn-primary" to="/productos/nuevo">
          <PackagePlus size={16} /> Crear producto
        </Link>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? (
        <div className="panel p-8 text-center font-semibold text-gray-600">Cargando productos...</div>
      ) : products.length ? (
        <div className="grid gap-4">
          {products.map((product) => (
            <article className="panel grid gap-4 p-5 md:grid-cols-[1fr_auto]" key={product.id}>
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge bg-mint text-forest">{product.categoria}</span>
                  <span className="badge bg-wheat text-forest">{statusLabel(product.estado)}</span>
                </div>
                <h2 className="mt-3 text-xl font-black text-ink">{product.nombre}</h2>
                <p className="mt-1 text-sm text-gray-600">{product.ubicacion}</p>
                <p className="mt-2 text-sm text-gray-600">
                  {toCurrency(product.precio)} · Disponible: {product.cantidad}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Link className="btn-secondary" to={`/productos/${product.id}/editar`}>
                  <Edit size={16} /> Editar
                </Link>
                <button className="btn-danger" onClick={() => handleDelete(product.id)} type="button">
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel p-8 text-center">
          <p className="font-semibold text-gray-600">Aún no tienes productos publicados.</p>
          <Link className="btn-primary mt-4" to="/productos/nuevo">
            <PackagePlus size={16} /> Crear el primero
          </Link>
        </div>
      )}
    </section>
  );
}
