"use client";

import { http, createConfig as createWagmiConfig } from "wagmi";
import { midlRegtest } from "@midl/executor";

export const wagmiConfig = createWagmiConfig({
  chains: [midlRegtest],
  transports: {
    [midlRegtest.id]: http(),
  },
});
