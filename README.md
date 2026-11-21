# CertiChain — Système Académique de Certification Décentralisée & Vérification d'Authenticité

> **Projet Réalisé pour la Soutenance Académique**  
> **Technologies :** Solidity ^0.8.20 • Ethereum (Testnet Sepolia) • Ethers.js v6 • React (Vite) • MetaMask • IPFS (Pinata) • Tailwind CSS

---

## 1. Présentation Générale & Problématique Résolue

### Le Problème : La Fraude aux Diplômes
Dans le monde professionnel actuel, la falsification de diplômes et de certificats universitaires représente un risque majeur pour les recruteurs et décrédibilise les institutions d'enseignement supérieur. Les processus traditionnels de vérification (appels téléphoniques aux secrétariats, courriers officiels) sont lents, coûteux et vulnérables aux faux tampons.

### La Solution CertiChain
**CertiChain** résout ce problème en introduisant un ancrage cryptographique immuable sur la blockchain Ethereum :
1. **L'Université** émet un diplôme officiel (PDF), calcule son empreinte cryptographique unique (**SHA-256**) et l'enregistre de manière permanente dans un **Smart Contract Solidity**.
2. **Le document original** est horodaté et sauvegardé sur le réseau décentralisé **IPFS** (InterPlanetary File System).
3. **Tout Recruteur ou Tiers** peut glisser-déposer le document PDF sur l'application web pour vérifier instantanément son authenticité sans créer de compte, sans installer MetaMask et sans payer le moindre frais de gas.

---

## 2. Architecture Globale du Système

