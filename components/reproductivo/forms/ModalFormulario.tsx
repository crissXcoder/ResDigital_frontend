'use client';

import { X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';

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
  pendiente?: boolean;
}

export default function ModalFormulario({
  titulo,
  onClose,
  children,
  pendiente = false,
}: ModalFormularioProps) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !pendiente) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm" />
      <Dialog.Content onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }} onCloseAutoFocus={(event) => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus(); }} aria-describedby={undefined} aria-busy={pendiente} onEscapeKeyDown={(event) => { if (pendiente) event.preventDefault(); }} onPointerDownOutside={(event) => { if (pendiente) event.preventDefault(); }} className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[calc(100%-2rem)] max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <Dialog.Title className="text-lg font-bold text-navy">{titulo}</Dialog.Title>
          <button
            type="button"
            onClick={onClose}
            disabled={pendiente}
            aria-label="Cerrar formulario"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <fieldset disabled={pendiente} className="min-w-0 p-6">{children}</fieldset>
      </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
