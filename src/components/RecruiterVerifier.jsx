import React, { useState, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { computeSHA256, shortenHash, formatDate, formatFileSize } from '../utils/cryptoUtils';
import { getIPFSGatewayUrl } from '../utils/ipfsService';
import confetti from 'canvas-confetti';
import { 
  FileCheck2, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  FileText,
  Lock,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';

export default function RecruiterVerifier() {
  const { verifyDiploma, contractAddress, networkName } = useWeb3();

  // État du fichier & vérification
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [manualHash, setManualHash] = useState('');
  const [isComputingHash, setIsComputingHash] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  // ── Traitement d'un fichier sélectionné ou glissé ─────────────────────────
  const handleFileSelected = async (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setErrorMsg('Veuillez déposer un document au format PDF (.pdf).');
      return;
    }

    setErrorMsg('');
    setVerificationResult(null);
    setFile(selectedFile);
    setIsComputingHash(true);

    try {
      // 1. Calcul SHA-256 local 100% côté client (Web Crypto API)
      const { bytes32Hash } = await computeSHA256(selectedFile);
      setFileHash(bytes32Hash);
      setIsComputingHash(false);

      // 2. Interrogation directe du Smart Contract via RPC public
      await executeVerification(bytes32Hash);
    } catch (err) {
      console.error(err);
      setIsComputingHash(false);
      setErrorMsg('Erreur lors du calcul de l\'empreinte ou de la vérification : ' + err.message);
    }
  };

  // ── Appel de vérification smart contract ───────────────────────────────────
  const executeVerification = async (targetHash) => {
    if (!targetHash || !targetHash.startsWith('0x') || targetHash.length !== 66) {
      setErrorMsg('Format d\'empreinte invalide. Le hash SHA-256 doit comporter 66 caractères (0x + 64 hexadécimaux).');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');
    try {
      const result = await verifyDiploma(targetHash);
      setVerificationResult(result);

      if (result.existe && result.valide) {
        // Déclencher les confettis
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {}
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Erreur lors de la vérification on-chain.');
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Drag & Drop Handlers ──────────────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // ── Copier le hash ────────────────────────────────────────────────────────
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // ── Réinitialiser ─────────────────────────────────────────────────────────
  const handleReset = () => {
    setFile(null);
    setFileHash('');
    setManualHash('');
    setVerificationResult(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Exemples de test rapide pour la soutenance ─────────────────────────────
  const loadExample = (hash) => {
    setFile(null);
    setFileHash(hash);
    setManualHash(hash);
    executeVerification(hash);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* En-tête de la page */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Portail Public Recruteurs & Vérificateurs</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
          Vérification d'Authenticité de Diplôme
        </h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Déposez le fichier PDF du diplôme pour vérifier instantanément son ancrage immuable sur la blockchain Ethereum. 
          Aucune inscription ni extension requise.
        </p>
      </div>

      {/* Zone de vérification principale */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Colonne gauche (7 cols) : Zone de dépôt et statut */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card Dépôt PDF */}
          <div className="card border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>1. Déposez le diplôme original</span>
              <span className="text-xs font-normal text-slate-500 font-mono">Format PDF</span>
            </h2>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`drop-zone p-8 text-center border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50/60 scale-[1.01]' 
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />

              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>

              <p className="text-sm font-semibold text-slate-800">
                Glissez-déposez le fichier PDF ici
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ou <span className="text-blue-600 underline font-medium">parcourez vos fichiers</span>
              </p>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Calcul SHA-256 local — le document ne quitte jamais votre navigateur</span>
              </div>
            </div>

            {/* Fichier en cours / Empreinte calculée */}
            {file && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-xs">{file.name}</span>
                    <span className="text-[11px] text-slate-500">({formatFileSize(file.size)})</span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Changer
                  </button>
                </div>

                {isComputingHash ? (
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-medium py-1">
                    <span className="spinner"></span>
                    <span>Calcul de l'empreinte cryptographique SHA-256...</span>
                  </div>
                ) : fileHash ? (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span className="font-medium">Empreinte SHA-256 (bytes32) :</span>
                      <button
                        onClick={() => copyToClipboard(fileHash)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedHash ? 'Copié' : 'Copier'}
                      </button>
                    </div>
                    <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-800 break-all select-all">
                      {fileHash}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Alternative : Recherche manuelle par empreinte SHA-256 */}
          <div className="card border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Alternative : Recherche directe par Hash (bytes32)</span>
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0xbf346...48831 (66 caractères)"
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value.trim())}
                className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-slate-800"
              />
              <button
                onClick={() => {
                  setFile(null);
                  setFileHash(manualHash);
                  executeVerification(manualHash);
                }}
                disabled={!manualHash || isVerifying}
                className="btn-primary text-xs py-2 px-3 disabled:opacity-50"
              >
                {isVerifying ? <span className="spinner"></span> : <Search className="w-3.5 h-3.5" />}
                <span>Vérifier</span>
              </button>
            </div>
          </div>

          {/* Erreur éventuelle */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

        </div>

        {/* Colonne droite (5 cols) : Résultat de vérification on-chain */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="card border-slate-200 bg-white">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>2. Verdict Smart Contract</span>
              {isVerifying && (
                <span className="flex items-center gap-1 text-xs text-blue-600 font-normal">
                  <span className="spinner"></span>
                  Interrogation du contrat...
                </span>
              )}
            </h2>

            {/* État 1 : En attente d'un fichier */}
            {!verificationResult && !isVerifying && !fileHash && (
              <div className="text-center py-12 px-4 text-slate-400">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-slate-600">Aucun document en cours d'analyse</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Déposez un diplôme PDF à gauche pour interroger en temps réel le registre sur Ethereum Sepolia.
                </p>
              </div>
            )}

            {/* État 2 : En cours de vérification */}
            {isVerifying && (
              <div className="text-center py-12 px-4 text-slate-600">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
                <p className="text-xs font-semibold text-slate-800">Lecture on-chain en cours</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Exécution de <code className="font-mono font-bold text-blue-600">verifierDiplome(bytes32)</code> via RPC Ethereum
                </p>
              </div>
            )}

            {/* État 3 : RÉSULTAT OBTENU */}
            {verificationResult && !isVerifying && (
              <div className="space-y-4">
                
                {/* 3.A : DIPLÔME AUTHENTIQUE & VALIDE */}
                {verificationResult.existe && verificationResult.valide && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="badge-valid">Authentique & Valide</span>
                          <span className="text-[10px] text-emerald-800 font-mono font-semibold">
                            Certifié on-chain
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1 font-sans">
                          {verificationResult.nomEtudiant?.includes('(CIN:') 
                            ? verificationResult.nomEtudiant.split('(CIN:')[0].trim() 
                            : verificationResult.nomEtudiant}
                        </h3>
                        <p className="text-xs text-slate-600 font-medium">
                          {verificationResult.filiere}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-emerald-200/80 space-y-2 text-xs">
                      {verificationResult.nomEtudiant?.includes('(CIN:') && (
                        <div className="flex justify-between py-1 border-b border-emerald-100">
                          <span className="text-slate-500">N° CIN / Identifiant :</span>
                          <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            {verificationResult.nomEtudiant.split('(CIN:')[1].replace(')', '').trim()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 border-b border-emerald-100">
                        <span className="text-slate-500">Année académique :</span>
                        <span className="font-semibold text-slate-800">{verificationResult.annee || 'Non renseignée'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-emerald-100">
                        <span className="text-slate-500">Date d'ancrage blockchain :</span>
                        <span className="font-semibold text-slate-800">{formatDate(verificationResult.dateEmission)}</span>
                      </div>
                      {verificationResult.ipfsCid && (
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">Document IPFS :</span>
                          <a
                            href={getIPFSGatewayUrl(verificationResult.ipfsCid)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            <span>Voir le PDF scellé</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3.B : DIPLÔME RÉVOQUÉ */}
                {verificationResult.existe && !verificationResult.valide && (
                  <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="badge-revoked">Diplôme Révoqué</span>
                          <span className="text-[10px] text-red-800 font-mono font-semibold">
                            Invalidé par l'université
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1 font-sans">
                          {verificationResult.nomEtudiant}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {verificationResult.filiere} ({verificationResult.annee})
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-red-100/60 border border-red-200 text-xs text-red-900 leading-relaxed">
                      <strong>Avertissement :</strong> Ce document a été officiellement révoqué dans le smart contract de l'établissement. Il n'a plus aucune valeur légale.
                    </div>
                  </div>
                )}

                {/* 3.C : HASH NON RECONNU (FAUX OU MODIFIÉ) */}
                {!verificationResult.existe && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Non Certifié / Falsifié
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">
                          Empreinte Introuvable dans le Registre
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          Le document soumis ne correspond à aucun diplôme authentifié par l'université sur la blockchain.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-amber-100/60 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <p className="font-semibold">Causes possibles :</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        <li>Le fichier a subi une modification (même un seul octet ou caractère).</li>
                        <li>Le diplôme n'a pas encore été émis par l'administration universitaire.</li>
                        <li>Il s'agit d'un faux document ou d'une tentative d'usurpation.</li>
                      </ul>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Note pédagogique cryptographie */}
            <div className="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong>Garantie Cryptographique :</strong> La fonction de hachage SHA-256 produit une empreinte unique de 256 bits (bytes32). Si un faussaire modifie ne serait-ce qu'une virgule ou un pixel, le hash change entièrement (effet avalanche).
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
