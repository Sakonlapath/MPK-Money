import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
  return context;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  };

  const handleConfirm = () => {
    if (resolvePromise) resolvePromise(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolvePromise) resolvePromise(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {isOpen && options && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100"
            >
              <h3 className="text-xl font-black text-slate-800 mb-2">{options.title}</h3>
              <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                {options.message}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  {options.cancelText || 'ยกเลิก'}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${
                    options.isDestructive 
                      ? 'bg-rose-500 hover:bg-rose-600' 
                      : 'bg-[#1e3a8a] hover:bg-[#172d6e]'
                  }`}
                >
                  {options.confirmText || 'ยืนยัน'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};
