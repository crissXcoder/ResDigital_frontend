'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Carcasa de modal compartida por los 4 formularios reproductivos. Misma
 * estructura visual que components/modals/*.tsx (overlay, cabecera, cuerpo),
 * pero sin recibir `onSubmit` por props: cada formulario es dueño de su
 * propia mutation (ver forms/ServicioForm.tsx y compañía).
 */
interface ModalFormularioProps {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}

export default function ModalFormulario({
  titulo,
  onClose,
  children,
}: ModalFormularioProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-navy">{titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
