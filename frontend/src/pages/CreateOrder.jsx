import { Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { apiRequest, toCurrency } from "../lib/api.js";

export default function CreateOrder() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({
    cantidad: "1",
    direccion_entrega: "",
    observaciones: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest(`/products/${productId}/`)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  const total = useMemo(() => Number(product?.precio || 0) * Number(form.cantidad || 0), [product, form.cantidad]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await apiRequest("/orders/", {
        method: "POST",
        body: JSON.stringify({
          direccion_entrega: form.direccion_entrega,
          observaciones: form.observaciones,
          items: [{ product_id: Number(productId), cantidad: form.cantidad }],
        }),
      });
      navigate("/mis-pedidos");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="panel p-8 text-center font-semibold text-gray-600">Cargando producto...</div>;
  if (!product) return <div className="rounded-md bg-red-50 p-4 font-semibold text-red-700">{error || "Producto no encontrado."}</div>;

  return (
    <section className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="panel h-fit p-6">
        <span className="badge bg-mint text-forest">{product.categoria}</span>
        <h1 className="mt-3 text-2xl font-black text-forest">{product.nombre}</h1>
        <p className="mt-2 text-sm text-gray-600">{product.descripcion}</p>
        <dl className="mt-5 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Precio</dt>
            <dd className="font-bold text-forest">{toCurrency(product.precio)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Disponible</dt>
            <dd className="font-bold">{product.cantidad}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Total estimado</dt>
            <dd className="font-black text-forest">{toCurrency(total)}</dd>
          </div>
        </dl>
      </aside>

      <div className="panel p-6">
        <h2 className="text-2xl font-black text-forest">Crear pedido</h2>
        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm font-semibold">
            Cantidad solicitada
            <input
              className="field"
              max={product.cantidad}
              min="0.01"
              step="0.01"
              type="number"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Dirección de entrega
            <input className="field" value={form.direccion_entrega} onChange={(e) => setForm({ ...form, direccion_entrega: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Observaciones
            <textarea className="field min-h-28" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary" type="submit">
              <Send size={16} /> Enviar pedido
            </button>
            <Link className="btn-secondary" to={`/productos/${product.id}`}>
              Volver al producto
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