```
┌────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION WEB REACT                         │
│                                                                        │
│   [ Route / (Public - Recruteur) ]     [ Route /admin (Université) ]   │
│   • Glisser-déposer PDF                • Authentification MetaMask     │
│   • Calcul SHA-256 local (WebCrypto)   • Saisie des métadonnées        │
│   • Lecture gratuite (view)            • Upload IPFS (Pinata CID)      │
│   • AUCUN MetaMask requis              • Signature de transaction      │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
         Lecture JsonRpcProvider            Signature BrowserProvider
         (Sans Gas / Gratuit)                  (MetaMask / Gas)
                   │                                 │
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     SMART CONTRACT SOLIDITY ^0.8.20                    │
│                      (Déployé sur Ethereum Sepolia)                    │
│                                                                        │
│  • mapping(bytes32 => Diplome) public diplomes;                        │
│  • modifier onlyOwner : msg.sender == owner                            │
│  • emettreDiplome(bytes32, nom, filiere, annee, ipfsCid)               │
│  • revoquerDiplome(bytes32)                                            │
│  • verifierDiplome(bytes32) [view]                                     │
└────────────────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        STOCKAGE DÉCENTRALISÉ IPFS                      │
│      Fichier PDF complet scellé par Content Identifier (CID)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Séparation Stricte des Deux Interfaces

Conformément au cahier des charges académique, l'application sépare strictement les rôles :

### A. Interface Publique — Route `/` (Recruteur / Vérificateur)
* **Objectif :** Permettre à n'importe quel employeur de vérifier un diplôme en 2 secondes.
* **Absence de barrière à l'entrée :** Aucun portefeuille Web3 ni extension MetaMask n'est exigé.
* **Confidentialité totale :** Le calcul de l'empreinte SHA-256 s'effectue **localement à 100% dans le navigateur** via l'API standard `crypto.subtle.digest('SHA-256', buffer)`. Le fichier PDF ne transite sur aucun serveur web.
* **Appel Smart Contract :** L'application interroge la fonction `verifierDiplome(bytes32 hash)` via un fournisseur JSON-RPC public Ethereum Sepolia (opération `view`, 0 gas).
* **Verdict immédiat :**
  * ✅ **Authentique & Valide :** Affiche le nom de l'étudiant, la filière, l'année, la date d'ancrage et le lien IPFS vers le document original scellé.
  * ❌ **Diplôme Révoqué :** Indique que le diplôme a été invalidé par l'université (fraude ou erreur).
  * ⚠️ **Non Reconnu / Falsifié :** L'empreinte n'existe pas dans le registre blockchain (document contrefait ou altéré).
* **Sécurité de navigation :** Le bouton vers l'Espace Université est visuellement verrouillé avec un cadenas et protégé par une invite de sécurité.

### B. Interface Admin — Route `/admin` (Université)
* **Objectif :** Émettre, certifier, révoquer ou réactiver des diplômes.
* **Contrôle d'Accès Fort :** Connexion obligatoire avec l'extension **MetaMask**. L'application vérifie si l'adresse active correspond à l'adresse `owner` du contrat.
* **Double Mode d'Émission :**
  1. *Générer PDF officiel :* Formulaire étudiant (Nom, Prénom, **Numéro CIN/ID**, Filière, Année, Mention) générant un PDF haute définition avec identifiant unique `CRT-...`, sceau académique et mention du CIN pour **distinguer de manière absolue les étudiants homonymes**.
  2. *Importer PDF existant :* Dépôt d'un diplôme déjà édité pour calcul immédiat de l'empreinte `bytes32`.
* **Affichage de l'Empreinte :** L'administrateur visualise l'empreinte SHA-256 au format Ethereum (`0xbf346...48831`).
* **Envoi IPFS :** Le document PDF est téléversé sur IPFS pour obtenir son CID immuable.
* **Transaction Blockchain :** Clic sur *« Émettre et Ancrer sur la Blockchain »* déclenchant la fenêtre de signature MetaMask pour exécuter `emettreDiplome(...)`.
* **Registre & Révocation :** Visualisation de l'historique complet avec possibilité de révoquer un diplôme en cas de litige.

---

## 4. Analyse Détaillée du Smart Contract (`DiplomaRegistry.sol`)

### 1. La Structure de Données `Diplome`
```solidity
struct Diplome {
    bytes32 hashPdf;      // Empreinte SHA-256 (32 octets)
    string  nomEtudiant;  // Nom complet du titulaire
    string  filiere;      // Cursus académique
    string  annee;        // Année d'obtention (ex: "2024-2025")
    uint256 dateEmission; // Timestamp Unix blockchain (block.timestamp)
    string  ipfsCid;      // Content Identifier IPFS du PDF scellé
    bool    valide;       // Statut légal (true = valide, false = révoqué)
    bool    existe;       // Booléen d'existence anti-doublon
}
```

### 2. Le Stockage dans le Mapping
```solidity
mapping(bytes32 => Diplome) public diplomes;
bytes32[] public tousLesHashes;
```
* **Complexité $O(1)$ :** La recherche par empreinte SHA-256 (`bytes32`) est instantanée et consomme un minimum d'opérations EVM.
* **Tableau `tousLesHashes` :** Permet à l'interface d'administration de lister l'ensemble des diplômes certifiés sans dépendre d'un indexeur externe.

### 3. La Sécurité `onlyOwner`
```solidity
modifier onlyOwner() {
    require(
        msg.sender == owner,
        "DiplomaRegistry: Seule l'universite (owner) peut effectuer cette action"
    );
    _;
}
```
Seule l'adresse qui a initialisé le contrat lors du déploiement (`constructor`) a le pouvoir de certifier ou de révoquer. Toute transaction tentée par un tiers est annulée (`revert`).

### 4. La Fonction de Vérification Gratuite
```solidity
function verifierDiplome(bytes32 _hashPdf) external view returns (
    bool existe, string memory nomEtudiant, string memory filiere,
    string memory annee, uint256 dateEmission, string memory ipfsCid, bool valide
)
```
Le mot-clé `view` garantit que cette fonction ne modifie pas l'état de la blockchain. Elle est donc **exécutée localement par le nœud Ethereum sans transaction et sans frais de gas**.

---

## 5. Pourquoi ce Choix d'Architecture Cryptographique ?

### Pourquoi stocker un Hash SHA-256 et non le fichier PDF sur la Blockchain ?
1. **Coût du Gas (Scalabilité) :** Stocker 1 Mo de données directement sur Ethereum coûterait plusieurs centaines d'euros en gas. Stocker un hash `bytes32` (32 octets fixes) ne coûte qu'une fraction de centime.
2. **Confidentialité & RGPD :** La blockchain est publique et immuable. Écrire des données personnelles brutes sur la blockchain violerait le droit à l'effacement du RGPD. Le hash SHA-256 est une fonction à sens unique mathématiquement irréversible : impossible de déduire le nom ou les notes à partir du hash sans posséder le document original.
3. **Effet Avalanche :** Si un faussaire tente de modifier une seule virgule ou une seule lettre dans le PDF d'origine, l'algorithme SHA-256 produit un hash entièrement différent. Le smart contract rejettera immédiatement le faux document.

---

## 6. Guide d'Installation et Exécution

### Prérequis
* Node.js v18 ou supérieur
* Navigateur Chrome avec l'extension **MetaMask** configurée sur le réseau **Sepolia**

### Lancement du Front-End en Développement
```bash
# Se placer dans le répertoire du projet
cd certichain-v2

# Lancer le serveur Vite
npm run dev
```
L'application s'ouvre à l'adresse : `http://localhost:5173`

### Compiler le Smart Contract
```bash
npm run compile
```

---

