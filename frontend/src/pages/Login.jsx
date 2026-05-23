import { LogIn } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

const roleTarget = {
  productor: "/mis-productos",
  comprador: "/catalogo",
  administrador: "/admin",
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form);
      navigate(location.state?.from?.pathname || roleTarget[user.role] || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md">
      <div className="panel p-6">
        <h1 className="text-2xl font-black text-forest">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-gray-600">Accede según tu rol para gestionar productos, pedidos o administración.</p>
        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm font-semibold">
            Email
            <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Contraseña
            <input className="field" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <button className="btn-primary" disabled={loading} type="submit">
            <LogIn size={16} /> {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-600">
          ¿No tienes cuenta?{" "}
          <Link className="font-bold text-forest hover:underline" to="/registro">
            Regístrate
          </Link>
        </p>
      </div>
    </section>
  );
}
