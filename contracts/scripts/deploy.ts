const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);

  // Deploy BitEstate
  const BitEstate = await ethers.getContractFactory("BitEstate");
  const bitEstate = await BitEstate.deploy();

  await bitEstate.waitForDeployment();

  const address = await bitEstate.getAddress();
  console.log("BitEstate Smart Contract deployed to:", address);

  // Output ABI for frontend use
  const fs = require('fs');
  const path = require('path');
  const artifactPath = path.join(__dirname, '../artifacts/contracts/BitEstate.sol/BitEstate.json');
  if(fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    console.log("\n--- ABI ---");
    console.log(JSON.stringify(artifact.abi, null, 2));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
