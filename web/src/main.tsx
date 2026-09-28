import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { App } from "./App";
import "./styles.css";
// One tokens block per theme, discovered from the themes/ folders.
import.meta.glob("../../themes/*/tokens.css", { eager: true });

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function Root({ publishableKey }: { publishableKey: string }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      afterSignOutUrl="/"
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

async function boot() {
  const container = document.getElementById("root")!;
  const response = await fetch("/api/config");
  if (!response.ok) {
    container.textContent = "littleHYPE is unavailable right now. Please try again shortly.";
    return;
  }
  const { clerkPublishableKey } = (await response.json()) as { clerkPublishableKey: string };
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <Root publishableKey={clerkPublishableKey} />
      </BrowserRouter>
    </StrictMode>,
  );
}

void boot();
