import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

const roleTarget = {
  productor: "/mis-productos",
  comprador: "/catalogo",
  administrador: "/admin",
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "comprador",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register(form);
      navigate(roleTarget[user.role] || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-lg">
      <div className="panel p-6">
        <h1 className="text-2xl font-black text-forest">Registro</h1>
        <p className="mt-2 text-sm text-gray-600">Crea una cuenta para publicar productos, comprar o administrar el marketplace.</p>
        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm font-semibold">
            Nombre o empresa
            <input className="field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Email
            <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Contraseña
            <input className="field" type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Rol
            <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="comprador">Comprador</option>
              <option value="productor">Productor</option>
              <option value="administrador">Administrador</option>
            </select>
          </label>
          <button className="btn-primary" disabled={loading} type="submit">
            <UserPlus size={16} /> {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <Link className="font-bold text-forest hover:underline" to="/login">
            Inicia sesión
          </Link>
        </p>
      </div>
    </section>
  );
}
