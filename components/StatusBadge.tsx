import React from 'react';

export type StatusType = 
  | 'Apto' 
  | 'Retiro Leche' 
  | 'Retiro Carne' 
  | 'En Revision' 
  | 'BLOQUEADO' 
  | 'Gestante Confirmada' 
  | 'Preñada'
  | 'Servida'
  | 'En Secado'
  | 'Vacía' 
  | 'Sin Diagnóstico'
  | 'Baja / Salida'
  | 'Activo'
  | 'Inactivo'
  | 'Fallecimiento'
  | 'Venta Comercial'
  | 'Descarte'
  | 'Traslado'
  | 'N/A';

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
  "Preñada": `bg-info-bg text-info border border-info/30`,
  "Servida": `bg-blue-50 text-blue-700 border border-blue-200`,
  "En Secado": `bg-purple-50 text-purple-700 border border-purple-200`,
  "Vacía": `bg-warning-bg text-warning border border-warning/30`,
  "Sin Diagnóstico": `bg-slate-100 text-slate-500 border border-slate-200`,
  "Baja / Salida": `bg-slate-100 text-slate-500 border border-slate-300`,
  "Inactivo": `bg-slate-100 text-slate-500 border border-slate-300`,
  "Fallecimiento": `bg-slate-100 text-slate-500 border border-slate-300`,
  "Venta Comercial": `bg-slate-100 text-slate-500 border border-slate-300`,
  "Descarte": `bg-slate-100 text-slate-500 border border-slate-300`,
  "Traslado": `bg-slate-100 text-slate-500 border border-slate-300`,
  "N/A": `bg-slate-50 text-slate-400 border border-slate-200`,
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variantClasses = variants[status] || variants["Baja / Salida"];
  return (
    <span className={`${variantClasses} px-2 py-1 text-xs rounded-full uppercase tracking-wide font-medium`}>
      {status}
    </span>
  );
}
