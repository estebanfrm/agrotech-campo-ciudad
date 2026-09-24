import { describe, expect, it, vi } from "vitest";

import { jsonResponse, loginAs, mockApi } from "../test/utils.jsx";
import {
  API_URL,
  apiRequest,
  formatApiError,
  getStoredSession,
  normalizeApiUrl,
  SESSION_EXPIRED_EVENT,
  statusLabel,
  toCurrency,
} from "./api.js";

describe("normalizeApiUrl", () => {
  it.each([
    ["https://backend.onrender.com", "https://backend.onrender.com/api"],
    ["https://backend.onrender.com/", "https://backend.onrender.com/api"],
    ["https://backend.onrender.com/api", "https://backend.onrender.com/api"],
    ["https://backend.onrender.com/api///", "https://backend.onrender.com/api"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeApiUrl(input)).toBe(expected);
  });

  it("toma la URL de VITE_API_URL", () => {
    expect(API_URL).toBe("http://api.test/api");
  });
});

describe("formatApiError", () => {
  it("usa detail cuando existe", () => {
    expect(formatApiError({ detail: "No autorizado." }, 403)).toBe("No autorizado.");
  });

  it("traduce los nombres de campo y aplana errores anidados", () => {
    const data = {
      email: ["Ya existe una cuenta con este email."],
      items: [{ product_id: ["El producto no existe o no está disponible."] }],
    };

    expect(formatApiError(data, 400)).toBe(
      "Email: Ya existe una cuenta con este email. Productos: El producto no existe o no está disponible.",
    );
  });

  it("muestra non_field_errors sin prefijo", () => {
    expect(formatApiError({ non_field_errors: ["Credenciales inválidas."] }, 400)).toBe("Credenciales inválidas.");
  });

  it("usa un mensaje genérico para errores del servidor sin cuerpo", () => {
    expect(formatApiError(null, 500)).toMatch(/servidor tuvo un problema/);
  });
});

describe("apiRequest", () => {
  it("envía el token guardado y devuelve el JSON", async () => {
    loginAs("comprador");
    const fetchMock = mockApi({ "GET /orders/": [{ id: 1 }] });

    await expect(apiRequest("/orders/")).resolves.toEqual([{ id: 1 }]);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/api/orders/");
    expect(options.headers.Authorization).toBe("Token token-comprador");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("no fuerza Content-Type cuando envía FormData", async () => {
    const fetchMock = mockApi({ "POST /products/": { id: 3 } });

    await apiRequest("/products/", { method: "POST", body: new FormData() });

    expect(fetchMock.mock.calls[0][1].headers["Content-Type"]).toBeUndefined();
  });

  it("devuelve null en respuestas 204", async () => {
    mockApi({ "DELETE /products/1/": () => new Response(null, { status: 204 }) });

    await expect(apiRequest("/products/1/", { method: "DELETE" })).resolves.toBeNull();
  });

  it("lanza un ApiError con status y mensaje legible", async () => {
    mockApi({ "POST /auth/login/": () => jsonResponse({ non_field_errors: ["Credenciales inválidas."] }, 400) });

    await expect(apiRequest("/auth/login/", { method: "POST", body: "{}" })).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Credenciales inválidas.",
    });
  });

  it("no revienta cuando el servidor responde HTML", async () => {
    mockApi({ "GET /products/": () => new Response("<h1>Server Error</h1>", { status: 500 }) });

    await expect(apiRequest("/products/")).rejects.toMatchObject({ status: 500, message: expect.stringMatching(/servidor/) });
  });

  it("da un mensaje claro cuando no hay conexión", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(apiRequest("/products/")).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/No se pudo conectar/) });
  });

  it("propaga AbortError sin transformarlo", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));

    await expect(apiRequest("/products/")).rejects.toBe(abort);
  });

  it("con token vencido limpia la sesión y reintenta los GET sin token", async () => {
    loginAs("comprador");
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    const fetchMock = mockApi({
      "GET /products/": (options) =>
        options.headers.Authorization ? jsonResponse({ detail: "Token inválido." }, 401) : jsonResponse([{ id: 7 }]),
    });

    await expect(apiRequest("/products/")).resolves.toEqual([{ id: 7 }]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getStoredSession()).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it("con token vencido en un POST pide iniciar sesión de nuevo", async () => {
    loginAs("comprador");
    mockApi({ "POST /orders/": () => jsonResponse({ detail: "Token inválido." }, 401) });

    await expect(apiRequest("/orders/", { method: "POST", body: "{}" })).rejects.toMatchObject({
      status: 401,
      message: "Tu sesión expiró. Inicia sesión nuevamente.",
    });
    expect(getStoredSession()).toBeNull();
  });
});

describe("formatos", () => {
  it("formatea pesos colombianos sin decimales", () => {
    expect(toCurrency("3400.00").replace(/\s/g, " ")).toBe("$ 3.400");
  });

  it("traduce estados conocidos y deja pasar los desconocidos", () => {
    expect(statusLabel("en_camino")).toBe("En camino");
    expect(statusLabel("otro")).toBe("otro");
  });
});
