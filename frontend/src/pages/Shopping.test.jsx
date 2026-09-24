import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { jsonResponse, loginAs, mockApi, renderWithRouter } from "../test/utils.jsx";
import Catalog from "./Catalog.jsx";
import CreateOrder from "./CreateOrder.jsx";
import ProductDetail from "./ProductDetail.jsx";

const tomate = {
  id: 1,
  nombre: "Tomate chonto",
  categoria: "Hortalizas",
  precio: "3400.00",
  cantidad: "120.00",
  ubicacion: "Sutamarchán, Boyacá",
  fecha_cosecha: "2026-09-20",
  descripcion: "Tomate fresco.",
  producer_name: "Finca El Roble",
  image_url: null,
  estado: "disponible",
};
const mora = { ...tomate, id: 2, nombre: "Mora de Castilla", categoria: "Frutas", precio: "5200.00" };

describe("Catálogo", () => {
  it("muestra los productos y las categorías del backend", async () => {
    mockApi({ "GET /products/categories/": ["Frutas", "Hortalizas"], "GET /products/": [tomate, mora] });

    renderWithRouter(<Catalog />, { route: "/catalogo" });

    expect(await screen.findByText("Tomate chonto")).toBeInTheDocument();
    expect(screen.getByText("Mora de Castilla")).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "Frutas" })).toBeInTheDocument();
    expect(screen.getByText("$ 3.400", { normalizer: (text) => text.replace(/\s/g, " ") })).toBeInTheDocument();
  });

  it("filtra por categoría y busca por nombre", async () => {
    const fetchMock = mockApi({
      "GET /products/categories/": ["Frutas", "Hortalizas"],
      "GET /products/": [tomate, mora],
      "GET /products/?categoria=Frutas": [mora],
      "GET /products/?search=mora&categoria=Frutas": [mora],
    });
    renderWithRouter(<Catalog />, { route: "/catalogo" });
    await screen.findByText("Tomate chonto");

    await userEvent.selectOptions(await screen.findByLabelText("Categoría"), "Frutas");
    await waitFor(() => expect(screen.queryByText("Tomate chonto")).not.toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Buscar por nombre"), "mora");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/products/?search=mora&categoria=Frutas", expect.anything()),
    );
    // La búsqueda espera a que el usuario deje de escribir: no se consulta letra por letra.
    const searchCalls = fetchMock.mock.calls.filter(([url]) => url.includes("search="));
    expect(searchCalls).toHaveLength(1);
  });

  it("muestra un mensaje cuando no hay resultados", async () => {
    mockApi({ "GET /products/categories/": [], "GET /products/": [] });

    renderWithRouter(<Catalog />, { route: "/catalogo" });

    expect(await screen.findByText("No hay productos disponibles con esos filtros.")).toBeInTheDocument();
  });

  it("muestra el error si el backend no responde", async () => {
    mockApi({
      "GET /products/categories/": [],
      "GET /products/": () => new Response("Bad gateway", { status: 502 }),
    });

    renderWithRouter(<Catalog />, { route: "/catalogo" });

    expect(await screen.findByText(/El servidor tuvo un problema/)).toBeInTheDocument();
  });
});

describe("Detalle de producto", () => {
  const renderDetail = () => renderWithRouter(<ProductDetail />, { route: "/productos/1", path: "/productos/:id" });

  it("permite al comprador crear un pedido", async () => {
    loginAs("comprador");
    mockApi({ "GET /products/1/": tomate });

    renderDetail();

    expect(await screen.findByRole("link", { name: /Crear pedido/ })).toHaveAttribute("href", "/pedidos/nuevo/1");
  });

  it("invita al visitante a iniciar sesión", async () => {
    mockApi({ "GET /products/1/": tomate });

    renderDetail();

    expect(await screen.findByRole("link", { name: "Iniciar sesión para comprar" })).toBeInTheDocument();
  });

  it("no ofrece comprar un producto agotado", async () => {
    loginAs("comprador");
    mockApi({ "GET /products/1/": { ...tomate, estado: "agotado", cantidad: "0.00" } });

    renderDetail();

    expect(await screen.findByText("Este producto está agotado por ahora.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Crear pedido/ })).not.toBeInTheDocument();
  });

  it("indica cuando el producto no existe", async () => {
    mockApi({});

    renderDetail();

    expect(await screen.findByText("Producto no encontrado.")).toBeInTheDocument();
  });

  it("muestra un ícono si la imagen no carga", async () => {
    mockApi({ "GET /products/1/": { ...tomate, image_url: "http://api.test/media/products/perdida.png" } });
    renderDetail();

    const image = await screen.findByRole("img", { name: "Tomate chonto" });
    image.dispatchEvent(new Event("error"));

    expect(await screen.findByTestId("product-image-placeholder")).toBeInTheDocument();
  });
});

describe("Crear pedido", () => {
  const renderOrder = () =>
    renderWithRouter(<CreateOrder />, { route: "/pedidos/nuevo/1", path: "/pedidos/nuevo/:productId" });

  it("envía el pedido y lleva a mis pedidos", async () => {
    loginAs("comprador");
    const fetchMock = mockApi({
      "GET /products/1/": tomate,
      "POST /orders/": () => jsonResponse({ id: 10 }, 201),
    });
    renderOrder();

    const cantidad = await screen.findByLabelText("Cantidad solicitada");
    await userEvent.clear(cantidad);
    await userEvent.type(cantidad, "5");
    await userEvent.type(screen.getByLabelText("Dirección de entrega"), "Calle 45 #12-30");
    expect(screen.getByText("$ 17.000", { normalizer: (text) => text.replace(/\s/g, " ") })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Enviar pedido/ }));

    const post = fetchMock.mock.calls.find(([, options]) => options.method === "POST");
    expect(JSON.parse(post[1].body)).toEqual({
      direccion_entrega: "Calle 45 #12-30",
      observaciones: "",
      items: [{ product_id: 1, cantidad: "5" }],
    });
    expect(await screen.findByTestId("location")).toHaveTextContent("/mis-pedidos");
  });

  it("muestra el error de stock del backend", async () => {
    loginAs("comprador");
    mockApi({
      "GET /products/1/": tomate,
      "POST /orders/": () =>
        jsonResponse({ items: ["Cantidad no disponible para Tomate chonto. Disponible: 120.00."] }, 400),
    });
    renderOrder();

    await userEvent.type(await screen.findByLabelText("Dirección de entrega"), "Calle 1");
    await userEvent.click(screen.getByRole("button", { name: /Enviar pedido/ }));

    expect(await screen.findByText("Productos: Cantidad no disponible para Tomate chonto. Disponible: 120.00.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enviar pedido/ })).toBeEnabled();
  });

  it("no muestra el formulario si el producto está agotado", async () => {
    loginAs("comprador");
    mockApi({ "GET /products/1/": { ...tomate, estado: "agotado", cantidad: "0.00" } });

    renderOrder();

    expect(await screen.findByText("Este producto está agotado y no admite pedidos.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enviar pedido/ })).not.toBeInTheDocument();
  });
});
