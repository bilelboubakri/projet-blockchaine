import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldAlert, KeyRound, ArrowRight, X, AlertCircle } from 'lucide-react';

export default function SecurityLockModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Passcode admin ou raccourci de démonstration
    if (passcode.trim().toLowerCase() === 'admin' || passcode.trim() === '1234') {
      setError(false);
      onClose();
      navigate('/admin');
    } else {
      setError(true);
    }
  };

  const handleDemoUnlock = () => {
    onClose();
    navigate('/admin');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-box max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Sécurité */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold">Zone Réservée aux Autorités</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            L'émission et la révocation de diplômes sont restreintes au portefeuille officiel de l'université.
          </p>
        </div>

        {/* Corps */}
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong className="font-semibold block mb-0.5">Contrôle d'Accès Smart Contract</strong>
              L'interface d'administration interagit avec la fonction <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-bold">onlyOwner</code> du contrat Solidity. Seul le compte déployeur peut signer les transactions.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Code d'accès académique</span>
                <span className="text-[11px] text-slate-400 font-normal">Démo jury : <code className="font-mono font-bold text-slate-600">admin</code></span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="Entrez le code d'accès..."
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition ${
                    error 
                      ? 'border-red-400 focus:ring-red-200 bg-red-50/30' 
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Code incorrect. Utilisez « admin » pour la soutenance.
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full btn-primary justify-center py-2.5 text-sm"
              >
                Déverrouiller l'Espace Admin
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleDemoUnlock}
                className="w-full text-xs text-slate-500 hover:text-blue-600 py-1 transition text-center underline font-medium"
              >
                Accès direct évaluation jury
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
