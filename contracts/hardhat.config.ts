import "@nomicfoundation/hardhat-toolbox";
import "@midl/hardhat-deploy";
import "hardhat-deploy";
import { vars } from "hardhat/config";
import { midlRegtest } from "@midl/executor";

const mnemonic = vars.has("MNEMONIC") ? vars.get("MNEMONIC") : "test test test test test test test test test test test junk";

const config = {
  solidity: "0.8.24",
  midl: {

    networks: {
      regtest: {
      hardhatNetwork: "regtest",
      network: "regtest",
        mnemonic: mnemonic,
        confirmationsRequired: 1,
        btcConfirmationsRequired: 1,
      },
    },
  },
  networks: {
    regtest: {
      url: midlRegtest.rpcUrls.default.http[0],
      chainId: midlRegtest.id,
    },
  },
  etherscan: {
    apiKey: { "regtest": "empty" },
    customChains: [
      {
        network: "regtest",
        chainId: midlRegtest.id,
        urls: {
          apiURL: "https://blockscout.staging.midl.xyz/api",
          browserURL: "https://blockscout.staging.midl.xyz",
        },
      },
    ],
  },
};

export default config;
