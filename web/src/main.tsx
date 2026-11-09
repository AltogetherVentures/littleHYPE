import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider, createAuthClient } from "./lib/auth";
import "./styles.css";
// Each theme's tokens.css and theme.css, discovered from the themes/ folders.
import.meta.glob("../../themes/*/*.css", { eager: true });

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

async function boot() {
  const container = document.getElementById("root")!;
  const response = await fetch("/api/config");
  if (!response.ok) {
    container.textContent = "littleHYPE is unavailable right now. Please try again shortly.";
    return;
  }
  const { supabaseUrl, supabaseAnonKey } = (await response.json()) as { supabaseUrl: string; supabaseAnonKey: string };
  const client = createAuthClient(supabaseUrl, supabaseAnonKey);
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider client={client}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}

void boot();
