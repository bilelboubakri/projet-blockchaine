import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { DIPLOMA_REGISTRY_ABI, CONTRACT_CONFIG, SUPPORTED_NETWORKS } from '../contracts/contractABI';
import { computeSHA256 } from '../utils/cryptoUtils';
import { uploadToIPFS } from '../utils/ipfsService';

const Web3Context = createContext(null);

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error('useWeb3 must be used inside Web3Provider');
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER — Gestion MetaMask + ethers.js v6 + contrat Ethereum Sepolia
// ─────────────────────────────────────────────────────────────────────────────
export function Web3Provider({ children }) {
  // ── État Wallet MetaMask ──────────────────────────────────────────────────
  const [account, setAccount]                 = useState(null);   // Adresse connectée
  const [chainId, setChainId]                 = useState(null);   // ID du réseau
  const [isOwner, setIsOwner]                 = useState(false);  // Est-ce l'owner ?
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletError, setWalletError]         = useState('');

  // ── Providers ethers.js ───────────────────────────────────────────────────
  const [provider, setProvider]               = useState(null);   // BrowserProvider (MetaMask)
  const [signer, setSigner]                   = useState(null);   // Signer pour les tx
  const [readContract, setReadContract]       = useState(null);   // Contrat lecture (JsonRpc)
  const [writeContract, setWriteContract]     = useState(null);   // Contrat écriture (signer)

  // ── État de l'interface ───────────────────────────────────────────────────
  const [diplomas, setDiplomas]               = useState([]);
  const [loadingDiplomas, setLoadingDiplomas] = useState(false);
  const [pinataJwt, setPinataJwt]             = useState(
    () => localStorage.getItem('certichain_pinata_jwt') || ''
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Initialisation du provider de LECTURE publique (sans MetaMask)
  // Utilisé par le vérificateur public pour appeler verifierDiplome() gratuitement
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    initPublicReadProvider();
    checkIfWalletAlreadyConnected();
  }, []);

  async function initPublicReadProvider() {
    try {
      // Fournisseur JSON-RPC public pour la lecture (sans wallet)
      const jsonProvider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.publicRpcUrl);
      const contract = new ethers.Contract(
        CONTRACT_CONFIG.address,
        DIPLOMA_REGISTRY_ABI,
        jsonProvider
      );
      setReadContract(contract);
    } catch (err) {
      console.warn('Read provider init warning:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Reconnexion automatique si MetaMask était déjà connecté
  // ─────────────────────────────────────────────────────────────────────────
  async function checkIfWalletAlreadyConnected() {
    if (!window.ethereum) return;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await setupWalletConnection(accounts[0]);
      }
    } catch (err) {
      console.warn('Auto-reconnect failed:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Configuration complète du wallet après connexion MetaMask
  // ─────────────────────────────────────────────────────────────────────────
  async function setupWalletConnection(userAccount) {
    const ethProvider = new ethers.BrowserProvider(window.ethereum);
    const ethSigner   = await ethProvider.getSigner();
    const network     = await ethProvider.getNetwork();
    const cId         = Number(network.chainId);

    setProvider(ethProvider);
    setSigner(ethSigner);
    setAccount(userAccount);
    setChainId(cId);

    // Contrat en lecture/écriture avec le signer MetaMask
    const contractWrite = new ethers.Contract(
      CONTRACT_CONFIG.address,
      DIPLOMA_REGISTRY_ABI,
      ethSigner
    );
    setWriteContract(contractWrite);

    // Vérifier si l'adresse connectée est l'owner du contrat
    try {
      if (CONTRACT_CONFIG.address !== '0x0000000000000000000000000000000000000000') {
        const ownerAddr = await contractWrite.owner();
        setIsOwner(ownerAddr.toLowerCase() === userAccount.toLowerCase());
      }
    } catch {}

    // Charger les diplômes depuis la blockchain
    await loadDiplomas(contractWrite);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONNEXION MetaMask — Demande l'autorisation à l'utilisateur
  // ─────────────────────────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setWalletError('');
    setWalletConnecting(true);

    if (!window.ethereum) {
      setWalletError('MetaMask non détecté. Veuillez installer l\'extension MetaMask dans Chrome.');
      setWalletConnecting(false);
      return;
    }

    try {
      // Demander la connexion au wallet
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        setWalletError('Connexion refusée par MetaMask.');
        setWalletConnecting(false);
        return;
      }

      await setupWalletConnection(accounts[0]);

      // Vérifier le réseau
      const network = await new ethers.BrowserProvider(window.ethereum).getNetwork();
      const cId = Number(network.chainId);
      if (cId !== CONTRACT_CONFIG.chainId) {
        // Proposer de changer de réseau
        await switchToCorrectNetwork();
      }
    } catch (err) {
      if (err.code === 4001) {
        setWalletError('Connexion refusée. Veuillez approuver la demande dans MetaMask.');
      } else {
        setWalletError('Erreur de connexion : ' + (err.message || 'Erreur inconnue'));
      }
    } finally {
      setWalletConnecting(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Basculer vers Sepolia si l'utilisateur est sur le mauvais réseau
  // ─────────────────────────────────────────────────────────────────────────
  async function switchToCorrectNetwork() {
    const targetChain = `0x${CONTRACT_CONFIG.chainId.toString(16)}`;
    const networkInfo = SUPPORTED_NETWORKS[CONTRACT_CONFIG.chainId];
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChain }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        // Réseau non connu de MetaMask, l'ajouter
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: targetChain,
            chainName: networkInfo?.name || 'Sepolia',
            nativeCurrency: { name: networkInfo?.currency || 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [networkInfo?.rpc || CONTRACT_CONFIG.publicRpcUrl],
            blockExplorerUrls: [networkInfo?.explorer || 'https://sepolia.etherscan.io']
          }]
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Déconnexion (effacement état local)
  // ─────────────────────────────────────────────────────────────────────────
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setIsOwner(false);
    setSigner(null);
    setProvider(null);
    setWriteContract(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Écoute des événements MetaMask (changement de compte/réseau)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setupWalletConnection(accounts[0]);
      }
    };

    const handleChainChanged = (chainIdHex) => {
      setChainId(parseInt(chainIdHex, 16));
      window.location.reload(); // Reload recommandé par MetaMask
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnectWallet]);

  // ─────────────────────────────────────────────────────────────────────────
  // CHARGER LES DIPLÔMES depuis la blockchain (lecture publique)
  // ─────────────────────────────────────────────────────────────────────────
  const loadDiplomas = useCallback(async (contractInstance = null) => {
    const c = contractInstance || writeContract || readContract;
    if (!c) return;
    if (CONTRACT_CONFIG.address === '0x0000000000000000000000000000000000000000') return;

    setLoadingDiplomas(true);
    try {
      const rawList = await c.getTousDiplomes();
      const parsed = rawList.map(d => ({
        hashPdf:      d.hashPdf,
        nomEtudiant:  d.nomEtudiant,
        filiere:      d.filiere,
        annee:        d.annee,
        dateEmission: Number(d.dateEmission),
        ipfsCid:      d.ipfsCid,
        valide:       d.valide,
        existe:       d.existe,
      }));
      setDiplomas(parsed.reverse()); // Plus récent en premier
    } catch (err) {
      console.warn('Chargement diplômes échoué:', err.message);
    } finally {
      setLoadingDiplomas(false);
    }
  }, [writeContract, readContract]);

  // ─────────────────────────────────────────────────────────────────────────
  // ÉMETTRE UN DIPLÔME — Transaction on-chain via MetaMask
  // ─────────────────────────────────────────────────────────────────────────
  const issueDiploma = useCallback(async ({ pdfFile, nomEtudiant, filiere, annee }) => {
    if (!writeContract || !signer) {
      throw new Error('Veuillez connecter votre wallet MetaMask (compte owner du contrat).');
    }
    if (!account) throw new Error('Aucun compte MetaMask connecté.');
    if (chainId !== CONTRACT_CONFIG.chainId) {
      throw new Error(`Mauvais réseau. Veuillez basculer sur Sepolia (chainId ${CONTRACT_CONFIG.chainId}).`);
    }

    // 1. Calcul SHA-256 local dans le navigateur (100% client-side)
    const { bytes32Hash } = await computeSHA256(pdfFile);

    // 2. Vérification anti-doublon (lecture gratuite avant la tx)
    const existing = await writeContract.verifierDiplome(bytes32Hash);
    if (existing.existe) {
      throw new Error(`Ce PDF est déjà certifié dans le registre pour : ${existing.nomEtudiant}`);
    }

    // 3. Téléversement IPFS (Pinata ou simulation)
    let ipfsCid = 'bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354';
    try {
      const ipfsResult = await uploadToIPFS(
        pdfFile,
        `diplome_${nomEtudiant.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
        pinataJwt
      );
      ipfsCid = ipfsResult.cid;
    } catch (ipfsErr) {
      console.warn('IPFS upload failed, using simulated CID:', ipfsErr.message);
    }

    // 4. Transaction Ethereum via MetaMask — l'utilisateur signe dans MetaMask
    // Estimation du gas avant d'envoyer
    const gasEstimate = await writeContract.emettreDiplome.estimateGas(
      bytes32Hash, nomEtudiant, filiere, annee, ipfsCid
    );

    const tx = await writeContract.emettreDiplome(
      bytes32Hash,
      nomEtudiant,
      filiere,
      annee,
      ipfsCid,
      { gasLimit: gasEstimate * 120n / 100n } // +20% marge de sécurité
    );

    // 5. Attendre la confirmation de la transaction sur Ethereum
    const receipt = await tx.wait(1); // Attendre 1 confirmation

    // 6. Recharger la liste depuis la blockchain
    await loadDiplomas();

    return {
      success:    true,
      txHash:     receipt.hash,
      bytes32Hash,
      ipfsCid,
      blockNumber: receipt.blockNumber,
    };
  }, [writeContract, signer, account, chainId, pinataJwt, loadDiplomas]);

  // ─────────────────────────────────────────────────────────────────────────
  // VÉRIFIER UN DIPLÔME — Lecture gratuite (JsonRpcProvider ou MetaMask)
  // ─────────────────────────────────────────────────────────────────────────
  const verifyDiploma = useCallback(async (bytes32Hash) => {
    const c = readContract || writeContract;
    if (!c) {
      throw new Error('Pas de connexion au réseau Ethereum disponible.');
    }
    if (!bytes32Hash || bytes32Hash.length !== 66) {
      throw new Error('Format de hash invalide. Le hash doit comporter 66 caractères (0x + 64 hex).');
    }
    if (CONTRACT_CONFIG.address === '0x0000000000000000000000000000000000000000') {
      throw new Error('Le contrat n\'est pas encore déployé. Configurez VITE_CONTRACT_ADDRESS dans .env.');
    }

    const result = await c.verifierDiplome(bytes32Hash);
    return {
      existe:       result.existe,
      nomEtudiant:  result.nomEtudiant,
      filiere:      result.filiere,
      annee:        result.annee,
      dateEmission: Number(result.dateEmission),
      ipfsCid:      result.ipfsCid,
      valide:       result.valide,
      hashPdf:      bytes32Hash,
    };
  }, [readContract, writeContract]);

  // ─────────────────────────────────────────────────────────────────────────
  // RÉVOQUER UN DIPLÔME — Transaction on-chain via MetaMask (onlyOwner)
  // ─────────────────────────────────────────────────────────────────────────
  const revokeDiploma = useCallback(async (bytes32Hash) => {
    if (!writeContract || !signer) throw new Error('Wallet non connecté.');
    if (!isOwner) throw new Error('Seul le propriétaire du contrat peut révoquer un diplôme.');

    const tx = await writeContract.revoquerDiplome(bytes32Hash);
    await tx.wait(1);
    await loadDiplomas();
    return { txHash: tx.hash };
  }, [writeContract, signer, isOwner, loadDiplomas]);

  // ─────────────────────────────────────────────────────────────────────────
  // RÉACTIVER UN DIPLÔME — Transaction on-chain via MetaMask (onlyOwner)
  // ─────────────────────────────────────────────────────────────────────────
  const reactivateDiploma = useCallback(async (bytes32Hash) => {
    if (!writeContract || !signer) throw new Error('Wallet non connecté.');
    if (!isOwner) throw new Error('Seul le propriétaire du contrat peut réactiver un diplôme.');

    const tx = await writeContract.reactiverDiplome(bytes32Hash);
    await tx.wait(1);
    await loadDiplomas();
    return { txHash: tx.hash };
  }, [writeContract, signer, isOwner, loadDiplomas]);

  // ─────────────────────────────────────────────────────────────────────────
  // Sauvegarde du JWT Pinata
  // ─────────────────────────────────────────────────────────────────────────
  const savePinataJwt = useCallback((jwt) => {
    setPinataJwt(jwt);
    localStorage.setItem('certichain_pinata_jwt', jwt);
  }, []);

  // Vérifications utiles pour l'interface
  const isWrongNetwork = account && chainId && chainId !== CONTRACT_CONFIG.chainId;
  const isContractDeployed = CONTRACT_CONFIG.address !== '0x0000000000000000000000000000000000000000';

  return (
    <Web3Context.Provider value={{
      // État wallet
      account,
      chainId,
      isOwner,
      walletConnecting,
      walletError,
      isWrongNetwork,
      isContractDeployed,
      // Actions wallet
      connectWallet,
      disconnectWallet,
      switchToCorrectNetwork,
      // Données blockchain
      diplomas,
      loadingDiplomas,
      loadDiplomas,
      // Actions contrat
      issueDiploma,
      verifyDiploma,
      revokeDiploma,
      reactivateDiploma,
      // Config
      contractAddress: CONTRACT_CONFIG.address,
      networkName: CONTRACT_CONFIG.networkName,
      explorerUrl: CONTRACT_CONFIG.explorerUrl,
      pinataJwt,
      savePinataJwt,
    }}>
      {children}
    </Web3Context.Provider>
  );
}
