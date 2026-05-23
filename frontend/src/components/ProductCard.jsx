import { Calendar, MapPin, Package, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

import { toCurrency } from "../lib/api.js";

export default function ProductCard({ product }) {
  return (
    <article className="panel overflow-hidden">
      <div className="aspect-[4/3] bg-mint">
        {product.image_url ? (
          <img className="h-full w-full object-cover" src={product.image_url} alt={product.nombre} />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-mint to-wheat text-forest">
            <Package size={54} />
          </div>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div>
          <span className="badge bg-mint text-forest">{product.categoria}</span>
          <h3 className="mt-3 text-lg font-bold text-ink">{product.nombre}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{product.descripcion || "Producto agrícola disponible."}</p>
        </div>
        <div className="grid gap-2 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-leaf" /> {product.ubicacion}
          </span>
          <span className="flex items-center gap-2">
            <Calendar size={16} className="text-leaf" /> Cosecha: {product.fecha_cosecha}
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Precio</p>
            <p className="text-xl font-black text-forest">{toCurrency(product.precio)}</p>
            <p className="text-xs text-gray-500">Disponible: {product.cantidad}</p>
          </div>
          <Link className="btn-primary px-3" to={`/productos/${product.id}`}>
            <ShoppingCart size={16} /> Ver
          </Link>
        </div>
      </div>
    </article>
  );
}
