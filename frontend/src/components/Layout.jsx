import { LogOut, Menu, PackagePlus, ShoppingBasket, Sprout, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

const roleHome = {
  productor: "/mis-productos",
  comprador: "/catalogo",
  administrador: "/admin",
};

function navClass({ isActive }) {
  return `rounded-md px-3 py-2 text-sm font-semibold transition ${
    isActive ? "bg-mint text-forest" : "text-ink hover:bg-white/70 hover:text-forest"
  }`;
}

export default function Layout({ children }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: "/catalogo", label: "Catálogo", roles: ["comprador", "administrador", "productor"] },
    { to: "/mis-productos", label: "Mis productos", roles: ["productor"] },
    { to: "/productos/nuevo", label: "Crear producto", roles: ["productor"] },
    { to: "/mis-pedidos", label: "Mis pedidos", roles: ["comprador"] },
    { to: "/admin", label: "Administrador", roles: ["administrador"] },
  ].filter((link) => !link.roles || link.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-stoneSoft">
      <header className="sticky top-0 z-20 border-b border-forest/10 bg-wheat/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to={isAuthenticated ? roleHome[user.role] : "/"} className="flex items-center gap-2 text-forest">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-forest text-white">
              <Sprout size={22} />
            </span>
            <span className="leading-tight">
              <strong className="block text-base">Agrotech</strong>
              <span className="text-xs font-semibold text-forest/70">Campo-Ciudad</span>
            </span>
          </Link>

          <button className="btn-secondary px-3 md:hidden" onClick={() => setOpen((value) => !value)} type="button">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="hidden items-center gap-2 md:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={navClass}>
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <>
                <span className="ml-2 rounded-md bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-forest">
                  {user.role}
                </span>
                <button className="btn-secondary" onClick={handleLogout} type="button">
                  <LogOut size={16} /> Salir
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  Iniciar sesión
                </NavLink>
                <Link to="/registro" className="btn-primary">
                  <UserPlus size={16} /> Registro
                </Link>
              </>
            )}
          </div>
        </nav>

        {open && (
          <div className="border-t border-forest/10 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={navClass} onClick={() => setOpen(false)}>
                  {link.label}
                </NavLink>
              ))}
              {isAuthenticated ? (
                <button className="btn-secondary" onClick={handleLogout} type="button">
                  <LogOut size={16} /> Salir
                </button>
              ) : (
                <>
                  <NavLink to="/login" className={navClass} onClick={() => setOpen(false)}>
                    Iniciar sesión
                  </NavLink>
                  <Link to="/registro" className="btn-primary" onClick={() => setOpen(false)}>
                    <UserPlus size={16} /> Registro
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-forest/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-gray-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <span>Conectando productores rurales con compradores urbanos.</span>
          <span className="flex items-center gap-2 text-forest">
            <ShoppingBasket size={16} /> Marketplace B2B
            <PackagePlus size={16} /> MVP funcional
          </span>
        </div>
      </footer>
    </div>
  );
}
