import { ShieldCheck, Upload, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Modal } from './ui/Modal';

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: () => void;
}

export default function VerifyModal({ isOpen, onClose, onVerify }: VerifyModalProps) {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setStep(2);
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Verify your identity">
      <div className="p-6 sm:p-8">
        {step === 1 ? (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <ShieldCheck size={32} />
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-slate-900 dark:text-white">
              Verify Your Identity
            </h2>
            <p className="mb-6 text-center text-sm text-slate-500 dark:text-zinc-400">
              To ensure the authenticity of reviews and maintain community safety, we require a
              one-time ID verification.
            </p>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h3 className="mb-1 text-sm font-medium text-slate-800 dark:text-zinc-200">
                  Upload Government ID
                </h3>
                <p className="mb-3 text-xs text-slate-500 dark:text-zinc-500">
                  Driver's license, passport, or national ID card.
                </p>
                <button
                  onClick={handleSimulateUpload}
                  disabled={isUploading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-4 text-sm font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
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

              <p className="text-center text-xs text-slate-500 dark:text-zinc-500">
                Your data is encrypted and deleted immediately after verification. We do not store
                your ID.
              </p>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
              Verification Complete
            </h2>
            <p className="mb-8 text-sm text-slate-500 dark:text-zinc-400">
              Thank you for helping keep StackAtlas safe and authentic.
            </p>
            <button
              onClick={onVerify}
              className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 dark:text-zinc-950 dark:hover:bg-emerald-400"
            >
              Continue to StackAtlas
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
