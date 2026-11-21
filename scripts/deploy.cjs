// Script de déploiement du Smart Contract DiplomaRegistry
// Usage : npx hardhat run scripts/deploy.cjs --network sepolia
const hre = require("hardhat");

async function main() {
  console.log("🚀 Déploiement du Smart Contract DiplomaRegistry...");
  console.log("📡 Réseau :", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("🔑 Compte déployeur (owner) :", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Solde ETH du déployeur :", hre.ethers.formatEther(balance), "ETH");

  // Déployer le contrat avec le nom de l'université
  const nomEtablissement = "Université de Technologie & Blockchain";
  const DiplomaRegistry = await hre.ethers.getContractFactory("DiplomaRegistry");
  const contrat = await DiplomaRegistry.deploy(nomEtablissement);

  await contrat.waitForDeployment();
  const adresse = await contrat.getAddress();

  console.log("\n✅ Contrat DiplomaRegistry déployé avec succès !");
  console.log("📋 Adresse du contrat :", adresse);
  console.log("🏛️  Établissement :", nomEtablissement);
  console.log("👤 Owner :", deployer.address);

  if (hre.network.name === "sepolia") {
    console.log("\n🔍 Vérification sur Etherscan Sepolia :");
    console.log(`   https://sepolia.etherscan.io/address/${adresse}`);
    console.log("\n⏳ Attente de 30 secondes avant vérification Etherscan...");
    await new Promise(r => setTimeout(r, 30000));
    try {
      await hre.run("verify:verify", {
        address: adresse,
        constructorArguments: [nomEtablissement],
      });
      console.log("✅ Contrat vérifié sur Etherscan !");
    } catch (e) {
      console.log("⚠️  Vérification Etherscan échouée (peut-être déjà vérifié):", e.message);
    }
  }

  // Affichage du fichier .env à créer
  console.log("\n📝 Mettez à jour votre fichier .env avec :");
  console.log(`VITE_CONTRACT_ADDRESS=${adresse}`);
  console.log(`VITE_NETWORK=sepolia`);
  console.log(`VITE_CHAIN_ID=11155111`);
}

main().catch((error) => {
  console.error("❌ Erreur de déploiement :", error);
  process.exit(1);
});
