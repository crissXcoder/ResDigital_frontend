import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getCatalogosRazas } from '@/lib/api/catalogos';
import { updateAnimal, getAnimales } from '@/lib/api/animales';
import { getPotreros } from '@/lib/api/potreros';

interface ModalEditarAnimalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: any;
}

export function ModalEditarAnimal({ isOpen, onClose, animal }: ModalEditarAnimalProps) {
  const queryClient = useQueryClient();
  
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    numeroOficialDiio: '',
    razaId: '',
    razaOtra: '',
    categoria: '',
    pesoActualKg: '',
    potreroId: '',
  });

  const { data: razas = [] } = useQuery({
    queryKey: ['catalogos-razas'],
    queryFn: getCatalogosRazas,
    enabled: isOpen,
  });

  const { data: animales = [] } = useQuery({
    queryKey: ['animales'],
    queryFn: () => getAnimales(),
    enabled: isOpen,
  });

  const { data: potreros = [] } = useQuery({
    queryKey: ['potreros'],
    queryFn: () => getPotreros(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (animal && isOpen) {
      setFormData({
        nombre: animal.nombre || '',
        numeroOficialDiio: animal.numeroOficialDiio || '',
        razaId: animal.razaId || '',
        razaOtra: animal.razaOtra || '',
        categoria: animal.categoria || '',
        pesoActualKg: animal.pesoActualKg || '',
        potreroId: animal.potreroId || '',
      });
      setErrorMensaje(null);
    }
  }, [animal, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateAnimal(animal.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animales'] });
      queryClient.invalidateQueries({ queryKey: ['animal', animal.id] });
      onClose();
    },
    onError: (error: any) => {
      console.error(error);
      setErrorMensaje(error?.message || error.response?.data?.message || 'Hubo un error al actualizar el animal');
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMensaje(null);
    const trimmedDiio = formData.numeroOficialDiio.trim();

    updateMutation.mutate({
      nombre: formData.nombre,
      numeroOficialDiio: trimmedDiio === '' ? null : trimmedDiio,
      razaId: formData.razaId,
      razaOtra: formData.razaOtra,
      categoria: formData.categoria,
      pesoActualKg: formData.pesoActualKg ? Number(formData.pesoActualKg) : null,
      potreroId: formData.potreroId,
    });
  };

  const selectedRazaNombre = razas.find((r: any) => r.id === formData.razaId)?.nombre;
  const isOtraRaza = selectedRazaNombre?.toLowerCase() === 'otra';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-navy">
            Editar #{animal?.areteInterno} {animal?.nombre}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMensaje && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-xs uppercase tracking-wide">Conflicto de actualización</p>
                <p className="text-red-600 text-xs mt-0.5">{errorMensaje}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setErrorMensaje(null)}
                className="text-red-400 hover:text-red-600 p-0.5"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nombre
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light focus:border-transparent text-slate-700"
                placeholder="Ej. Mariposa"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Número Oficial DIIO (SENASA)
              </label>
              <input
                type="text"
                value={formData.numeroOficialDiio}
                onChange={(e) => setFormData({ ...formData, numeroOficialDiio: e.target.value })}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                  errorMensaje?.includes('DIIO')
                    ? 'border-red-500 ring-2 ring-red-200'
                    : 'border-slate-200 focus:ring-navy-light'
                } text-slate-700`}
                placeholder="Ej. CR-12345678"
              />
              <p className="text-[11px] text-slate-400 mt-1">Opcional. Identificador oficial único.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Raza principal *
              </label>
              <select
                required
                value={formData.razaId}
                onChange={(e) => setFormData({ ...formData, razaId: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
              >
                <option value="">— Seleccione raza —</option>
                {razas.map((raza: any) => (
                  <option key={raza.id} value={raza.id}>{raza.nombre}</option>
                ))}
              </select>
            </div>
            {isOtraRaza && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Especifique Raza / Composición *
                </label>
                <input
                  required
                  type="text"
                  value={formData.razaOtra}
                  onChange={(e) => setFormData({ ...formData, razaOtra: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
                  placeholder="Ej. Girolando (75% Holstein / 25% Gyr)"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Categoría
            </label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
            >
              <option value="">— Seleccione categoría —</option>
              {(!animal.sexo || animal.sexo === 'Hembra') && (
                <>
                  <option value="Ternera">Ternera</option>
                  <option value="Novilla">Novilla</option>
                  <option value="Vaca">Vaca</option>
                </>
              )}
              {(!animal.sexo || animal.sexo === 'Macho') && (
                <>
                  <option value="Ternero">Ternero</option>
                  <option value="Novillo">Novillo</option>
                  <option value="Novillo mayor">Novillo mayor</option>
                  <option value="Toro">Toro</option>
                </>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Peso (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.pesoActualKg}
                onChange={(e) => setFormData({ ...formData, pesoActualKg: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light focus:border-transparent text-slate-700"
                placeholder="485"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Potrero
              </label>
              <select
                value={formData.potreroId}
                onChange={(e) => setFormData({ ...formData, potreroId: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light focus:border-transparent text-slate-700"
              >
                <option value="">Sin Asignar</option>
                {potreros.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-navy text-white rounded-lg text-sm font-bold shadow-sm hover:bg-navy-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
