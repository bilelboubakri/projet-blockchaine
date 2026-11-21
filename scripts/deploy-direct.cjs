// Script de déploiement direct sans plugin tiers via ethers.js v6
// Usage: node scripts/deploy-direct.cjs [PRIVATE_KEY] [RPC_URL]
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const FALLBACK_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.drpc.org",
  "https://1rpc.io/sepolia",
  "https://rpc2.sepolia.org",
  "https://endpoints.omniatech.io/v1/eth/sepolia/public"
];

async function getWorkingProvider(customRpc) {
  const rpcsToTry = customRpc ? [customRpc, ...FALLBACK_RPCS] : FALLBACK_RPCS;

  for (const rpc of rpcsToTry) {
    try {
      console.log(`🔌 Test de connexion RPC : ${rpc} ...`);
      const provider = new ethers.JsonRpcProvider(rpc, undefined, { staticNetwork: true });
      const network = await Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 6000))
      ]);
      console.log(`✅ Connecté avec succès via : ${rpc} (ChainID: ${network.chainId})\n`);
      return { provider, rpcUrl: rpc };
    } catch (err) {
      console.warn(`⚠️  Échec RPC (${rpc}) : ${err.message}. Essai du suivant...`);
    }
  }
  throw new Error("Impossible de se connecter à un RPC Sepolia public.");
}

async function main() {
  console.log("=================================================");
  console.log("   DÉPLOIEMENT DIRECT DIPLOMAREGISTRY SUR SEPOLIA ");
  console.log("=================================================\n");

  const privateKey = process.argv[2] || process.env.PRIVATE_KEY;
  const customRpc = process.argv[3] || process.env.SEPOLIA_RPC_URL;

  if (!privateKey) {
    console.log("ℹ️  Aucune clé privée fournie.");
    console.log("Pour déployer sur Ethereum Sepolia, lancez :");
    console.log("node scripts/deploy-direct.cjs <VOTRE_CLE_PRIVEE_SEPOLIA>\n");
    return;
  }

  // Connexion automatique au meilleur RPC disponible
  const { provider, rpcUrl } = await getWorkingProvider(customRpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("👤 Déployeur (Owner) :", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Solde SepoliaETH  :", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("❌ Solde insuffisant (0 ETH). Vérifiez que vous avez bien reçu vos SepoliaETH du faucet.");
    process.exit(1);
  }

  // Charger bytecode & abi
  const artifactPath = path.join(__dirname, "../artifacts/contracts/DiplomaRegistry.sol/DiplomaRegistry.json");
  if (!fs.existsSync(artifactPath)) {
    console.error("❌ Artifact introuvable. Exécutez d'abord : npm run compile");
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const nomEtablissement = "Université de Technologie & Blockchain";
  console.log(`\n📦 Déploiement en cours pour : "${nomEtablissement}"...`);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(nomEtablissement);
  console.log("⏳ Transaction envoyée :", contract.deploymentTransaction().hash);
  console.log("⏳ Attente de la validation du bloc sur Sepolia...");

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("\n=================================================");
  console.log("🎉 CONTRAT DÉPLOYÉ AVEC SUCCÈS SUR SEPOLIA !");
  console.log("=================================================");
  console.log("📍 Adresse du Contrat :", contractAddress);
  console.log("🔗 Etherscan : https://sepolia.etherscan.io/address/" + contractAddress);
  console.log("\n📝 Copiez cette ligne dans votre fichier certichain-v2/.env :");
  console.log(`VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`VITE_PUBLIC_RPC=${rpcUrl}\n`);
}

main().catch(err => {
  console.error("\n❌ Erreur lors du déploiement :", err.message || err);
  process.exit(1);
});
