'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  AlertCircle,
  CheckCircle2,
  Upload,
  Search,
  RefreshCw,
  QrCode,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { parseAnimalQrPayload } from '@/lib/qr/generate-animal-qr';
import { getAnimales } from '@/lib/api/animales';
import Link from 'next/link';

type CameraState = 'solicitando' | 'activa' | 'denegada' | 'no-disponible' | 'detenida';

export default function QrScannerPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>('solicitando');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<{ animalId: string } | null>(null);
  const [manualArete, setManualArete] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Ref para rastrear si el componente sigue montado (evita condición de carrera con getUserMedia)
  const isMountedRef = useRef(true);

  // Ref para mantener la versión más reciente del bucle de escaneo sin invalidar startCamera
  const scanLoopRef = useRef<() => void>(() => {});

  // Detener la transmisión de la cámara de manera limpia e inmediata
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause?.();
      } catch {}
      videoRef.current.srcObject = null;
    }
  }, []);

  // Procesar y validar un código leído (sea por cámara o por archivo)
  const processDecodedString = useCallback((rawCode: string) => {
    const parseResult = parseAnimalQrPayload(rawCode);

    if (parseResult.isValid && parseResult.animalId) {
      setErrorMessage(null);
      setSuccessPayload({ animalId: parseResult.animalId });
      stopCamera();

      // Redirigir al expediente correspondiente
      setTimeout(() => {
        router.push(`/hato/${parseResult.animalId}`);
      }, 700);
    } else {
      setErrorMessage(
        parseResult.error ||
          'Código QR no reconocido. No corresponde a un expediente de animal en ResDigital.',
      );
    }
  }, [router, stopCamera]);

  // Bucle de escaneo continuo fotograma a fotograma
  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isMountedRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        processDecodedString(code.data);
        return; // Detiene el bucle tras detección exitosa
      }
    }

    if (isMountedRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(() => scanLoopRef.current());
    }
  }, [processDecodedString]);

  useEffect(() => {
    scanLoopRef.current = scanLoop;
  }, [scanLoop]);

  // Iniciar la cámara del dispositivo
  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    setSuccessPayload(null);
    setCameraState('solicitando');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraState('no-disponible');
      setErrorMessage('Este navegador o dispositivo no soporta acceso a cámara en tiempo real.');
      return;
    }

    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Cámara trasera en móviles
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      // Si el usuario navegó a otra página mientras el navegador concedía la cámara, apagarla de inmediato
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();

        if (!isMountedRef.current) {
          stopCamera();
          return;
        }

        setCameraState('activa');
        animationFrameIdRef.current = requestAnimationFrame(() => scanLoopRef.current());
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      console.warn('Error al acceder a la cámara:', err);
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        setCameraState('denegada');
        setErrorMessage('Permiso de cámara denegado. Permite el acceso a la cámara en tu navegador para escanear.');
      } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
        setCameraState('no-disponible');
        setErrorMessage('No se encontró ninguna cámara conectada en este equipo.');
      } else {
        setCameraState('no-disponible');
        setErrorMessage(`No se pudo iniciar la cámara (${errorObj?.message || 'Error desconocido'}).`);
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      startCamera();
    }, 0);

    // Detener la cámara si el usuario minimiza o cambia de pestaña
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
        setCameraState('detenida');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Escanear código QR desde un archivo de imagen subido
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          processDecodedString(code.data);
        } else {
          setErrorMessage('No se detectó ningún código QR legible en la imagen seleccionada.');
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Búsqueda manual directa por arete o DIIO
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = manualArete.trim();
    if (!rawInput) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessPayload(null);

    const cleanInput = rawInput.replace(/^#/, '').trim();

    try {
      // Consultar animales que coincidan por arete, nombre o DIIO
      const results = await getAnimales({ buscar: cleanInput });

      if (!results || results.length === 0) {
        setErrorMessage(`No se encontró ningún animal con el arete o DIIO "${rawInput}" en este hato.`);
        setIsProcessing(false);
        return;
      }

      // Buscar coincidencia exacta (areteInterno, DIIO o ID)
      const exactMatch = results.find(
        (a) =>
          a.areteInterno?.toLowerCase() === cleanInput.toLowerCase() ||
          `#${a.areteInterno}`.toLowerCase() === rawInput.toLowerCase() ||
          a.numeroOficialDiio?.toLowerCase() === cleanInput.toLowerCase() ||
          a.id === cleanInput,
      );

      const targetAnimal = exactMatch || (results.length === 1 ? results[0] : null);

      if (targetAnimal) {
        // Redirigir directamente al expediente del animal encontrado
        setSuccessPayload({ animalId: targetAnimal.id });
        stopCamera();
        setTimeout(() => {
          router.push(`/hato/${targetAnimal.id}`);
        }, 600);
      } else {
        // Si hay varios resultados ambiguos (ej. escribió '5' y hay varios), abrir el Hato con el filtro
        router.push(`/hato?buscar=${encodeURIComponent(cleanInput)}`);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setErrorMessage(`Error al consultar el animal: ${errorObj?.message || 'Error de conexión'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-200 mb-2">
            <QrCode className="w-3.5 h-3.5" />
            <span>Módulo de Trazabilidad Rápida (MOD-08)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Escáner QR de Arete
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Apunta la cámara a la etiqueta del animal para acceder instantáneamente a su expediente.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {cameraState === 'activa' ? (
            <button
              onClick={() => {
                stopCamera();
                setCameraState('detenida');
              }}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <CameraOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Pausar Cámara</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-navy text-white font-semibold hover:bg-navy-light transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Activar Cámara</span>
            </button>
          )}

          <Link
            href="/hato"
            className="text-xs px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
          >
            Ir a Lista del Hato
          </Link>
        </div>
      </div>

      {/* Alerta de Error Visible (Criterio QR-T002) */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed flex-1">
            <p className="font-bold text-red-950 mb-0.5">Atención</p>
            <p>{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-700 text-xs font-bold"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Alerta de Éxito al detectar animal */}
      {successPayload && (
        <div
          role="status"
          className="p-4 rounded-xl bg-green-50 border border-green-300 text-green-900 flex items-center gap-3 animate-in zoom-in-95"
        >
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold text-green-950">¡Código QR detectado!</p>
            <p>Abriendo expediente del semoviente...</p>
          </div>
        </div>
      )}

      {/* Visor Principal de Cámara */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
        <div className="relative aspect-video max-w-lg mx-auto bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
          {/* Elemento Video para la Cámara Real */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraState !== 'activa' ? 'hidden' : ''}`}
            autoPlay
            playsInline
            muted
          />

          {/* Canvas oculto para procesar fotogramas con jsQR */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Marco de Enfoque Guía (Overlay) */}
          {cameraState === 'activa' && !successPayload && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-56 h-56 border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                {/* Esquinas destacadas */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                {/* Línea animada de escaneo */}
                <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_8px_#38bdf8] animate-pulse mt-28" />
              </div>
            </div>
          )}

          {/* Estado: Solicitando acceso */}
          {cameraState === 'solicitando' && (
            <div className="text-center p-6 space-y-3 text-slate-300">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-400" />
              <p className="text-sm font-medium">Iniciando cámara del dispositivo...</p>
            </div>
          )}

          {/* Estado: Permiso Denegado */}
          {cameraState === 'denegada' && (
            <div className="text-center p-6 space-y-3 max-w-sm text-slate-300">
              <CameraOff className="w-10 h-10 mx-auto text-amber-400" />
              <p className="text-sm font-bold text-white">Permiso de Cámara Bloqueado</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                El navegador no tiene permiso para activar la cámara. Habilita los permisos en la barra de direcciones o utiliza la subida de foto.
              </p>
              <button
                onClick={startCamera}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar Permiso</span>
              </button>
            </div>
          )}

          {/* Estado: Cámara No Disponible */}
          {cameraState === 'no-disponible' && (
            <div className="text-center p-6 space-y-3 max-w-sm text-slate-300">
              <CameraOff className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm font-bold text-white">Cámara no disponible</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                No se detectó un sensor de cámara activo. Puedes cargar una imagen con la etiqueta o buscar por arete manual.
              </p>
              <button
                onClick={startCamera}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Intentar Conectar</span>
              </button>
            </div>
          )}

          {/* Estado: Cámara en Pausa / Detenida */}
          {cameraState === 'detenida' && (
            <div className="text-center p-6 space-y-3 max-w-sm text-slate-300">
              <CameraOff className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm font-bold text-white">Cámara en Pausa</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                La cámara está apagada para proteger tu privacidad. Puedes reactivarla cuando la necesites.
              </p>
              <button
                onClick={startCamera}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Reactivar Cámara</span>
              </button>
            </div>
          )}
        </div>

        {/* Métodos Alternativos: Subir Foto o Buscar Arete Manual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
          {/* Subir archivo de imagen con QR */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Upload className="w-4 h-4 text-navy" />
              Escanear desde foto guardada
            </h3>
            <p className="text-xs text-slate-500">
              ¿Tomaste una fotografía de la etiqueta con otro teléfono o cámara?
            </p>
            <label className="mt-2 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs">
              <Camera className="w-4 h-4 text-slate-500" />
              <span>{isProcessing ? 'Procesando imagen...' : 'Seleccionar Archivo / Foto'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>
          </div>

          {/* Búsqueda manual por arete */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Search className="w-4 h-4 text-navy" />
              Búsqueda directa por arete o DIIO
            </h3>
            <p className="text-xs text-slate-500">
              Si la etiqueta física está rota o ilegible en campo:
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Ej. #104 o DIIO..."
                value={manualArete}
                onChange={(e) => setManualArete(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-hidden focus:border-navy"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-navy text-white rounded-lg text-xs font-bold hover:bg-navy-light transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
              >
                <span>Buscar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Nota de Seguridad y Tenant (FL-09 / Normativa) */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-3 text-slate-600 text-xs">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
        <p>
          <strong>Seguridad y Aislamiento por Finca:</strong> La lectura del código QR verifica que el usuario cuente con una sesión activa y autorización sobre la finca a la que pertenece el semoviente.
        </p>
      </div>
    </div>
  );
}
