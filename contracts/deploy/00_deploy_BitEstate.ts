import type { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async (hre) => {
  /**
   * Initializes the MIDL hardhat deploy SDK
   */
  await hre.midl.initialize();

  /**
   * Add the deploy contract transaction intention
   * BitEstate has no constructor arguments.
   */
  await hre.midl.deploy("BitEstate", []);

  /**
   * Sends the BTC transaction and EVM transaction to the network
   */
  await hre.midl.execute();
};

deploy.tags = ["main", "BitEstate"];
export default deploy;
