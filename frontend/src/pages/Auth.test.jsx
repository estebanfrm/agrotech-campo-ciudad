import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { getStoredSession } from "../lib/api.js";
import { jsonResponse, mockApi, renderWithRouter, USERS } from "../test/utils.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";

describe("Registro", () => {
  it("solo ofrece los roles comprador y productor", () => {
    renderWithRouter(<Register />, { route: "/registro" });

    const options = within(screen.getByLabelText(/Rol/)).getAllByRole("option");
    expect(options.map((option) => option.value)).toEqual(["comprador", "productor"]);
  });

  it("crea la cuenta, guarda la sesión y lleva al panel del rol", async () => {
    const fetchMock = mockApi({
      "POST /auth/register/": () => jsonResponse({ token: "nuevo", user: { ...USERS.productor, id: 9 } }, 201),
    });
    renderWithRouter(<Register />, { route: "/registro" });

    await userEvent.type(screen.getByLabelText("Nombre o empresa"), "Finca El Roble");
    await userEvent.type(screen.getByLabelText("Email"), "finca@example.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "secreta1");
    await userEvent.selectOptions(screen.getByLabelText(/Rol/), "productor");
    await userEvent.click(screen.getByRole("button", { name: /Crear cuenta/ }));

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      username: "Finca El Roble",
      email: "finca@example.com",
      password: "secreta1",
      role: "productor",
    });
    expect(await screen.findByTestId("location")).toHaveTextContent("/mis-productos");
    expect(getStoredSession().token).toBe("nuevo");
  });

  it("muestra los errores del backend", async () => {
    mockApi({
      "POST /auth/register/": () => jsonResponse({ email: ["Ya existe una cuenta con este email."] }, 400),
    });
    renderWithRouter(<Register />, { route: "/registro" });

    await userEvent.type(screen.getByLabelText("Nombre o empresa"), "Otra");
    await userEvent.type(screen.getByLabelText("Email"), "repetido@example.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "secreta1");
    await userEvent.click(screen.getByRole("button", { name: /Crear cuenta/ }));

    expect(await screen.findByText("Email: Ya existe una cuenta con este email.")).toBeInTheDocument();
    expect(getStoredSession()).toBeNull();
  });
});

describe("Login", () => {
  async function fillAndSubmit(email = "comprador1@agrotech.com", password = "Agrotech123") {
    await userEvent.type(screen.getByLabelText("Email"), email);
    await userEvent.type(screen.getByLabelText("Contraseña"), password);
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));
  }

  it("lleva al comprador al catálogo", async () => {
    mockApi({ "POST /auth/login/": { token: "abc", user: USERS.comprador } });
    renderWithRouter(<Login />, { route: "/login" });

    await fillAndSubmit();

    expect(await screen.findByTestId("location")).toHaveTextContent("/catalogo");
    expect(getStoredSession().user.role).toBe("comprador");
  });

  it("lleva al administrador a su panel", async () => {
    mockApi({ "POST /auth/login/": { token: "abc", user: USERS.administrador } });
    renderWithRouter(<Login />, { route: "/login" });

    await fillAndSubmit("admin@agrotech.com");

    expect(await screen.findByTestId("location")).toHaveTextContent("/admin");
  });

  it("muestra un error con credenciales inválidas", async () => {
    mockApi({ "POST /auth/login/": () => jsonResponse({ non_field_errors: ["Credenciales inválidas."] }, 400) });
    renderWithRouter(<Login />, { route: "/login" });

    await fillAndSubmit("comprador1@agrotech.com", "mala");

    expect(await screen.findByText("Credenciales inválidas.")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});
