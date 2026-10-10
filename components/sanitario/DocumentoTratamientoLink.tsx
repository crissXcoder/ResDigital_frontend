'use client';

import { useEffect, useState } from 'react';
import { esUrlHeredada, urlFirmadaDocumento } from '@/lib/sanitario/documento';

interface Props {
  documento: string;
  className?: string;
  children: React.ReactNode;
}

/** Abre la receta con un enlace firmado de 10 minutos; las URLs heredadas se abren tal cual. */
export function DocumentoTratamientoLink({ documento, className, children }: Props) {
  const heredada = esUrlHeredada(documento);
  const [firmada, setFirmada] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    if (heredada) return;
    let activo = true;
    urlFirmadaDocumento(documento)
      .then((url) => { if (activo) setFirmada(url); })
      .catch(() => { if (activo) setFallo(true); });
    return () => { activo = false; };
  }, [documento, heredada]);

  const href = heredada ? documento : firmada;
  if (fallo) return <span className="text-xs text-slate-500">No se pudo cargar el documento.</span>;
  if (!href) return <span className="text-xs text-slate-500">Preparando documento…</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
