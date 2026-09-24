export function normalizeApiUrl(url) {
  const cleanUrl = url.replace(/\/+$/, "");
  return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api");

const SESSION_KEY = "agrotech_session";
export const SESSION_EXPIRED_EVENT = "agrotech:session-expired";

const FIELD_LABELS = {
  username: "Nombre",
  email: "Email",
  password: "Contraseña",
  role: "Rol",
  nombre: "Nombre",
  categoria: "Categoría",
  precio: "Precio",
  cantidad: "Cantidad",
  ubicacion: "Ubicación",
  fecha_cosecha: "Fecha de cosecha",
  descripcion: "Descripción",
  imagen: "Imagen",
  estado: "Estado",
  direccion_entrega: "Dirección de entrega",
  observaciones: "Observaciones",
  items: "Productos",
  product_id: "Producto",
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function saveStoredSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Sin almacenamiento disponible la sesión solo vive en memoria.
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nada que limpiar.
  }
}

function collectMessages(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(collectMessages);
  if (typeof value === "object") return Object.values(value).flatMap(collectMessages);
  return [String(value)];
}

export function formatApiError(data, status) {
  const fallback = status >= 500 ? "El servidor tuvo un problema. Intenta de nuevo en unos minutos." : "Ocurrió un error inesperado.";
  if (!data || typeof data !== "object") return fallback;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data)) return collectMessages(data).join(" ") || fallback;

  const parts = Object.entries(data).map(([key, value]) => {
    const messages = collectMessages(value).join(" ");
    if (key === "non_field_errors" || key === "detail") return messages;
    return `${FIELD_LABELS[key] || key}: ${messages}`;
  });
  return parts.filter(Boolean).join(" ") || fallback;
}

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}, { withAuth = true } = {}) {
  const session = withAuth ? getStoredSession() : null;
  const isFormData = options.body instanceof FormData;
  const headers = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(session?.token ? { Authorization: `Token ${session.token}` } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión o intenta de nuevo en unos segundos.", 0, null);
  }

  if (response.status === 401 && session?.token) {
    // El token ya no es válido (sesión cerrada o base de datos reiniciada).
    clearStoredSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    const method = (options.method || "GET").toUpperCase();
    if (method === "GET") {
      return apiRequest(path, options, { withAuth: false });
    }
    throw new ApiError("Tu sesión expiró. Inicia sesión nuevamente.", 401, null);
  }

  if (response.status === 204) {
    return null;
  }

  const data = parseBody(await response.text());

  if (!response.ok) {
    throw new ApiError(formatApiError(data, response.status), response.status, data);
  }

  return data;
}

export function toCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function statusLabel(status) {
  const labels = {
    disponible: "Disponible",
    agotado: "Agotado",
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    en_camino: "En camino",
    entregado: "Entregado",
    cancelado: "Cancelado",
  };
  return labels[status] || status;
}
