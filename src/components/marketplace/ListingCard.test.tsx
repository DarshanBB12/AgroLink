import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingCard } from "./ListingCard";
import { renderApp } from "@/test/render";
import type { Listing } from "@/types/api";

vi.mock("@/contexts/AuthContext", async () => (await import("@/test/authMock")).authModule);

const base = (over: Partial<Listing> = {}): Listing => ({
  id: "1", type: "equipment", name: "John Deere 5050D", category: "Tractor", description: "Reliable 50 HP tractor", price: 2500, priceUnit: "day", rating: 4.6,
  location: "Pune, MH", available: true, distanceKm: 12.5, hasCoordinates: true, owner: { id: "o", name: "Owner", location: "Pune" },
  details: { discount: 10, specs: { power: "50 HP", fuel: "Diesel" } }, createdAt: "2026-01-01", ...over,
});

describe("ListingCard (the one card used for every marketplace section)", () => {
  it("renders name, category, discounted price, unit, location and distance", () => {
    renderApp(<ListingCard listing={base()} onOpen={() => {}} actionLabel="Rent" onAction={() => {}} />);
    expect(screen.getByText("John Deere 5050D")).toBeInTheDocument();
    expect(screen.getByText("₹2,250")).toBeInTheDocument(); // 2500 less 10%
    expect(screen.getByText("₹2,500")).toBeInTheDocument(); // original struck through
    expect(screen.getByText("Pune, MH")).toBeInTheDocument();
    expect(screen.getByText(/12\.5 km/)).toBeInTheDocument();
  });

  it("uses identical structure for every listing type", () => {
    const html = (l: Listing) => renderApp(<ListingCard listing={l} onOpen={() => {}} actionLabel="Go" />).container.querySelector("article, .agro-card")?.className;
    const eq = html(base());
    const seed = html(base({ type: "seed", name: "Maize", details: { crop: "Maize" } }));
    const worker = html(base({ type: "worker", name: "Ravi", details: { skills: ["Harvesting"] } }));
    expect(seed).toBe(eq);
    expect(worker).toBe(eq);
  });

  it("calls the action and the open handlers separately", async () => {
    const onOpen = vi.fn(); const onAction = vi.fn();
    renderApp(<ListingCard listing={base()} onOpen={onOpen} actionLabel="Rent" onAction={onAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Rent" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("disables the action for unavailable listings", () => {
    renderApp(<ListingCard listing={base({ available: false })} onOpen={() => {}} actionLabel="Rent" onAction={() => {}} />);
    expect(screen.getByRole("button", { name: "Rent" })).toBeDisabled();
  });

  it("shows no distance when the listing has no coordinates (never a fake one)", () => {
    renderApp(<ListingCard listing={base({ distanceKm: null, hasCoordinates: false })} onOpen={() => {}} actionLabel="Rent" />);
    expect(screen.queryByText(/km/)).not.toBeInTheDocument();
  });

  it("flips to specifications", async () => {
    renderApp(<ListingCard listing={base()} onOpen={() => {}} actionLabel="Rent" />);
    await userEvent.click(screen.getByRole("button", { name: /specifications/i }));
    expect(await screen.findByText("50 HP")).toBeInTheDocument();
  });
});
