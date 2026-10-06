import React from 'react';

export type StatusType = 
  | 'Apto' 
  | 'Retiro Leche' 
  | 'Retiro Carne' 
  | 'En Revision' 
  | 'BLOQUEADO' 
  | 'Gestante Confirmada' 
  | 'Vacía' 
  | 'Baja / Salida'
  | 'Activo'
  | 'Inactivo';

interface StatusBadgeProps {
  status: StatusType | string;
}

const variants: Record<string, string> = {
  "Apto": `bg-success-bg text-success border border-success/30`,
  "Activo": `bg-success-bg text-success border border-success/30`,
  "Retiro Leche": `bg-danger-bg text-danger border border-danger/30`,
  "Retiro Carne": `bg-danger-bg text-danger border border-danger/30`,
  "En Revision": `bg-warning-bg text-warning border border-warning/30`,
  "BLOQUEADO": `bg-danger text-white`,
  "Gestante Confirmada": `bg-info-bg text-info border border-info/30`,
  "Vacía": `bg-warning-bg text-warning border border-warning/30`,
  "Baja / Salida": `bg-slate-100 text-slate-500 border border-slate-300`,
  "Inactivo": `bg-slate-100 text-slate-500 border border-slate-300`,
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variantClasses = variants[status] || variants["Baja / Salida"];
  return (
    <span className={`${variantClasses} px-2 py-1 text-xs rounded-full uppercase tracking-wide font-medium`}>
      {status}
    </span>
  );
}
