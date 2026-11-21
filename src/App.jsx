import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import Navbar from './components/Navbar';
import RecruiterVerifier from './components/RecruiterVerifier';
import AdminIssuer from './components/AdminIssuer';
import { Shield, ExternalLink, Cpu } from 'lucide-react';

export default function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
          
          {/* Barre de navigation globale */}
          <Navbar />

          {/* Contenu principal selon la route */}
          <main className="flex-1">
            <Routes>
              {/* Route Publique : Vérificateur Recruteurs */}
              <Route path="/" element={<RecruiterVerifier />} />

              {/* Route Privée Université : Émetteur & Registre Admin */}
              <Route path="/admin" element={<AdminIssuer />} />

              {/* Redirection fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Pied de page institutionnel */}
          <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                  C
                </div>
                <span>
                  <strong>CertiChain</strong> — Architecture Décentralisée d'Authentification Académique
                </span>
              </div>

              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1 text-slate-600">
                  <Cpu className="w-3.5 h-3.5 text-blue-500" />
                  Solidity ^0.8.20 • Ethereum Sepolia • IPFS Pinata
                </span>
                <span>•</span>
                <span className="text-emerald-700 font-medium">
                  Prêt pour Soutenance Jury
                </span>
              </div>
            </div>
          </footer>

        </div>
      </BrowserRouter>
    </Web3Provider>
  );
}
