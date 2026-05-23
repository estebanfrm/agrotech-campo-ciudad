function normalizeApiUrl(url) {
  const cleanUrl = url.replace(/\/+$/, "");
  return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api");

export function getStoredSession() {
  const raw = localStorage.getItem("agrotech_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("agrotech_session");
    return null;
  }
}

export function saveStoredSession(session) {
  localStorage.setItem("agrotech_session", JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem("agrotech_session");
}

export async function apiRequest(path, options = {}) {
  const session = getStoredSession();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(session?.token ? { Authorization: `Token ${session.token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.non_field_errors?.join(" ") ||
      Object.entries(data || {})
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(" ") : value}`)
        .join(" ") ||
      "Ocurrió un error inesperado.";
    throw new Error(message);
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
