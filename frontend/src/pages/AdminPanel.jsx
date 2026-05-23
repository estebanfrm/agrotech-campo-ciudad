import { RefreshCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest, statusLabel, toCurrency } from "../lib/api.js";

const orderStatuses = ["pendiente", "confirmado", "en_camino", "entregado", "cancelado"];

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("pedidos");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setError("");
    setLoading(true);
    try {
      const [usersData, productsData, ordersData] = await Promise.all([
        apiRequest("/admin/users/"),
        apiRequest("/admin/products/"),
        apiRequest("/admin/orders/"),
      ]);
      setUsers(usersData);
      setProducts(productsData);
      setOrders(ordersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const changeOrderStatus = async (orderId, estado) => {
    try {
      const updated = await apiRequest(`/admin/orders/${orderId}/`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteProduct = async (productId) => {
    const confirmed = window.confirm("¿Eliminar este producto del marketplace?");
    if (!confirmed) return;
    try {
      await apiRequest(`/products/${productId}/`, { method: "DELETE" });
      setProducts((current) => current.filter((product) => product.id !== productId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-leaf" size={28} />
            <h1 className="text-3xl font-black text-forest">Panel administrador</h1>
          </div>
          <p className="mt-2 text-gray-600">Gestiona usuarios, productos publicados y estados de pedidos.</p>
        </div>
        <button className="btn-secondary" onClick={loadAll} type="button">
          <RefreshCcw size={16} /> Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["pedidos", "Pedidos"],
          ["productos", "Productos"],
          ["usuarios", "Usuarios"],
        ].map(([key, label]) => (
          <button
            className={tab === key ? "btn-primary" : "btn-secondary"}
            key={key}
            onClick={() => setTab(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? (
        <div className="panel p-8 text-center font-semibold text-gray-600">Cargando panel...</div>
      ) : (
        <>
          {tab === "pedidos" && (
            <div className="grid gap-4">
              {orders.map((order) => (
                <article className="panel p-5" key={order.id}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-black text-ink">Pedido #{order.id}</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        {order.buyer_name} · {order.direccion_entrega}
                      </p>
                    </div>
                    <select className="field md:w-56" value={order.estado} onChange={(e) => changeOrderStatus(order.id, e.target.value)}>
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
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
                  <div className="mt-4 text-right font-black text-forest">Total: {toCurrency(order.total)}</div>
                </article>
              ))}
            </div>
          )}

          {tab === "productos" && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-mint text-forest">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Productor</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr className="border-t border-gray-100" key={product.id}>
                        <td className="px-4 py-3 font-bold">{product.nombre}</td>
                        <td className="px-4 py-3">{product.producer_name}</td>
                        <td className="px-4 py-3">{product.categoria}</td>
                        <td className="px-4 py-3">{toCurrency(product.precio)}</td>
                        <td className="px-4 py-3">{statusLabel(product.estado)}</td>
                        <td className="px-4 py-3">
                          <button className="btn-danger px-3" onClick={() => deleteProduct(product.id)} type="button">
                            <Trash2 size={16} /> Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "usuarios" && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-mint text-forest">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Activo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr className="border-t border-gray-100" key={user.id}>
                        <td className="px-4 py-3 font-bold">{user.username}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">{user.role}</td>
                        <td className="px-4 py-3">{user.is_active ? "Sí" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
