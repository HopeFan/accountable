import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthGate } from "./components/AuthGate";
import { ToastProvider } from "./components/Toast";
import { createAuthClient, fetchConfig } from "./lib/config";
import { watchDeviceTheme } from "./lib/theme";
import "./theme/tokens.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

watchDeviceTheme();

const root = createRoot(document.getElementById("root")!);

fetchConfig()
  .then(createAuthClient)
  .then((client) =>
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthGate client={client}>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthGate>
          </BrowserRouter>
        </QueryClientProvider>
      </StrictMode>,
    ),
  )
  .catch(() => {
    root.render(
      <p role="alert">Can't load Accountable. Reload to try again.</p>,
    );
  });
