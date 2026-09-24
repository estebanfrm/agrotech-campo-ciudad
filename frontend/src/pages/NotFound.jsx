import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-lg">
      <div className="panel p-8 text-center">
        <Compass className="mx-auto text-leaf" size={42} />
        <h1 className="mt-4 text-2xl font-black text-forest">Página no encontrada</h1>
        <p className="mt-2 text-sm text-gray-600">La dirección que buscas no existe o fue movida.</p>
        <Link className="btn-primary mt-6" to="/">
          Ir al inicio
        </Link>
      </div>
    </section>
  );
}
