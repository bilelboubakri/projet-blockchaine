import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { shortenAddress } from '../utils/cryptoUtils';
import SolidityModal from './SolidityModal';
import SecurityLockModal from './SecurityLockModal';
import { 
  ShieldCheck, 
  Code, 
  Wallet, 
  Lock, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  LogOut,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  
  const { 
    account, 
    chainId, 
    isOwner, 
    connectWallet, 
    disconnectWallet, 
    walletConnecting, 
    isWrongNetwork, 
    switchToCorrectNetwork,
    contractAddress,
    networkName
  } = useWeb3();

  const [solidityModalOpen, setSolidityModalOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Identité CertiChain */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold tracking-tight text-slate-900 font-sans">
                    Certi<span className="text-blue-600">Chain</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                    v2.0 Web3
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Certification & Vérification Académique Décentralisée
                </p>
              </div>
            </Link>

            {/* Séparateur */}
            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            {/* Badge Réseau & Contrat */}
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Ethereum {networkName.charAt(0).toUpperCase() + networkName.slice(1)}
              </span>
              {contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000' && (
                <a
                  href={`https://sepolia.etherscan.io/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-blue-600 transition"
                  title="Voir sur Etherscan"
                >
                  <span>{shortenAddress(contractAddress)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Actions & Navigation droite */}
          <div className="flex items-center gap-3">
            {/* Bouton Contrat Solidity */}
            <button
              onClick={() => setSolidityModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition border border-slate-200"
            >
              <Code className="w-3.5 h-3.5 text-blue-600" />
              <span>Contrat Solidity</span>
            </button>

            {/* Navigation selon la route */}
            {!isAdmin ? (
              // Sur la page PUBLIQUE : Bouton "Espace Université (Admin)" verrouillé
              <button
                onClick={() => setSecurityModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Espace Université (Admin)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              // Sur la page ADMIN : Retour au portail public + Statut MetaMask
              <div className="flex items-center gap-2.5">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Portail Public</span>
                  <span className="sm:hidden">Public</span>
                </Link>

                {/* État Wallet MetaMask */}
                {account ? (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 pr-2">
                    {isWrongNetwork ? (
                      <button
                        onClick={switchToCorrectNetwork}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Changer vers Sepolia</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-mono text-slate-800 font-semibold">{shortenAddress(account)}</span>
                        {isOwner ? (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Owner
                          </span>
                        ) : (
                          <span className="bg-slate-200 text-slate-600 text-[10px] font-medium px-1.5 py-0.5 rounded">
                            Non-Owner
                          </span>
                        )}
                      </div>
                    )}
                    <button
                      onClick={disconnectWallet}
                      title="Déconnecter"
                      className="p-1 text-slate-400 hover:text-red-600 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={connectWallet}
                    disabled={walletConnecting}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>{walletConnecting ? 'Connexion...' : 'Connecter MetaMask'}</span>
                  </button>
                )}
              </div>
            )}

          </div>

        </div>
      </header>

      {/* Modals */}
      <SolidityModal 
        isOpen={solidityModalOpen} 
        onClose={() => setSolidityModalOpen(false)} 
      />
      <SecurityLockModal 
        isOpen={securityModalOpen} 
        onClose={() => setSecurityModalOpen(false)} 
      />
    </>
  );
}
