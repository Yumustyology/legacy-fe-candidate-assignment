import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const environmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;

  if (!environmentId) {
    console.error("VITE_DYNAMIC_ENVIRONMENT_ID is not defined!");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Configuration Error
          </h1>
          <p className="text-gray-600">Missing Dynamic.xyz Environment ID</p>
          <p className="text-sm text-gray-500 mt-2">
            Please check your .env file
          </p>
        </div>
      </div>
    );
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId,
        initialAuthenticationMode: "connect-only",  
        walletConnectors: [EthereumWalletConnectors],
        appName: "Web3 Message Signer",
        appLogoUrl: undefined,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </DynamicContextProvider>
  );
}

export default App;
