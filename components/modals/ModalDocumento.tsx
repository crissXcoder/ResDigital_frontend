import { useState, useRef } from 'react';
import { X, Upload, File as FileIcon, Loader2 } from 'lucide-react';
import { getAnimalDocumentExtension } from '@/lib/supabase/animal-documents';

interface ModalDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { tipo: string; file: File }) => Promise<void>;
  isUploading: boolean;
}

export default function ModalDocumento({ isOpen, onClose, onSubmit, isUploading }: ModalDocumentoProps) {
  const [tipo, setTipo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo.trim() || !file) return;

    setError(null);
    try {
      await onSubmit({ tipo: tipo.trim(), file });
      setTipo('');
      setFile(null);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar el archivo.');
    }
  };

  const selectFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    try {
      getAnimalDocumentExtension(selectedFile);
      setFile(selectedFile);
      setError(null);
    } catch (fileError) {
      setFile(null);
      setError(fileError instanceof Error ? fileError.message : 'Seleccione un archivo PDF, PNG o JPG.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    selectFile(droppedFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-navy">Agregar documento</h2>
          <button 
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div>
            <label htmlFor="animal-document-type" className="block text-sm font-semibold text-slate-700 mb-2">
              Tipo de Documento
            </label>
            <input 
              type="text"
              id="animal-document-type"
              list="docTypes"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              onFocus={() => setError(null)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all"
              placeholder="Ej. Certificado de Pedigrí"
              required
              disabled={isUploading}
            />
            <datalist id="docTypes">
              <option value="Certificado de Pedigrí" />
              <option value="Permiso Sanitario" />
              <option value="Guía de Movilización" />
              <option value="Vacuna Aftosa" />
              <option value="Prueba de Brucelosis" />
              <option value="Historial Clínico" />
              <option value="Factura de Compra" />
            </datalist>
          </div>

          <div>
            <label htmlFor="animal-document-file" className="block text-sm font-semibold text-slate-700 mb-2">
              Archivo (PDF o Imagen)
            </label>
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
                ${file ? 'border-navy/50 bg-navy/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                id="animal-document-file"
                ref={fileInputRef}
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                onChange={(e) => {
                  selectFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
                disabled={isUploading}
              />
              
              {file ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-navy">
                    <FileIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-navy truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button 
                    type="button"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-xs font-semibold text-red-500 hover:text-red-600 mt-2"
                  >
                    Eliminar archivo
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 cursor-pointer">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Haz clic o arrastra aquí</p>
                  <p className="text-xs text-slate-400">Soporta PDF, JPG, PNG (máx 10MB)</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!tipo.trim() || !file || isUploading}
              className="w-full py-3 bg-navy text-white rounded-xl font-bold shadow-sm hover:bg-navy-light focus:outline-none focus:ring-4 focus:ring-navy/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Subiendo...
                </>
              ) : (
                'Guardar Documento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
