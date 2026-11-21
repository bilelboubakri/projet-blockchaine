const { ethers } = require("ethers");
async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
  const address = "0x1e014ae833c5EF5635c09E53A35ef38E8436616d";
  const balance = await provider.getBalance(address);
  console.log("Sepolia Balance:", ethers.formatEther(balance), "ETH");
}
main().catch(console.error);
