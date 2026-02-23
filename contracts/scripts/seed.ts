import hre from "hardhat";

async function main() {
  const contractAddress = "0xC2DcED4E47cf45FEEC1b432AeA91ca09Cb830050";
  console.log(`Connecting to BitEstate contract at ${contractAddress}...`);
  const contract = await hre.ethers.getContractAt("BitEstate", contractAddress);
  const feeData = await hre.ethers.provider.getFeeData();

  const propertiesToSeed = [
    { price: hre.ethers.parseEther("2.50"), uri: "Luxury Condo in Neo-Tokyo" },
    { price: hre.ethers.parseEther("8.00"), uri: "Minimalist Villa in Bali" },
    { price: hre.ethers.parseEther("4.20"), uri: "Cyberpunk Penthouse in Night City" }
  ];

  for (const p of propertiesToSeed) {
    console.log(`Listing ${p.uri} for ${hre.ethers.formatEther(p.price)} BTC...`);
    // Explicitly pass gasPrice to avoid Hardhat injecting EIP-1559 fee headers 
    // which clash with the Midl EVM expectations.
    const tx = await contract.listProperty(p.price, p.uri, { 
      type: 0,
      gasPrice: feeData.gasPrice || 1000000000n,
    });
    await tx.wait();
    console.log(`Listed! Hash: ${tx.hash}`);
  }

  console.log("Seeding complete!");
}

main().catch(console.error);