## 7. Préparation à la Soutenance : 10 Questions / Réponses Clés pour le Jury

#### Q1. Pourquoi avoir choisi Ethereum et la Blockchain pour vérifier des diplômes ?
> **R :** Contrairement à une base de données centralisée SQL qui peut être piratée, modifiée par un administrateur malveillant ou indisponible suite à une panne de serveur, la blockchain offre trois garanties fondamentales : l'**immuabilité** (une fois écrit, le hash ne peut plus être altéré), la **décentralisation** (le registre fonctionne 24h/24 sans serveur central) et la **transparence** (n'importe qui peut vérifier sans tiers de confiance).

#### Q2. Que se passe-t-il si un étudiant modifie sa note sur le PDF avec Photoshop ?
> **R :** Grâce à l'effet avalanche de la fonction SHA-256, la moindre altération d'un seul octet ou pixel dans le PDF change totalement l'empreinte calculée par le navigateur. Lors de l'interrogation du contrat, la fonction `verifierDiplome` répondra `existe = false`, signalant immédiatement une falsification.

#### Q3. Pourquoi le recruteur n'a-t-il pas besoin de MetaMask ?
> **R :** Dans Ethereum, les fonctions déclarées `view` (comme `verifierDiplome`) ne modifient pas l'état du contrat. Elles peuvent être lues gratuitement via un fournisseur JSON-RPC public (comme `rpc.sepolia.org` ou Infura/Alchemy) sans signature cryptographique et sans dépense d'Ether.

#### Q4. Qu'est-ce que le rôle `onlyOwner` dans le contrat ?
> **R :** C'est un modificateur de contrôle d'accès en Solidity. Lors du déploiement, `owner` reçoit l'adresse de l'université. Les fonctions critiques (`emettreDiplome` et `revoquerDiplome`) vérifient `require(msg.sender == owner)`. Si un pirate tente d'appeler ces fonctions, la Machine Virtuelle Ethereum (EVM) rejette la transaction avec un `revert`.

#### Q5. Pourquoi utiliser IPFS en complément de la Blockchain ?
> **R :** La blockchain Ethereum est optimisée pour stocker des états légers (des hashes de 32 octets), tandis qu'IPFS est un système de fichiers décentralisé pair-à-pair optimisé pour les documents lourds. IPFS utilise le *Content Addressing* (adressage par contenu / CID) : l'adresse du fichier dépend directement de son contenu, garantissant qu'il n'a pas été remplacé.

#### Q6. Quelle est la différence entre révoquer un diplôme et le supprimer de la blockchain ?
> **R :** Sur une blockchain, la suppression physique d'un bloc ou d'une transaction historique est impossible par conception. Pour révoquer un diplôme (en cas de fraude décelée après coup), nous passons le booléen `valide` à `false` via `revoquerDiplome`. L'historique d'émission reste visible, mais tout vérificateur saura que le titre a été invalidé légalement.

#### Q7. Comment gérez-vous la protection de la vie privée (RGPD) ?
> **R :** Seul le hash mathématique (empreinte unidirectionnelle) et le CID IPFS sont liés dans le registre. Aucune donnée personnelle non chiffrée n'est stockée dans des blocs sans lien avec le fichier physique que seul le diplômé détient.

#### Q8. Comment le Front-End communique-t-il avec la Blockchain ?
> **R :** Nous utilisons la bibliothèque `ethers.js` (version 6). 
> * Pour l'écriture (Admin) : `new ethers.BrowserProvider(window.ethereum)` capture la connexion MetaMask pour obtenir un `Signer` et signer les transactions.
> * Pour la lecture (Public) : `new ethers.JsonRpcProvider(rpcUrl)` se connecte directement au réseau Ethereum sans intervention de l'utilisateur.

#### Q9. Que se passe-t-il si deux diplômes ont le même hash ?
> **R :** L'algorithme SHA-256 génère $2^{256}$ combinaisons possibles (soit environ $10^{77}$). La probabilité qu'une collision survienne par hasard est infinitésimale (plus faible que de trouver deux grains de sable identiques sur Terre). De plus, notre contrat vérifie `require(!diplomes[_hashPdf].existe)` pour interdire tout doublon.

#### Q10. Comment votre solution s'adapterait-elle à grande échelle ?
> **R :** Pour limiter les coûts de transaction (gas) à très grande échelle, l'université peut soit déployer sur un Layer 2 Ethereum (Polygon Amoy, Arbitrum, Optimism) où les frais sont quasi nuls, soit utiliser un arbre de Merkle (*Merkle Tree*) pour ancrer une promotion entière de 10 000 étudiants avec une seule transaction racine sur le réseau principal.
