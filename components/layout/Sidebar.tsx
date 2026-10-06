'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  FileText, 
  ClipboardList, 
  Map, 
  QrCode, 
  User,
  Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAnimales } from '@/lib/api/animales';
import { useAuthUser } from '@/lib/hooks/useAuthUser';

type NavItem = {
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
} & (
  | { href: string; disabled?: false }
  | { href?: undefined; disabled: true; badge: string; reason: string }
);

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuthUser();

  const { data: animales, isLoading } = useQuery({
    queryKey: ['animales'],
    queryFn: () => getAnimales(),
  });

  const resesActivas = animales ? animales.filter(a => a.activo).length : 0;

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Hato Ganadero', href: '/hato', icon: Users },
    { name: 'Reproducción', href: '/reproductivo', icon: Clock },
    {
      name: 'Producción Lechera',
      disabled: true,
      badge: 'Próximamente',
      reason: 'Módulo de pesaje y control lechero en desarrollo',
      icon: FileText,
    },
    {
      name: 'Reportes',
      disabled: true,
      badge: 'Próximamente',
      reason: 'Módulo de exportaciones oficiales en desarrollo',
      icon: ClipboardList,
    },
    { name: 'Módulo de Potreros', href: '/potreros', icon: Map },
    { name: 'Escáner QR / Arete', href: '/qr', icon: QrCode },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-navy text-slate-300 flex flex-col
        transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-700/50">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-500 flex items-center justify-center">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">ResDigital</h2>
            <p className="text-xs text-slate-400">Gestión Ganadera</p>
          </div>
        </div>

        {/* Finca Info */}
        <div className="px-6 py-5 border-b border-slate-700/50">
          <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">FINCA ACTIVA</p>
          <p className="text-sm font-semibold text-white">
            {user?.nombreFinca || <span className="italic text-slate-400">Sin finca asignada</span>}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {isLoading ? (
              <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
            ) : null}
            <p className="text-xs text-slate-400">
              {isLoading ? 'Cargando...' : `${resesActivas} reses activas`}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <li key={item.name}>
                    <div
                      aria-disabled="true"
                      title={item.reason}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-slate-500 cursor-not-allowed select-none"
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className="text-slate-500" />
                        <span>{item.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold tracking-wide bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        {item.badge}
                      </span>
                    </div>
                  </li>
                );
              }

              const isActive = pathname.startsWith(item.href);

              return (
                <li key={item.name}>
                  <Link 
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative
                      ${isActive 
                        ? 'bg-navy-light text-white font-medium' 
                        : 'hover:bg-navy-light hover:text-white'
                      }
                    `}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
                    {item.name}
                    
                    {/* Active dot indicator */}
                    {isActive && (
                      <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-400 text-center font-medium">
            ResDigital Ganadero · Piloto
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-slate-400">
            <Link
              href="/terminos"
              onClick={onClose}
              className="hover:text-white transition-colors underline-offset-2 hover:underline"
            >
              Términos
            </Link>
            <span>·</span>
            <Link
              href="/privacidad"
              onClick={onClose}
              className="hover:text-white transition-colors underline-offset-2 hover:underline"
            >
              Privacidad
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
