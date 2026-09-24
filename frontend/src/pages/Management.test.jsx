import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { jsonResponse, loginAs, mockApi, renderWithRouter } from "../test/utils.jsx";
import AdminPanel from "./AdminPanel.jsx";
import MyOrders from "./MyOrders.jsx";
import ProductForm from "./ProductForm.jsx";

const order = {
  id: 5,
  buyer_name: "Restaurante Verde Mesa",
  direccion_entrega: "Calle 45 #12-30, Bogotá",
  observaciones: "Entregar en la mañana",
  estado: "pendiente",
  total: "34000.00",
  items: [
    {
      id: 1,
      product: { id: 1, nombre: "Tomate chonto" },
      cantidad: "10.00",
      precio_unitario: "3400.00",
      subtotal: "34000.00",
    },
  ],
};

describe("Pedidos", () => {
  it("el comprador ve su historial", async () => {
    loginAs("comprador");
    mockApi({ "GET /orders/": [order] });

    renderWithRouter(<MyOrders />);

    expect(await screen.findByRole("heading", { name: "Mis pedidos" })).toBeInTheDocument();
    expect(await screen.findByText("Pedido #5")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("el productor ve los pedidos recibidos con el comprador", async () => {
    loginAs("productor");
    mockApi({ "GET /orders/": [order] });

    renderWithRouter(<MyOrders variant="productor" />);

    expect(await screen.findByRole("heading", { name: "Pedidos recibidos" })).toBeInTheDocument();
    expect(await screen.findByText(/Restaurante Verde Mesa/)).toBeInTheDocument();
    expect(screen.getByText(/Total de tus productos/)).toBeInTheDocument();
  });

  it("avisa cuando no hay pedidos", async () => {
    loginAs("productor");
    mockApi({ "GET /orders/": [] });

    renderWithRouter(<MyOrders variant="productor" />);

    expect(await screen.findByText("Aún no has recibido pedidos.")).toBeInTheDocument();
  });
});

describe("Formulario de producto", () => {
  it("crea un producto enviando FormData", async () => {
    loginAs("productor");
    const fetchMock = mockApi({ "POST /products/": () => jsonResponse({ id: 3 }, 201) });
    renderWithRouter(<ProductForm />, { route: "/productos/nuevo", path: "/productos/nuevo" });

    await userEvent.type(screen.getByLabelText("Nombre"), "Papa criolla");
    await userEvent.type(screen.getByLabelText("Categoría"), "Tubérculos");
    await userEvent.type(screen.getByLabelText("Precio por kilo o unidad"), "2800");
    await userEvent.type(screen.getByLabelText("Cantidad disponible"), "200");
    await userEvent.type(screen.getByLabelText("Ubicación"), "Boyacá");
    await userEvent.type(screen.getByLabelText("Fecha de cosecha"), "2026-09-20");
    await userEvent.click(screen.getByRole("button", { name: /Guardar producto/ }));

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("nombre")).toBe("Papa criolla");
    expect(options.body.get("precio")).toBe("2800");
    expect(await screen.findByTestId("location")).toHaveTextContent("/mis-productos");
  });

  it("carga el producto al editar y envía PATCH", async () => {
    loginAs("productor");
    const fetchMock = mockApi({
      "GET /products/7/": {
        id: 7,
        nombre: "Mora",
        categoria: "Frutas",
        precio: "5200.00",
        cantidad: "75.00",
        ubicacion: "Silvania",
        fecha_cosecha: "2026-09-18",
        descripcion: "",
        estado: "disponible",
      },
      "PATCH /products/7/": { id: 7 },
    });
    renderWithRouter(<ProductForm />, { route: "/productos/7/editar", path: "/productos/:id/editar" });

    const precio = await screen.findByLabelText("Precio por kilo o unidad");
    expect(precio).toHaveValue(5200);
    await userEvent.clear(precio);
    await userEvent.type(precio, "6000");
    await userEvent.click(screen.getByRole("button", { name: /Guardar producto/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, options] = fetchMock.mock.calls[1];
    expect(options.method).toBe("PATCH");
    expect(options.body.get("precio")).toBe("6000");
  });
});

describe("Panel administrador", () => {
  function mockAdmin(extra = {}) {
    return mockApi({
      "GET /admin/users/": [{ id: 1, username: "Admin", email: "admin@agrotech.com", role: "administrador", is_active: true }],
      "GET /admin/products/": [{ id: 1, nombre: "Tomate chonto", producer_name: "Finca", categoria: "Hortalizas", precio: "3400", estado: "disponible" }],
      "GET /admin/orders/": [order],
      ...extra,
    });
  }

  it("cambia el estado de un pedido", async () => {
    loginAs("administrador");
    const fetchMock = mockAdmin({ "PATCH /admin/orders/5/": { ...order, estado: "en_camino" } });
    renderWithRouter(<AdminPanel />, { route: "/admin" });

    await userEvent.selectOptions(await screen.findByLabelText("Estado del pedido 5"), "en_camino");

    await waitFor(() => expect(screen.getByLabelText("Estado del pedido 5")).toHaveValue("en_camino"));
    const patch = fetchMock.mock.calls.find(([, options]) => options.method === "PATCH");
    expect(JSON.parse(patch[1].body)).toEqual({ estado: "en_camino" });
  });

  it("pide confirmación antes de cancelar y no hace nada si se rechaza", async () => {
    loginAs("administrador");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = mockAdmin();
    renderWithRouter(<AdminPanel />, { route: "/admin" });

    await userEvent.selectOptions(await screen.findByLabelText("Estado del pedido 5"), "cancelado");

    expect(confirm).toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(([, options]) => options.method === "PATCH")).toBe(false);
  });

  it("al cancelar bloquea el pedido y recarga los productos", async () => {
    loginAs("administrador");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = mockAdmin({ "PATCH /admin/orders/5/": { ...order, estado: "cancelado" } });
    renderWithRouter(<AdminPanel />, { route: "/admin" });

    await userEvent.selectOptions(await screen.findByLabelText("Estado del pedido 5"), "cancelado");

    await waitFor(() => expect(screen.getByLabelText("Estado del pedido 5")).toBeDisabled());
    const productLoads = fetchMock.mock.calls.filter(([url]) => url.endsWith("/admin/products/"));
    expect(productLoads).toHaveLength(2);
  });

  it("lista usuarios y productos en sus pestañas", async () => {
    loginAs("administrador");
    mockAdmin();
    renderWithRouter(<AdminPanel />, { route: "/admin" });

    await userEvent.click(await screen.findByRole("button", { name: "Usuarios" }));
    expect(screen.getByText("admin@agrotech.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Productos" }));
    expect(screen.getByText("Tomate chonto")).toBeInTheDocument();
  });
});
