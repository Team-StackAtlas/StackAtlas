import { X, ShieldCheck, Upload, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: () => void;
}

export default function VerifyModal({ isOpen, onClose, onVerify }: VerifyModalProps) {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setStep(2);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white"
        >
          <X size={20} />
        </button>
        
        <div className="p-6 sm:p-8">
          {step === 1 ? (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <ShieldCheck size={32} />
              </div>
              <h2 className="mb-2 text-center text-xl font-bold text-white">Verify Your Identity</h2>
              <p className="mb-6 text-center text-sm text-zinc-400">
                To ensure the authenticity of reviews and maintain community safety, we require a one-time ID verification.
              </p>
              
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="mb-1 text-sm font-medium text-zinc-200">Upload Government ID</h3>
                  <p className="mb-3 text-xs text-zinc-500">Driver's license, passport, or national ID card.</p>
                  <button 
                    onClick={handleSimulateUpload}
                    disabled={isUploading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 py-4 text-sm font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? (
                      <span className="animate-pulse">Uploading...</span>
                    ) : (
                      <>
                        <Upload size={18} />
                        Select File
                      </>
                    )}
                  </button>
                </div>
                
                <p className="text-center text-xs text-zinc-500">
                  Your data is encrypted and deleted immediately after verification. We do not store your ID.
                </p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">Verification Complete</h2>
              <p className="mb-8 text-sm text-zinc-400">
                Thank you for helping keep StackAtlas safe and authentic.
              </p>
              <button 
                onClick={onVerify}
                className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors"
              >
                Continue to StackAtlas
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
