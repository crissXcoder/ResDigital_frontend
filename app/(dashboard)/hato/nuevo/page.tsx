'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRazas, getAnimales, createAnimal } from '@/lib/api/animales';
import { getPotreros } from '@/lib/api/potreros';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BUCKET_ANIMALES_FOTOS } from '@/lib/supabase/buckets';

export default function NuevoAnimalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    areteInterno: '',
    numeroOficialDiio: '',
    nombre: '',
    sexo: 'Hembra', // 'Hembra' o 'Macho'
    categoria: '',
    razaId: '',
    razaOtra: '',
    pesoActualKg: '',
    fechaNacimiento: '',
    potreroId: '',
    origen: 'Finca', // 'Finca' o 'Externa'
    padreId: '',
    madreId: '',
    compradoA: '',
    fechaCompra: '',
    valorCompraCrc: '',
    numeroGuia: '',
    metodoCompra: '',
    metodosCombinados: [] as string[],
    referenciaPago: '',
    referenciaSinpe: '',
    referenciaDeposito: '',
  });

  const { data: razas = [], isLoading: loadingRazas } = useQuery({
    queryKey: ['razas'],
    queryFn: () => getRazas(),
  });

  const { data: animales = [] } = useQuery({
    queryKey: ['animales'],
    queryFn: () => getAnimales(),
  });

  const { data: potreros = [] } = useQuery({
    queryKey: ['potreros'],
    queryFn: () => getPotreros(),
  });

  const createMutation = useMutation({
    mutationFn: createAnimal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animales'] });
      router.push('/hato');
    },
    onError: (error: Error) => {
      setErrorMensaje(error.message);
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMensaje(null);
    
    let uploadedFotoUrl = '';

    if (file) {
      setIsUploading(true);
      try {
        const supabase = createClient();
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_ANIMALES_FOTOS)
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from(BUCKET_ANIMALES_FOTOS)
          .getPublicUrl(filePath);
          
        uploadedFotoUrl = data.publicUrl;
      } catch (error: any) {
        alert('Error subiendo imagen: ' + error.message);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    let refFinal = formData.referenciaPago;
    if (formData.metodoCompra === 'Combinado') {
      const refs = [];
      if (formData.metodosCombinados.includes('Sinpe') && formData.referenciaSinpe) {
        refs.push(`Sinpe: ${formData.referenciaSinpe}`);
      }
      if (formData.metodosCombinados.includes('Depósito') && formData.referenciaDeposito) {
        refs.push(`Depósito: ${formData.referenciaDeposito}`);
      }
      if (refs.length > 0) refFinal = refs.join(' | ');
    }

    const trimmedArete = formData.areteInterno.trim();
    const trimmedDiio = formData.numeroOficialDiio?.trim();

    const payload: any = {
      ...formData,
      areteInterno: trimmedArete,
      numeroOficialDiio: trimmedDiio || undefined,
      referenciaPago: refFinal || undefined,
      fotoUrl: uploadedFotoUrl || undefined,
    };

    delete payload.referenciaSinpe;
    delete payload.referenciaDeposito;

    // Convert numeric fields and clear empty strings
    if (payload.pesoActualKg) payload.pesoActualKg = Number(payload.pesoActualKg);
    else delete payload.pesoActualKg;

    if (payload.valorCompraCrc) payload.valorCompraCrc = Number(payload.valorCompraCrc);
    else delete payload.valorCompraCrc;

    if (!payload.fechaCompra) delete payload.fechaCompra;
    if (!payload.fechaNacimiento) delete payload.fechaNacimiento;
    if (!payload.potreroId) delete payload.potreroId;
    if (!payload.madreId) delete payload.madreId;
    if (!payload.padreId) delete payload.padreId;
    if (!payload.numeroOficialDiio) delete payload.numeroOficialDiio;
    if (!payload.numeroGuia) delete payload.numeroGuia;
    if (!payload.compradoA) delete payload.compradoA;
    
    if (payload.metodoCompra !== 'Combinado') {
      delete payload.metodosCombinados;
    }
    if (!payload.metodoCompra) delete payload.metodoCompra;
    if (!payload.razaOtra) delete payload.razaOtra;

    createMutation.mutate(payload);
  };

  const isRazaOtra = razas.find(r => r.id === formData.razaId)?.nombre.toLowerCase() === 'otra';

  const handleCombinadoChange = (method: string) => {
    setFormData(prev => {
      const exists = prev.metodosCombinados.includes(method);
      if (exists) {
        return { ...prev, metodosCombinados: prev.metodosCombinados.filter(m => m !== method) };
      }
      return { ...prev, metodosCombinados: [...prev.metodosCombinados, method] };
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex items-start justify-center">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden mt-10">
        
        {/* Header tipo modal */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-navy">Registrar Nuevo Animal</h1>
          <Link href="/hato" className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {errorMensaje && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Error al registrar el animal</p>
                <p className="text-red-600 mt-0.5">{errorMensaje}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setErrorMensaje(null)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          {/* Top Section: Foto y Sexo */}
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Foto Preview / Placeholder */}
            <div className="w-32 h-32 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden relative">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-400 flex flex-col items-center">
                  <span className="text-4xl">🐄</span>
                  <span className="text-xs mt-1">Animal</span>
                </span>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              {/* Segmented Control: Sexo */}
              <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sexo: 'Hembra' })}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
                    formData.sexo === 'Hembra' 
                      ? 'bg-navy text-white shadow-sm' 
                      : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  Hembra (Vaca / Novilla)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sexo: 'Macho' })}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
                    formData.sexo === 'Macho' 
                      ? 'bg-navy text-white shadow-sm' 
                      : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  Macho (Toro / Torete)
                </button>
              </div>

              {/* Input de archivo real */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                  FOTOGRAFÍA DEL ANIMAL
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-md hover:bg-navy-light transition-colors"
                  >
                    <UploadCloud size={16} />
                    Seleccionar archivo
                  </button>
                  <span className="text-sm text-slate-500 truncate max-w-[200px]">
                    {file ? file.name : 'Ningún archivo seleccionado'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Opcional — se asigna imagen por defecto según el sexo si no subes una.</p>
              </div>
            </div>
          </div>

          {/* Section: IDENTIFICACIÓN */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Identificación</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-navy">Número de Arete <span className="text-danger">*</span></label>
                <input 
                  required
                  type="text" 
                  name="areteInterno"
                  value={formData.areteInterno}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                    errorMensaje?.includes('arete')
                      ? 'border-red-500 ring-2 ring-red-200'
                      : 'border-slate-300 focus:ring-navy-light'
                  }`}
                  placeholder="201"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-navy">
                  Número Oficial DIIO (SENASA)
                </label>
                <input 
                  type="text" 
                  name="numeroOficialDiio"
                  value={formData.numeroOficialDiio}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                    errorMensaje?.includes('DIIO')
                      ? 'border-red-500 ring-2 ring-red-200'
                      : 'border-slate-300 focus:ring-navy-light'
                  }`}
                  placeholder="Ej. CR-12345678"
                />
                <p className="text-[11px] text-slate-400">Opcional. Identificador oficial de trazabilidad.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-navy">Nombre <span className="text-danger">*</span></label>
                <input 
                  required
                  type="text" 
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light"
                  placeholder="Esperanza"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-navy">Raza Principal <span className="text-danger">*</span></label>
                <select
                  required
                  name="razaId"
                  value={formData.razaId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white"
                >
                  <option value="">— Seleccione —</option>
                  {razas.map((raza: any) => (
                    <option key={raza.id} value={raza.id}>{raza.nombre}</option>
                  ))}
                </select>
              </div>

              {isRazaOtra && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Especifique la Raza <span className="text-danger">*</span></label>
                  <input 
                    required
                    type="text" 
                    name="razaOtra"
                    value={formData.razaOtra}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light"
                    placeholder="Escriba la raza"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-navy">Categoría</label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white"
                >
                  <option value="">— Seleccione categoría —</option>
                  {(!formData.sexo || formData.sexo === 'Hembra') && (
                    <>
                      <option value="Ternera">Ternera</option>
                      <option value="Novilla">Novilla</option>
                      <option value="Vaca">Vaca</option>
                    </>
                  )}
                  {(!formData.sexo || formData.sexo === 'Macho') && (
                    <>
                      <option value="Ternero">Ternero</option>
                      <option value="Novillo">Novillo</option>
                      <option value="Novillo mayor">Novillo mayor</option>
                      <option value="Toro">Toro</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-navy">Peso Actual (kg)</label>
                <input 
                  type="number" 
                  name="pesoActualKg"
                  value={formData.pesoActualKg}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light"
                  placeholder="480"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-navy">Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  name="fechaNacimiento"
                  value={formData.fechaNacimiento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-600"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <label className="block text-sm font-semibold text-navy">Potrero</label>
                <select
                  name="potreroId"
                  value={formData.potreroId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white"
                >
                  <option value="">Sin Asignar</option>
                  {potreros.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: ORIGEN Y GENEALOGÍA */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Origen y Genealogía</h2>
            
            <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50 mb-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, origen: 'Finca' })}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
                  formData.origen === 'Finca' 
                    ? 'bg-navy text-white shadow-sm' 
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                Nacida en Finca
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, origen: 'Externa' })}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
                  formData.origen === 'Externa' 
                    ? 'bg-navy text-white shadow-sm' 
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                Comprada / Externa
              </button>
            </div>

            {formData.origen === 'Finca' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Toro Padre (Semental)</label>
                  <select
                    name="padreId"
                    value={formData.padreId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white"
                  >
                    <option value="">— Seleccionar Toro Padre —</option>
                    {animales.filter((a: any) => a.sexo === 'Macho').map((toro: any) => (
                      <option key={toro.id} value={toro.id}>{toro.areteInterno} - {toro.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Vaca Madre (Matriz)</label>
                  <select
                    name="madreId"
                    value={formData.madreId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white"
                  >
                    <option value="">— Seleccionar Vaca Madre —</option>
                    {animales.filter((a: any) => a.sexo === 'Hembra').map((vaca: any) => (
                      <option key={vaca.id} value={vaca.id}>{vaca.areteInterno} - {vaca.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {formData.origen === 'Externa' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl border border-warning/30 bg-warning-bg">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Comprado a / Ganadería</label>
                  <input
                    type="text"
                    name="compradoA"
                    value={formData.compradoA || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-amber-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white/50"
                    placeholder="Subasta Ganadera Esparza"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Fecha de Compra</label>
                  <input
                    type="date"
                    name="fechaCompra"
                    value={formData.fechaCompra || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-amber-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white/50 text-slate-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Valor de Compra (CRC ₡)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="valorCompraCrc"
                    value={formData.valorCompraCrc || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-amber-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white/50"
                    placeholder="850000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">N° Comprobante / Guía</label>
                  <input
                    type="text"
                    name="numeroGuia"
                    value={formData.numeroGuia || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-amber-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white/50"
                    placeholder="FAC-2024-001"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Método de Compra</label>
                  <select
                    name="metodoCompra"
                    value={formData.metodoCompra || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-amber-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white/50 text-slate-700"
                  >
                    <option value="">— Seleccionar Método —</option>
                    <option value="Sinpe">Sinpe</option>
                    <option value="Depósito">Depósito</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Combinado">Combinado</option>
                  </select>
                </div>
                {formData.metodoCompra === 'Combinado' && (
                  <div className="col-span-1 sm:col-span-2 space-y-2 mt-1">
                    <label className="block text-sm font-semibold text-navy">¿Qué métodos incluye?</label>
                    <div className="flex flex-wrap gap-4">
                      {['Efectivo', 'Sinpe', 'Depósito'].map(method => (
                        <label key={method} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-navy rounded border-amber-200"
                            checked={formData.metodosCombinados.includes(method)}
                            onChange={() => handleCombinadoChange(method)}
                          /> 
                          {method}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {formData.metodoCompra === 'Combinado' ? (
                  <>
                    {formData.metodosCombinados.includes('Sinpe') && (
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-navy">N° Referencia Sinpe</label>
                        <input
                          type="text"
                          name="referenciaSinpe"
                          value={formData.referenciaSinpe || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-amber-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white/50"
                          placeholder="Ej. 12345678"
                        />
                      </div>
                    )}
                    {formData.metodosCombinados.includes('Depósito') && (
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-navy">N° Referencia Depósito</label>
                        <input
                          type="text"
                          name="referenciaDeposito"
                          value={formData.referenciaDeposito || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-amber-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white/50"
                          placeholder="Ej. 12345678"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  (formData.metodoCompra === 'Sinpe' || formData.metodoCompra === 'Depósito') && (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-navy">N° Referencia {formData.metodoCompra}</label>
                      <input
                        type="text"
                        name="referenciaPago"
                        value={formData.referenciaPago || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-amber-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white/50"
                        placeholder="Ej. 12345678"
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
            <Link 
              href="/hato"
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-semibold"
            >
              Cancelar
            </Link>
            <button 
              type="submit"
              disabled={createMutation.isPending || isUploading}
              className="flex items-center gap-2 px-6 py-2.5 bg-navy text-white rounded-md hover:bg-navy-light transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {(createMutation.isPending || isUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
              {createMutation.isPending ? 'Registrando...' : isUploading ? 'Subiendo foto...' : 'Registrar Animal'}
            </button>
          </div>
          
        </form>
      </div>
    </main>
  );
}
