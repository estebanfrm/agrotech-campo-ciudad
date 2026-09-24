export const ROLE_HOME = {
  productor: "/mis-productos",
  comprador: "/catalogo",
  administrador: "/admin",
};

export function homeForRole(role) {
  return ROLE_HOME[role] || "/";
}
