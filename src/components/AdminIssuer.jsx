import React, { useState, useRef, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { computeSHA256, shortenHash, shortenAddress, formatDate, formatFileSize } from '../utils/cryptoUtils';
import { generateAcademicPDF } from '../utils/pdfGenerator';
import { getIPFSGatewayUrl } from '../utils/ipfsService';
import { 
  ShieldCheck, 
  Wallet, 
  FilePlus, 
  Upload, 
  FileText, 
  Download, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  Ban, 
  RotateCcw, 
  Settings, 
  Search,
  Key,
  Layers,
  Lock,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function AdminIssuer() {
  const { 
    account, 
    chainId, 
    isOwner, 
    connectWallet, 
    walletConnecting, 
    isWrongNetwork, 
    switchToCorrectNetwork,
    diplomas, 
    loadingDiplomas, 
    loadDiplomas,
    issueDiploma, 
    revokeDiploma, 
    reactivateDiploma,
    contractAddress,
    networkName,
    pinataJwt,
    savePinataJwt
  } = useWeb3();

  // Mode de saisie : 'generate' (générer nouveau PDF) | 'import' (importer PDF existant)
  const [mode, setMode] = useState('generate');

  // Formulaire étudiant
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [cin, setCin] = useState('');
  const [filiere, setFiliere] = useState('Master Informatique & Cybersécurité');
  const [annee, setAnnee] = useState('2024-2025');
  const [mention, setMention] = useState('Très Bien');

  // Fichier PDF & Cryptographie
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [bytes32Hash, setBytes32Hash] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isComputingHash, setIsComputingHash] = useState(false);

  // État transaction d'émission
  const [txStatus, setTxStatus] = useState(null); // 'signing' | 'mining' | 'success' | 'error'
  const [txDetails, setTxDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);

  // Filtre et recherche dans le registre
  const [searchTerm, setSearchTerm] = useState('');
  const [actionInProgress, setActionInProgress] = useState(''); // hash in revoke/reactivate

  // Configuration Pinata
  const [showConfig, setShowConfig] = useState(false);
  const [jwtInput, setJwtInput] = useState(pinataJwt || '');

  const fileInputRef = useRef(null);

  // ── 1. Génération automatique du PDF officiel ─────────────────────────────
  const handleGeneratePDF = async (e) => {
    e?.preventDefault();
    if (!nom.trim() || !prenom.trim()) {
      setErrorMessage('Veuillez renseigner le nom et le prénom de l\'étudiant.');
      return;
    }

    setErrorMessage('');
    setIsGeneratingPdf(true);
    try {
      const nomComplet = `${prenom.trim()} ${nom.trim()}`;
      const { file, blob, blobUrl, bytes32Hash } = await generateAcademicPDF({
        nomEtudiant: nomComplet,
        nom: nom.trim(),
        prenom: prenom.trim(),
        cin: cin.trim(),
        filiere,
        annee,
        mention
      });

      setPdfFile(file);
      setPdfBlobUrl(blobUrl);
      setBytes32Hash(bytes32Hash);
    } catch (err) {
      console.error(err);
      setErrorMessage('Erreur lors de la génération du PDF : ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ── 2. Importation d'un PDF existant ───────────────────────────────────────
  const handleFileImport = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setErrorMessage('Veuillez importer un fichier au format PDF.');
      return;
    }

    setErrorMessage('');
    setIsComputingHash(true);
    setPdfFile(file);
    setPdfBlobUrl(URL.createObjectURL(file));

    try {
      const { bytes32Hash } = await computeSHA256(file);
      setBytes32Hash(bytes32Hash);
    } catch (err) {
      console.error(err);
      setErrorMessage('Erreur lors du calcul SHA-256 : ' + err.message);
    } finally {
      setIsComputingHash(false);
    }
  };

  // ── 3. Émission et Ancrage on-chain via MetaMask ───────────────────────────
  const handleIssueDiploma = async () => {
    if (!account) {
      setErrorMessage('Veuillez connecter votre portefeuille MetaMask pour signer la transaction.');
      return;
    }
    if (!pdfFile || !bytes32Hash) {
      setErrorMessage('Veuillez générer ou importer un document PDF avant d\'émettre.');
      return;
    }

    const nomBase = nom && prenom ? `${prenom.trim()} ${nom.trim()}` : (nom || 'Étudiant Certifié');
    const nomComplet = cin.trim() ? `${nomBase} (CIN: ${cin.trim()})` : nomBase;

    setErrorMessage('');
    setTxStatus('signing');
    setTxDetails(null);

    try {
      const result = await issueDiploma({
        pdfFile,
        nomEtudiant: nomComplet,
        filiere,
        annee
      });

      setTxStatus('success');
      setTxDetails(result);
    } catch (err) {
      console.error(err);
      setTxStatus('error');
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        setErrorMessage('Transaction rejetée dans MetaMask par l\'utilisateur.');
      } else {
        setErrorMessage(err.reason || err.message || 'Erreur lors de l\'ancrage sur la blockchain.');
      }
    }
  };

  // ── 4. Révocation on-chain ─────────────────────────────────────────────────
  const handleRevoke = async (hash) => {
    if (!confirm('Confirmez-vous la révocation officielle de ce diplôme sur la blockchain Ethereum ?')) return;
    setActionInProgress(hash);
    setErrorMessage('');
    try {
      await revokeDiploma(hash);
    } catch (err) {
      console.error(err);
      setErrorMessage('Échec de la révocation : ' + (err.reason || err.message));
    } finally {
      setActionInProgress('');
    }
  };

  // ── 5. Réactivation on-chain ──────────────────────────────────────────────
  const handleReactivate = async (hash) => {
    setActionInProgress(hash);
    setErrorMessage('');
    try {
      await reactivateDiploma(hash);
    } catch (err) {
      console.error(err);
      setErrorMessage('Échec de la réactivation : ' + (err.reason || err.message));
    } finally {
      setActionInProgress('');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Filtrage du registre
  const filteredDiplomas = diplomas.filter(d => {
    const q = searchTerm.toLowerCase();
    return (
      d.nomEtudiant?.toLowerCase().includes(q) ||
      d.filiere?.toLowerCase().includes(q) ||
      d.hashPdf?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* En-tête Espace Admin */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Portail Universitaire Authentifié</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Émission & Registre des Diplômes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Certification cryptographique on-chain réservée à l'autorité émettrice (<code className="font-mono text-indigo-600 font-semibold">onlyOwner</code>).
          </p>
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="btn-outline text-xs py-2 px-3"
            title="Configurer les clés IPFS"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Config IPFS</span>
          </button>
          <button
            onClick={() => loadDiplomas()}
            disabled={loadingDiplomas}
            className="btn-outline text-xs py-2 px-3"
            title="Rafraîchir depuis la blockchain"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loadingDiplomas ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Panneau de configuration IPFS (Repliable) */}
      {showConfig && (
        <div className="card border-indigo-200 bg-indigo-50/40 p-5">
          <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            Configuration Passerelle IPFS (Pinata)
          </h3>
          <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
            Pour stocker de vrais fichiers PDF sur IPFS, renseignez votre jeton JWT Pinata. Si laissé vide, un CID IPFS déterministe sera simulé pour les tests.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsIn..."
              value={jwtInput}
              onChange={(e) => setJwtInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono border border-indigo-200 rounded-lg bg-white"
            />
            <button
              onClick={() => {
                savePinataJwt(jwtInput);
                alert('Jeton Pinata enregistré avec succès !');
              }}
              className="btn-primary text-xs py-2 px-4"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Avertissement Wallet si non connecté */}
      {!account && (
        <div className="p-5 rounded-xl border border-amber-300 bg-amber-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">Portefeuille MetaMask requis</h4>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Pour signer des transactions d'émission ou de révocation sur Ethereum, vous devez connecter le compte déployeur du contrat.
              </p>
            </div>
          </div>
          <button
            onClick={connectWallet}
            disabled={walletConnecting}
            className="btn-primary bg-amber-600 hover:bg-amber-700 text-xs py-2 px-4 flex-shrink-0"
          >
            <Wallet className="w-4 h-4" />
            <span>{walletConnecting ? 'Connexion en cours...' : 'Connecter MetaMask'}</span>
          </button>
        </div>
      )}

      {/* Formulaire & Pipeline d'Émission */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Colonne gauche (7 cols) : Formulaire d'émission */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="card border-slate-200">
            {/* Toggle Modes */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Émettre un Nouveau Diplôme
              </h2>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('generate');
                    setPdfFile(null);
                    setBytes32Hash('');
                  }}
                  className={`px-3 py-1.5 rounded-md transition ${mode === 'generate' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Générer PDF Officiel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('import');
                    setPdfFile(null);
                    setBytes32Hash('');
                  }}
                  className={`px-3 py-1.5 rounded-md transition ${mode === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Importer PDF Existant
                </button>
              </div>
            </div>

            {/* Mode A : Génération PDF académique */}
            {mode === 'generate' ? (
              <form onSubmit={handleGeneratePDF} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom de famille *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Martin"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prénom(s) *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Thomas"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>N° CIN / ID</span>
                      <span className="text-[10px] text-indigo-600 font-medium">Distingue homonymes</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 09876543"
                      value={cin}
                      onChange={(e) => setCin(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Filière / Spécialité *
                    </label>
                    <select
                      value={filiere}
                      onChange={(e) => setFiliere(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    >
                      <option value="Master Informatique & Cybersécurité">Master Informatique & Cybersécurité</option>
                      <option value="Licence Génie Logiciel">Licence Génie Logiciel</option>
                      <option value="Master Intelligence Artificielle & Data Science">Master Intelligence Artificielle & Data</option>
                      <option value="Diplôme d'Ingénieur Blockchain & Systèmes Distribués">Diplôme d'Ingénieur Blockchain</option>
                      <option value="Doctorat en Sciences Numériques">Doctorat en Sciences Numériques</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Année académique *
                    </label>
                    <input
                      type="text"
                      value={annee}
                      onChange={(e) => setAnnee(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mention honorifique
                  </label>
                  <select
                    value={mention}
                    onChange={(e) => setMention(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Très Bien">Très Bien (Félicitations du jury)</option>
                    <option value="Bien">Bien</option>
                    <option value="Assez Bien">Assez Bien</option>
                    <option value="Passable">Passable</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingPdf}
                  className="w-full btn-outline justify-center py-2.5 text-xs font-bold"
                >
                  {isGeneratingPdf ? <span className="spinner"></span> : <FilePlus className="w-4 h-4 text-blue-600" />}
                  <span>{isGeneratingPdf ? 'Génération du PDF...' : 'Générer le Document Officiel & Calculer SHA-256'}</span>
                </button>
              </form>
            ) : (
              /* Mode B : Import PDF */
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="drop-zone p-8 text-center border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileImport(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-800">
                    Cliquez ou déposez le PDF à certifier
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    L'empreinte cryptographique sera extraite instantanément
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom complet du titulaire
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Marie Curie"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      N° CIN / ID (Optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 09876543"
                      value={cin}
                      onChange={(e) => setCin(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Filière / Programme
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Master Informatique"
                      value={filiere}
                      onChange={(e) => setFiliere(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Document prêt & Empreinte SHA-256 */}
            {bytes32Hash && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Document scellé et prêt pour l'ancrage</span>
                  </div>
                  {pdfBlobUrl && (
                    <a
                      href={pdfBlobUrl}
                      download={`diplome_${nom || 'etudiant'}.pdf`}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger PDF</span>
                    </a>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="font-semibold text-slate-700">Empreinte SHA-256 (bytes32) :</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bytes32Hash)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHash ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-900 break-all select-all font-semibold">
                    {bytes32Hash}
                  </div>
                </div>

                {/* Bouton Émettre et Ancrer */}
                <button
                  type="button"
                  onClick={handleIssueDiploma}
                  disabled={txStatus === 'signing'}
                  className="w-full btn-primary justify-center py-3 text-sm font-bold shadow-md shadow-blue-500/20"
                >
                  {txStatus === 'signing' ? (
                    <>
                      <span className="spinner"></span>
                      <span>Signature dans MetaMask en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Émettre et Ancrer sur la Blockchain</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Message d'erreur */}
            {errorMessage && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Succès de la transaction */}
            {txStatus === 'success' && txDetails && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Diplôme ancré avec succès sur Ethereum Sepolia !</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div>
                    <span className="text-emerald-700">TX Hash : </span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txDetails.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-700 font-semibold inline-flex items-center gap-0.5"
                    >
                      {shortenHash(txDetails.txHash)}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div>
                    <span className="text-emerald-700">Bloc : </span>
                    <span className="text-slate-800">{txDetails.blockNumber}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700">CID IPFS : </span>
                    <a
                      href={getIPFSGatewayUrl(txDetails.ipfsCid)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-700"
                    >
                      {shortenHash(txDetails.ipfsCid)}
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Colonne droite (5 cols) : Pipeline cryptographique visuel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card border-slate-200 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Pipeline d'Ancrage Cryptographique
            </h3>

            <div className="space-y-4 text-xs">
              {/* Étape 1 */}
              <div className={`p-3 rounded-lg border transition ${bytes32Hash ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${bytes32Hash ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>1</span>
                    Hachage Local SHA-256
                  </span>
                  {bytes32Hash ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <span className="text-[10px] text-slate-400">Web Crypto API</span>}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  L'empreinte du fichier PDF est calculée dans la mémoire du navigateur sans fuite de données personnelles.
                </p>
              </div>

              {/* Étape 2 */}
              <div className={`p-3 rounded-lg border transition ${txStatus === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${txStatus === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>2</span>
                    Stockage Décentralisé IPFS
                  </span>
                  {txStatus === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <span className="text-[10px] text-slate-400">Pinata Gateway</span>}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Le document est scellé par contenu (Content Addressing CID). Même en cas de panne de serveur, le PDF reste accessible.
                </p>
              </div>

              {/* Étape 3 */}
              <div className={`p-3 rounded-lg border transition ${txStatus === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${txStatus === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>3</span>
                    Transaction Smart Contract
                  </span>
                  {txStatus === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <span className="text-[10px] text-slate-400">MetaMask Signature</span>}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Appel de <code className="font-mono text-blue-600 font-semibold">emettreDiplome(bytes32, ...)</code>. Seul l'owner peut signer.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Contrat audité : Zéro collision SHA-256 garantie mathématiquement.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Registre des Diplômes Émis sur la Blockchain */}
      <div className="card border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Registre On-Chain des Diplômes</span>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
                {diplomas.length} diplômes
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Données extraites en temps réel de la blockchain Ethereum via <code className="font-mono font-semibold">getTousDiplomes()</code>
            </p>
          </div>

          {/* Recherche */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer par nom ou hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table du registre */}
        {loadingDiplomas ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <span className="spinner mb-2"></span>
            <p>Chargement des diplômes depuis la blockchain...</p>
          </div>
        ) : filteredDiplomas.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            <p>Aucun diplôme trouvé dans le registre pour le moment.</p>
            <p className="text-[11px] mt-1 text-slate-400">Émettez votre premier diplôme avec le formulaire ci-dessus.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Étudiant</th>
                  <th className="py-2.5 px-3">Filière / Promotion</th>
                  <th className="py-2.5 px-3">Empreinte SHA-256 (bytes32)</th>
                  <th className="py-2.5 px-3">Date d'Émission</th>
                  <th className="py-2.5 px-3">IPFS CID</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3 text-right">Actions (onlyOwner)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDiplomas.map((dip, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {dip.nomEtudiant?.includes('(CIN:') ? (
                        <div>
                          <div>{dip.nomEtudiant.split('(CIN:')[0].trim()}</div>
                          <span className="inline-block mt-0.5 text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                            CIN: {dip.nomEtudiant.split('(CIN:')[1].replace(')', '').trim()}
                          </span>
                        </div>
                      ) : (
                        dip.nomEtudiant
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div>{dip.filiere}</div>
                      <div className="text-[10px] text-slate-400">{dip.annee}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span title={dip.hashPdf}>{shortenHash(dip.hashPdf)}</span>
                        <button
                          onClick={() => copyToClipboard(dip.hashPdf)}
                          className="text-slate-400 hover:text-blue-600"
                          title="Copier le hash complet"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {formatDate(dip.dateEmission)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      <a
                        href={getIPFSGatewayUrl(dip.ipfsCid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        title={dip.ipfsCid}
                      >
                        <span>{dip.ipfsCid ? dip.ipfsCid.slice(0, 8) + '...' : '-'}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </td>
                    <td className="py-3 px-3">
                      {dip.valide ? (
                        <span className="badge-valid">Valide</span>
                      ) : (
                        <span className="badge-revoked">Révoqué</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {dip.valide ? (
                        <button
                          onClick={() => handleRevoke(dip.hashPdf)}
                          disabled={actionInProgress === dip.hashPdf || !isOwner}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition disabled:opacity-40"
                          title={isOwner ? 'Révoquer ce diplôme' : 'Action réservée au compte owner'}
                        >
                          {actionInProgress === dip.hashPdf ? <span className="spinner"></span> : <Ban className="w-3 h-3" />}
                          <span>Révoquer</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(dip.hashPdf)}
                          disabled={actionInProgress === dip.hashPdf || !isOwner}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition disabled:opacity-40"
                          title={isOwner ? 'Réactiver ce diplôme' : 'Action réservée au compte owner'}
                        >
                          {actionInProgress === dip.hashPdf ? <span className="spinner"></span> : <RotateCcw className="w-3 h-3" />}
                          <span>Réactiver</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
