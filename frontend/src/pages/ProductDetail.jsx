import { ArrowLeft, Calendar, MapPin, Package, ShoppingCart, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ProductImage from "../components/ProductImage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest, statusLabel, toCurrency } from "../lib/api.js";

export default function ProductDetail() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setProduct(null);
    apiRequest(`/products/${id}/`)
      .then(setProduct)
      .catch((err) => setError(err.status === 404 ? "Producto no encontrado." : err.message));
  }, [id]);

  if (error) {
    return (
      <section className="grid gap-4">
        <div className="rounded-md bg-red-50 p-4 font-semibold text-red-700">{error}</div>
        <Link className="btn-secondary w-fit" to="/catalogo">
          <ArrowLeft size={16} /> Volver al catálogo
        </Link>
      </section>
    );
  }
  if (!product) return <div className="panel p-8 text-center font-semibold text-gray-600">Cargando producto...</div>;

  const disponible = product.estado === "disponible" && Number(product.cantidad) > 0;
  const isBuyer = isAuthenticated && user.role === "comprador";

  return (
    <section className="grid gap-6">
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-forest hover:underline" to="/catalogo">
        <ArrowLeft size={16} /> Volver al catálogo
      </Link>

      <div className="grid overflow-hidden rounded-lg border border-gray-200 bg-white shadow-soft lg:grid-cols-[0.95fr_1.05fr]">
        <div className="min-h-[340px] bg-mint">
          <ProductImage product={product} iconSize={84} className="min-h-[340px]" />
        </div>
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <span className="badge bg-mint text-forest">{product.categoria}</span>
            <span className="badge bg-wheat text-forest">{statusLabel(product.estado)}</span>
          </div>
          <h1 className="mt-4 text-3xl font-black text-ink">{product.nombre}</h1>
          <p className="mt-3 text-gray-600">{product.descripcion}</p>

          <div className="mt-6 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
            <span className="flex items-center gap-2">
              <MapPin size={17} className="text-leaf" /> {product.ubicacion}
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={17} className="text-leaf" /> Cosecha: {product.fecha_cosecha}
            </span>
            <span className="flex items-center gap-2">
              <User size={17} className="text-leaf" /> {product.producer_name}
            </span>
            <span className="flex items-center gap-2">
              <Package size={17} className="text-leaf" /> Disponible: {product.cantidad}
            </span>
          </div>

          <div className="mt-8 rounded-lg bg-stoneSoft p-5">
            <p className="text-xs font-semibold uppercase text-gray-500">Precio por kilo o unidad</p>
            <p className="text-3xl font-black text-forest">{toCurrency(product.precio)}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {!disponible ? (
              <p className="rounded-md bg-wheat px-4 py-2 text-sm font-semibold text-forest">
                Este producto está agotado por ahora.
              </p>
            ) : isBuyer ? (
              <Link className="btn-primary" to={`/pedidos/nuevo/${product.id}`}>
                <ShoppingCart size={16} /> Crear pedido
              </Link>
            ) : isAuthenticated ? (
              <p className="text-sm text-gray-600">Solo las cuentas de comprador pueden hacer pedidos.</p>
            ) : (
              <Link className="btn-secondary" state={{ from: { pathname: `/productos/${product.id}` } }} to="/login">
                Iniciar sesión para comprar
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
