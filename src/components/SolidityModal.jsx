import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck, Code, Layers } from 'lucide-react';

const SOLIDITY_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DiplomaRegistry
 * @notice Registre décentralisé et infalsifiable de diplômes universitaires
 * @dev Déployé sur Ethereum Sepolia Testnet
 */
contract DiplomaRegistry {

    struct Diplome {
        bytes32 hashPdf;      // Empreinte SHA-256 du fichier PDF
        string  nomEtudiant;  // Nom complet de l'étudiant
        string  filiere;      // Intitulé du cursus / diplôme
        string  annee;        // Année académique (ex: "2024-2025")
        uint256 dateEmission; // Timestamp Unix immuable
        string  ipfsCid;      // CID IPFS du document scellé
        bool    valide;       // Statut légal (true = valide, false = révoqué)
        bool    existe;       // Sentinelle d'existence
    }

    address public owner;
    string public nomEtablissement;
    mapping(bytes32 => Diplome) public diplomes;
    bytes32[] public tousLesHashes;

    event DiplomeEmis(bytes32 indexed hashPdf, string nomEtudiant, string filiere, string ipfsCid, uint256 dateEmission);
    event DiplomeRevoque(bytes32 indexed hashPdf, uint256 dateRevocation);
    event DiplomeReactive(bytes32 indexed hashPdf, uint256 dateReactivation);

    modifier onlyOwner() {
        require(msg.sender == owner, "DiplomaRegistry: Reserve a l'universite (owner)");
        _;
    }

    constructor(string memory _nomEtablissement) {
        owner = msg.sender;
        nomEtablissement = _nomEtablissement;
    }

    function emettreDiplome(
        bytes32 _hashPdf,
        string memory _nomEtudiant,
        string memory _filiere,
        string memory _annee,
        string memory _ipfsCid
    ) external onlyOwner {
        require(_hashPdf != bytes32(0), "Hash invalide");
        require(!diplomes[_hashPdf].existe, "Diplome deja certifie");

        diplomes[_hashPdf] = Diplome({
            hashPdf: _hashPdf,
            nomEtudiant: _nomEtudiant,
            filiere: _filiere,
            annee: _annee,
            dateEmission: block.timestamp,
            ipfsCid: _ipfsCid,
            valide: true,
            existe: true
        });

        tousLesHashes.push(_hashPdf);
        emit DiplomeEmis(_hashPdf, _nomEtudiant, _filiere, _ipfsCid, block.timestamp);
    }

    function revoquerDiplome(bytes32 _hashPdf) external onlyOwner {
        require(diplomes[_hashPdf].existe, "Diplome introuvable");
        require(diplomes[_hashPdf].valide, "Deja revoque");
        diplomes[_hashPdf].valide = false;
        emit DiplomeRevoque(_hashPdf, block.timestamp);
    }

    function reactiverDiplome(bytes32 _hashPdf) external onlyOwner {
        require(diplomes[_hashPdf].existe, "Diplome introuvable");
        require(!diplomes[_hashPdf].valide, "Deja valide");
        diplomes[_hashPdf].valide = true;
        emit DiplomeReactive(_hashPdf, block.timestamp);
    }

    function verifierDiplome(bytes32 _hashPdf) external view returns (
        bool existe, string memory nomEtudiant, string memory filiere,
        string memory annee, uint256 dateEmission, string memory ipfsCid, bool valide
    ) {
        Diplome memory d = diplomes[_hashPdf];
        return (d.existe, d.nomEtudiant, d.filiere, d.annee, d.dateEmission, d.ipfsCid, d.valide);
    }

    function getTousDiplomes() external view returns (Diplome[] memory) {
        uint256 total = tousLesHashes.length;
        Diplome[] memory liste = new Diplome[](total);
        for (uint256 i = 0; i < total; i++) {
            liste[i] = diplomes[tousLesHashes[i]];
        }
        return liste;
    }
}`;

export default function SolidityModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('code'); // 'code' | 'architecture'

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SOLIDITY_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-box max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-sm shadow-sm">
              SOL
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Smart Contract Solidity
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono font-semibold">
                  ^0.8.20
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                DiplomaRegistry.sol — Déployable sur Ethereum Sepolia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-medium mr-2">
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'code' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Code Source
              </button>
              <button
                onClick={() => setActiveTab('architecture')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'architecture' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Architecture & Clés
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
              title="Copier le code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              {copied ? 'Copié !' : 'Copier'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-800 text-sm">
          {activeTab === 'code' ? (
            <div className="relative">
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-xs font-mono leading-relaxed border border-slate-800">
                <code>{SOLIDITY_CODE}</code>
              </pre>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Contrôle d'Accès (onlyOwner)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Seule l'adresse universitaire qui a déployé le contrat peut invoquer <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">emettreDiplome</code> et <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">revoquerDiplome</code>. Un tiers rejettera la transaction avec un message explicite.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Vérification Gratuite (view)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    La fonction <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">verifierDiplome(bytes32)</code> est déclarée <span className="font-semibold text-emerald-700">view</span>. Les recruteurs la consultent via RPC public <strong>sans payer de gas et sans portefeuille MetaMask</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <h4 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wider text-slate-500">
                  Structure des données on-chain
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2">Champ</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      <tr>
                        <td className="py-2 text-blue-600 font-bold">hashPdf</td>
                        <td className="py-2 text-slate-600">bytes32</td>
                        <td className="py-2 text-slate-700 font-sans">Empreinte SHA-256 (32 octets) du fichier PDF original</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-blue-600 font-bold">nomEtudiant</td>
                        <td className="py-2 text-slate-600">string</td>
                        <td className="py-2 text-slate-700 font-sans">Nom et prénom complet du diplômé</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-blue-600 font-bold">filiere</td>
                        <td className="py-2 text-slate-600">string</td>
                        <td className="py-2 text-slate-700 font-sans">Intitulé du cursus académique</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-blue-600 font-bold">dateEmission</td>
                        <td className="py-2 text-slate-600">uint256</td>
                        <td className="py-2 text-slate-700 font-sans">Horodatage de validation (block.timestamp immuable)</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-blue-600 font-bold">ipfsCid</td>
                        <td className="py-2 text-slate-600">string</td>
                        <td className="py-2 text-slate-700 font-sans">Identifiant de contenu IPFS pour le stockage décentralisé</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-blue-600 font-bold">valide</td>
                        <td className="py-2 text-slate-600">bool</td>
                        <td className="py-2 text-slate-700 font-sans">Statut légal (false = révoqué en cas de litige ou d'erreur)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500 rounded-b-2xl">
          <span>Standard ERC/Custom Registry • Pragma 0.8.20</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
