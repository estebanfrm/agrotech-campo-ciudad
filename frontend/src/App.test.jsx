import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SESSION_EXPIRED_EVENT } from "./lib/api.js";
import { ROUTER_FUTURE_FLAGS } from "./lib/router.js";
import { LocationDisplay, loginAs, mockApi } from "./test/utils.jsx";

function renderApp(route) {
  return render(
    <MemoryRouter future={ROUTER_FUTURE_FLAGS} initialEntries={[route]}>
      <AuthProvider>
        <App />
        <LocationDisplay />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("rutas protegidas", () => {
  it("envía al login a un visitante que intenta ver sus pedidos", () => {
    renderApp("/mis-pedidos");

    expect(screen.getByTestId("location")).toHaveTextContent("/login");
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("no deja entrar a un comprador al panel administrador", () => {
    loginAs("comprador");

    renderApp("/admin");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("no deja a un comprador crear productos", () => {
    loginAs("comprador");

    renderApp("/productos/nuevo");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("deja entrar al administrador a su panel", async () => {
    loginAs("administrador");
    mockApi({ "GET /admin/users/": [], "GET /admin/products/": [], "GET /admin/orders/": [] });

    renderApp("/admin");

    expect(await screen.findByRole("heading", { name: "Panel administrador" })).toBeInTheDocument();
  });
});

describe("navegación por rol", () => {
  it("muestra los enlaces del productor", () => {
    loginAs("productor");

    renderApp("/");

    expect(screen.getAllByRole("link", { name: "Mis productos" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Pedidos recibidos" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Mis pedidos" })).not.toBeInTheDocument();
  });

  it("muestra los enlaces del comprador", () => {
    loginAs("comprador");

    renderApp("/");

    expect(screen.getAllByRole("link", { name: "Mis pedidos" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Crear producto" })).not.toBeInTheDocument();
  });

  it("cierra sesión y vuelve al inicio", async () => {
    loginAs("comprador");
    const fetchMock = mockApi({ "POST /auth/logout/": () => new Response(null, { status: 204 }) });
    renderApp("/");

    await userEvent.click(screen.getAllByRole("button", { name: /Salir/ })[0]);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/auth/logout/", expect.objectContaining({ method: "POST" }));
    expect(localStorage.getItem("agrotech_session")).toBeNull();
    expect(screen.getAllByRole("link", { name: /Registro/ }).length).toBeGreaterThan(0);
  });

  it("cierra la sesión en pantalla cuando el token vence", () => {
    loginAs("comprador");
    renderApp("/");

    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });

    expect(screen.queryByRole("link", { name: "Mis pedidos" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Iniciar sesión" }).length).toBeGreaterThan(0);
  });

  it("muestra una página 404 para rutas desconocidas", () => {
    renderApp("/no-existe");

    expect(screen.getByRole("heading", { name: "Página no encontrada" })).toBeInTheDocument();
  });
});
