import { ArrowRight, Building2, Leaf, ShieldCheck, Store } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

const roleTarget = {
  productor: "/mis-productos",
  comprador: "/catalogo",
  administrador: "/admin",
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const target = isAuthenticated ? roleTarget[user.role] : "/registro";

  return (
    <div className="grid gap-10">
      <section className="grid items-center gap-8 rounded-lg bg-forest px-6 py-10 text-white shadow-soft md:grid-cols-[1.1fr_0.9fr] md:px-10">
        <div>
          <span className="badge bg-white/15 text-white">Marketplace B2B agrícola</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
            Agrotech Campo-Ciudad
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 md:text-lg">
            Una plataforma funcional para publicar productos rurales, descubrir oferta agrícola y gestionar pedidos entre productores y compradores urbanos.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary bg-white text-forest hover:bg-wheat" to={target}>
              {isAuthenticated ? "Ir a mi panel" : "Crear cuenta"} <ArrowRight size={16} />
            </Link>
            <Link className="btn-secondary border-white/30 bg-white/10 text-white hover:bg-white/20" to="/catalogo">
              Ver catálogo
            </Link>
          </div>
        </div>
        <div className="grid gap-3">
          {[
            ["Productores", "Publican cosechas y disponibilidad.", Leaf],
            ["Compradores", "Encuentran productos frescos y hacen pedidos.", Store],
            ["Administración", "Gestiona usuarios, productos y estados.", ShieldCheck],
          ].map(([title, text, Icon]) => (
            <div key={title} className="rounded-lg border border-white/15 bg-white/10 p-5">
              <Icon className="text-mint" size={26} />
              <h2 className="mt-3 text-lg font-bold">{title}</h2>
              <p className="mt-1 text-sm text-white/75">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["8+", "productos de prueba"],
          ["3", "roles operativos"],
          ["API", "Django REST Framework"],
        ].map(([value, label]) => (
          <div className="panel p-6" key={label}>
            <div className="flex items-center gap-3">
              <Building2 className="text-leaf" size={26} />
              <p className="text-3xl font-black text-forest">{value}</p>
            </div>
            <p className="mt-2 text-sm font-semibold text-gray-600">{label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
