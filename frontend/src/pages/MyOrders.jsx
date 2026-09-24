import { ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest, statusLabel, toCurrency } from "../lib/api.js";

const COPY = {
  comprador: {
    title: "Mis pedidos",
    subtitle: "Historial y estado de tus compras agrícolas.",
    empty: "Aún no tienes pedidos.",
    totalLabel: "Total",
  },
  productor: {
    title: "Pedidos recibidos",
    subtitle: "Pedidos de compradores que incluyen tus productos.",
    empty: "Aún no has recibido pedidos.",
    totalLabel: "Total de tus productos",
  },
};

export default function MyOrders({ variant = "comprador" }) {
  const copy = COPY[variant];
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/orders/")
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black text-forest">{copy.title}</h1>
        <p className="mt-2 text-gray-600">{copy.subtitle}</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? (
        <div className="panel p-8 text-center font-semibold text-gray-600">Cargando pedidos...</div>
      ) : orders.length ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <article className="panel p-5" key={order.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="text-leaf" size={20} />
                    <h2 className="text-xl font-black text-ink">Pedido #{order.id}</h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {variant === "productor" && `${order.buyer_name} · `}
                    {order.direccion_entrega}
                  </p>
                  {order.observaciones && <p className="mt-1 text-sm text-gray-500">{order.observaciones}</p>}
                </div>
                <span className="badge bg-mint text-forest">{statusLabel(order.estado)}</span>
              </div>
              <div className="mt-4 grid gap-2">
                {order.items.map((item) => (
                  <div className="flex flex-col justify-between gap-1 rounded-md bg-stoneSoft p-3 text-sm sm:flex-row" key={item.id}>
                    <span className="font-semibold">{item.product?.nombre || "Producto eliminado"}</span>
                    <span className="text-gray-600">
                      {item.cantidad} x {toCurrency(item.precio_unitario)} = {toCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end text-lg font-black text-forest">
                {copy.totalLabel}: {toCurrency(order.total)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        !error && <div className="panel p-8 text-center font-semibold text-gray-600">{copy.empty}</div>
      )}
    </section>
  );
}
