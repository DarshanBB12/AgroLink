import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import { renderApp } from "@/test/render";
import { authState, signInAs } from "@/test/authMock";

vi.mock("@/contexts/AuthContext", async () => (await import("@/test/authMock")).authModule);

const tree = (
  <Routes>
    <Route path="/login" element={<p>login page</p>} />
    <Route path="/dashboard/farmer" element={<PrivateRoute allowedRoles={["farmer"]}><p>farmer area</p></PrivateRoute>} />
    <Route path="/dashboard/admin" element={<PrivateRoute allowedRoles={["admin"]}><p>admin area</p></PrivateRoute>} />
  </Routes>
);

describe("PrivateRoute", () => {
  beforeEach(() => { signInAs(null); authState.isLoading = false; });

  it("sends signed-out visitors to /login", () => {
    renderApp(tree, "/dashboard/farmer");
    expect(screen.getByText("login page")).toBeInTheDocument();
  });
  it("lets the right role in", () => {
    signInAs("farmer");
    renderApp(tree, "/dashboard/farmer");
    expect(screen.getByText("farmer area")).toBeInTheDocument();
  });
  it("redirects other roles to THEIR OWN dashboard, never showing the page", () => {
    signInAs("farmer");
    renderApp(tree, "/dashboard/admin");
    expect(screen.queryByText("admin area")).not.toBeInTheDocument();
    expect(screen.getByText("farmer area")).toBeInTheDocument();
  });
  it("shows a loader (not a redirect) while the session is being restored", () => {
    authState.isLoading = true;
    renderApp(tree, "/dashboard/farmer");
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
    expect(screen.queryByText("farmer area")).not.toBeInTheDocument();
  });
});
