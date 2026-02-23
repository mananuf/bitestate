"use client";

import { MidlProvider } from "@midl/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { queryClient } from "@/lib/queryClient";
import { midlConfig } from "@/lib/midlConfig";
import { wagmiConfig } from "@/lib/wagmiConfig";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MidlProvider config={midlConfig}>
          {children}
        </MidlProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
