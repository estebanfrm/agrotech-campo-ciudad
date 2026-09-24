import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { vi } from "vitest";

import { AuthProvider } from "../context/AuthContext.jsx";
import { saveStoredSession } from "../lib/api.js";

export const USERS = {
  comprador: { id: 4, username: "Restaurante Verde Mesa", email: "comprador1@agrotech.com", role: "comprador" },
  productor: { id: 2, username: "Finca El Roble", email: "productor1@agrotech.com", role: "productor" },
  administrador: { id: 1, username: "Admin Agrotech", email: "admin@agrotech.com", role: "administrador" },
};

export function loginAs(role) {
  saveStoredSession({ token: `token-${role}`, user: USERS[role] });
}

export function jsonResponse(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Simula fetch con un mapa "MÉTODO /ruta" -> respuesta (o función que la construye).
 * Las rutas son relativas a la API, con query string incluida.
 */
export function mockApi(routes) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const path = url.replace(/^http:\/\/api\.test\/api/, "");
    const handler = routes[`${method} ${path}`];
    if (!handler) {
      return jsonResponse({ detail: `Ruta no simulada: ${method} ${path}` }, 404);
    }
    return typeof handler === "function" ? handler(options) : jsonResponse(handler);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

export function renderWithRouter(ui, { route = "/", path = "*" } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={null} />
        </Routes>
        <LocationDisplay />
      </AuthProvider>
    </MemoryRouter>,
  );
}
