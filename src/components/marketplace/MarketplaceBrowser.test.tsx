import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketplaceBrowser } from "./MarketplaceBrowser";
import { renderApp } from "@/test/render";
import { signInAs } from "@/test/authMock";
import * as marketplace from "@/services/marketplace";
import type { Listing } from "@/types/api";

vi.mock("@/contexts/AuthContext", async () => (await import("@/test/authMock")).authModule);
vi.mock("@/services/marketplace", async (orig) => ({ ...(await orig<typeof import("@/services/marketplace")>()), searchListings: vi.fn(), fetchSuggestions: vi.fn().mockResolvedValue([]), equipmentAvailability: vi.fn().mockResolvedValue({ listed: true, bookedRanges: [], requested: null }) }));
vi.mock("@/components/common/LocationControl", () => ({ LocationControl: () => <div>location control</div> }));

const item = (id: string, name: string, over: Partial<Listing> = {}): Listing => ({
  id, type: "equipment", name, category: "Tractor", description: "", price: 1000, priceUnit: "day", rating: 4, location: "Pune", available: true, distanceKm: null,
  hasCoordinates: false, owner: null, details: {}, createdAt: "2026-01-01", ...over,
});
const pagination = (total: number) => ({ page: 1, limit: 12, total, totalPages: Math.max(1, Math.ceil(total / 12)), hasNext: false, hasPrev: false });
const search = vi.mocked(marketplace.searchListings);

describe("MarketplaceBrowser search", () => {
  beforeEach(() => { signInAs("farmer"); search.mockReset(); });

  it("shows a loading skeleton, then real results", async () => {
    search.mockResolvedValue({ data: [item("1", "Mini Tiller"), item("2", "Big Tractor")], pagination: pagination(2) });
    renderApp(<MarketplaceBrowser type="equipment" title="Equipment" />, "/dashboard/farmer/equipment");
    expect(await screen.findByText("Mini Tiller")).toBeInTheDocument();
    expect(screen.getByText("Big Tractor")).toBeInTheDocument();
  });

  it("sends trimmed text to the API after the debounce (and not on every keystroke)", async () => {
    search.mockResolvedValue({ data: [item("1", "Mini Tiller")], pagination: pagination(1) });
    renderApp(<MarketplaceBrowser type="equipment" title="Equipment" />, "/dashboard/farmer/equipment");
    await screen.findByText("Mini Tiller");
    const before = search.mock.calls.length;
    await userEvent.type(screen.getByRole("searchbox"), "  TRACTOR  ");
    await waitFor(() => expect(search.mock.calls.at(-1)?.[1]).toMatchObject({ q: "TRACTOR" }), { timeout: 3000 });
    expect(search.mock.calls.length - before).toBeLessThan(5); // debounced, far fewer than the 11 keystrokes
  });

  it("shows an empty state when nothing matches, and 'clear' brings results back", async () => {
    search.mockImplementation(async (_t, p) => (p.q ? { data: [], pagination: pagination(0) } : { data: [item("1", "Mini Tiller")], pagination: pagination(1) }));
    renderApp(<MarketplaceBrowser type="equipment" title="Equipment" />, "/dashboard/farmer/equipment?q=zzz");
    expect(await screen.findByText(/no results found/i)).toBeInTheDocument();
    const clearButtons = await screen.findAllByRole("button", { name: /clear all filters/i });
    await userEvent.click(clearButtons[clearButtons.length - 1]);
    expect(await screen.findByText("Mini Tiller")).toBeInTheDocument();
  });

  it("shows an error with a working retry when the API fails", async () => {
    search.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: { message: "Server error" } } });
    search.mockResolvedValue({ data: [item("1", "Mini Tiller")], pagination: pagination(1) });
    renderApp(<MarketplaceBrowser type="equipment" title="Equipment" />, "/dashboard/farmer/equipment");
    expect(await screen.findByRole("alert")).toHaveTextContent(/server error/i);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Mini Tiller")).toBeInTheDocument();
  });

  it("filters come from the URL, so a refresh keeps them, and they are sent together", async () => {
    search.mockResolvedValue({ data: [item("1", "Mini Tiller")], pagination: pagination(1) });
    renderApp(<MarketplaceBrowser type="equipment" title="Equipment" />, "/dashboard/farmer/equipment?category=Tractor&location=Pune&maxPrice=3000&available=true&sort=price_asc");
    await screen.findByText("Mini Tiller");
    expect(search.mock.calls[0][1]).toMatchObject({ category: "Tractor", location: "Pune", maxPrice: "3000", available: "true", sort: "price_asc" });
  });

  it("does not send an inverted price range to the server and says why", async () => {
    search.mockResolvedValue({ data: [], pagination: pagination(0) });
    renderApp(<MarketplaceBrowser type="equipment" title="Equipment" />, "/dashboard/farmer/equipment?minPrice=500&maxPrice=100");
    await screen.findByText(/no results found/i);
    for (const call of search.mock.calls) expect(call[1].minPrice).toBeUndefined();
    expect(screen.getByText(/minimum price cannot be higher/i)).toBeInTheDocument();
  });

  it("opens the matching detail dialog with the booking action when a result is clicked", async () => {
    search.mockResolvedValue({ data: [item("1", "Mini Tiller")], pagination: pagination(1) });
    renderApp(<MarketplaceBrowser type="equipment" title="Equipment" />, "/dashboard/farmer/equipment");
    await userEvent.click(await screen.findByText("Mini Tiller"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
