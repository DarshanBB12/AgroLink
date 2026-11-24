import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import Login from "./Login";
import { renderApp } from "@/test/render";
import { authState, makeUser, signInAs } from "@/test/authMock";

vi.mock("@/contexts/AuthContext", async () => (await import("@/test/authMock")).authModule);

const tree = (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard/owner" element={<p>owner dashboard</p>} />
    <Route path="/signup" element={<p>signup page</p>} />
  </Routes>
);

describe("Login page", () => {
  beforeEach(() => { signInAs(null); authState.login.mockReset(); authState.sessionExpired = false; });

  it("validates before calling the server", async () => {
    renderApp(tree, "/login");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect((await screen.findAllByRole("alert")).length).toBeGreaterThanOrEqual(2); // email and password errors
    expect(screen.getByText(/email/i, { selector: "#email-err" })).toBeInTheDocument();
    expect(authState.login).not.toHaveBeenCalled();
  });

  it("toggles password visibility", async () => {
    renderApp(tree, "/login");
    const input = screen.getByLabelText(/^password$/i, { selector: "input" });
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(input).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("signs in, shows a loading state, and redirects to the role dashboard from the server", async () => {
    let resolve!: (v: unknown) => void;
    authState.login.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderApp(tree, "/login");
    await userEvent.type(screen.getByLabelText(/^email$/i), "owner@test.com");
    await userEvent.type(screen.getByLabelText(/^password$/i, { selector: "input" }), "Passw0rd123");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByRole("button", { name: /signing in/i })).toBeDisabled();
    expect(authState.login).toHaveBeenCalledWith("owner@test.com", "Passw0rd123", true);
    resolve({ redirectTo: "/dashboard/owner", user: makeUser("equipment_owner") });
    expect(await screen.findByText("owner dashboard")).toBeInTheDocument();
  });

  it("shows the server's error message and re-enables the form", async () => {
    authState.login.mockRejectedValue({ isAxiosError: true, response: { status: 401, data: { message: "Invalid email or password." } } });
    renderApp(tree, "/login");
    await userEvent.type(screen.getByLabelText(/^email$/i), "a@b.com");
    await userEvent.type(screen.getByLabelText(/^password$/i, { selector: "input" }), "wrongpass1");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: /^sign in$/i })).toBeEnabled());
  });

  it("tells the user when their session expired", () => {
    authState.sessionExpired = true;
    renderApp(tree, "/login");
    expect(screen.getByRole("status")).toHaveTextContent(/session expired/i);
  });
});
