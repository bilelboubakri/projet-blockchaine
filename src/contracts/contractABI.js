// ABI officiel du Smart Contract DiplomaRegistry
// Généré après compilation avec : npx hardhat compile
// Ce fichier est utilisé par ethers.js pour interagir avec le contrat Ethereum

export const DIPLOMA_REGISTRY_ABI = [
  // ─── EVENTS ───────────────────────────────────────────────────────────────
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "bytes32", "name": "hashPdf",      "type": "bytes32" },
      { "indexed": false, "internalType": "string",  "name": "nomEtudiant",  "type": "string"  },
      { "indexed": false, "internalType": "string",  "name": "filiere",      "type": "string"  },
      { "indexed": false, "internalType": "string",  "name": "ipfsCid",      "type": "string"  },
      { "indexed": false, "internalType": "uint256", "name": "dateEmission", "type": "uint256" }
    ],
    "name": "DiplomeEmis",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "bytes32", "name": "hashPdf",        "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "dateRevocation", "type": "uint256" }
    ],
    "name": "DiplomeRevoque",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "bytes32", "name": "hashPdf",          "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "dateReactivation", "type": "uint256" }
    ],
    "name": "DiplomeReactive",
    "type": "event"
  },
  // ─── CONSTRUCTOR ──────────────────────────────────────────────────────────
  {
    "inputs": [{ "internalType": "string", "name": "_nomEtablissement", "type": "string" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  // ─── FONCTIONS D'ÉCRITURE (onlyOwner) ────────────────────────────────────
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_hashPdf",     "type": "bytes32" },
      { "internalType": "string",  "name": "_nomEtudiant", "type": "string"  },
      { "internalType": "string",  "name": "_filiere",     "type": "string"  },
      { "internalType": "string",  "name": "_annee",       "type": "string"  },
      { "internalType": "string",  "name": "_ipfsCid",     "type": "string"  }
    ],
    "name": "emettreDiplome",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "_hashPdf", "type": "bytes32" }],
    "name": "revoquerDiplome",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "_hashPdf", "type": "bytes32" }],
    "name": "reactiverDiplome",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_newOwner", "type": "address" }],
    "name": "transfererPropriete",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // ─── FONCTIONS DE LECTURE (view — gratuites) ──────────────────────────────
  {
    "inputs": [{ "internalType": "bytes32", "name": "_hashPdf", "type": "bytes32" }],
    "name": "verifierDiplome",
    "outputs": [
      { "internalType": "bool",    "name": "existe",       "type": "bool"    },
      { "internalType": "string",  "name": "nomEtudiant",  "type": "string"  },
      { "internalType": "string",  "name": "filiere",      "type": "string"  },
      { "internalType": "string",  "name": "annee",        "type": "string"  },
      { "internalType": "uint256", "name": "dateEmission", "type": "uint256" },
      { "internalType": "string",  "name": "ipfsCid",      "type": "string"  },
      { "internalType": "bool",    "name": "valide",       "type": "bool"    }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTousDiplomes",
    "outputs": [
      {
        "components": [
          { "internalType": "bytes32", "name": "hashPdf",      "type": "bytes32" },
          { "internalType": "string",  "name": "nomEtudiant",  "type": "string"  },
          { "internalType": "string",  "name": "filiere",      "type": "string"  },
          { "internalType": "string",  "name": "annee",        "type": "string"  },
          { "internalType": "uint256", "name": "dateEmission", "type": "uint256" },
          { "internalType": "string",  "name": "ipfsCid",      "type": "string"  },
          { "internalType": "bool",    "name": "valide",       "type": "bool"    },
          { "internalType": "bool",    "name": "existe",       "type": "bool"    }
        ],
        "internalType": "struct DiplomaRegistry.Diplome[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getNombreDiplomes",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nomEtablissement",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "tousLesHashes",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ─── CONFIGURATION DU RÉSEAU ──────────────────────────────────────────────────
export const CONTRACT_CONFIG = {
  // ⚠️  Remplacer par l'adresse réelle après déploiement sur Sepolia
  address: import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || "11155111"),
  networkName: import.meta.env.VITE_NETWORK || "sepolia",

  // RPC public pour la lecture (vérification sans MetaMask)
  publicRpcUrl: import.meta.env.VITE_PUBLIC_RPC || "https://ethereum-sepolia-rpc.publicnode.com",
  
  // Explorer
  explorerUrl: "https://sepolia.etherscan.io",
};

// Réseaux supportés
export const SUPPORTED_NETWORKS = {
  11155111: {
    name: "Sepolia",
    explorer: "https://sepolia.etherscan.io",
    rpc: "https://ethereum-sepolia-rpc.publicnode.com",
    currency: "SepoliaETH",
    icon: "🔵"
  },
  80002: {
    name: "Polygon Amoy",
    explorer: "https://amoy.polygonscan.com",
    rpc: "https://rpc-amoy.polygon.technology",
    currency: "MATIC",
    icon: "🟣"
  }
};
