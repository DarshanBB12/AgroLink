import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Real router, real translations, real react-query. Only Auth and the network are stubbed per test.
export const renderApp = (ui: ReactElement, route = "/") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
};
