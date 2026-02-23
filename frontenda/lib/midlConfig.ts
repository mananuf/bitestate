"use client";

import { createConfig, regtest } from "@midl/core";
import { xverseConnector } from "@midl/connectors";

export const midlConfig = createConfig({
  networks: [regtest],
  connectors: [xverseConnector()],
  persist: true, // Enable persistence to store the wallet connection state
});
