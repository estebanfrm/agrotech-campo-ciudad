import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiRequest } from "../lib/api.js";

const emptyForm = {
  nombre: "",
  categoria: "",
  precio: "",
  cantidad: "",
  ubicacion: "",
  fecha_cosecha: "",
  descripcion: "",
  estado: "disponible",
};

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [imagen, setImagen] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const isEditing = Boolean(id);

  useEffect(() => {
    if (!id) return;
    apiRequest(`/products/${id}/`)
      .then((product) => {
        setForm({
          nombre: product.nombre,
          categoria: product.categoria,
          precio: product.precio,
          cantidad: product.cantidad,
          ubicacion: product.ubicacion,
          fecha_cosecha: product.fecha_cosecha,
          descripcion: product.descripcion || "",
          estado: product.estado,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (imagen) payload.append("imagen", imagen);

    try {
      await apiRequest(isEditing ? `/products/${id}/` : "/products/", {
        method: isEditing ? "PATCH" : "POST",
        body: payload,
      });
      navigate("/mis-productos");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="panel p-8 text-center font-semibold text-gray-600">Cargando producto...</div>;

  return (
    <section className="mx-auto max-w-3xl">
      <div className="panel p-6">
        <h1 className="text-2xl font-black text-forest">{isEditing ? "Editar producto" : "Crear producto"}</h1>
        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              Nombre
              <input className="field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Categoría
              <input className="field" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Precio por kilo o unidad
              <input className="field" min="0" step="0.01" type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Cantidad disponible
              <input className="field" min="0" step="0.01" type="number" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} required />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Ubicación
              <input className="field" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} required />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Fecha de cosecha
              <input className="field" type="date" value={form.fecha_cosecha} onChange={(e) => setForm({ ...form, fecha_cosecha: e.target.value })} required />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Estado
              <select className="field" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="disponible">Disponible</option>
                <option value="agotado">Agotado</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Imagen opcional
              <input className="field" accept="image/*" type="file" onChange={(e) => setImagen(e.target.files?.[0] || null)} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-semibold">
            Descripción
            <textarea className="field min-h-28" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </label>
          <button className="btn-primary" type="submit">
            <Save size={16} /> Guardar producto
          </button>
        </form>
      </div>
    </section>
  );
}
