'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, QrCode, Download, Copy, Check, AlertTriangle, Printer, Loader2 } from 'lucide-react';
import { generateAnimalQrDataUrl, getAnimalQrTargetUrl } from '@/lib/qr/generate-animal-qr';

interface ModalQrAnimalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: {
    id: string;
    areteInterno: string | number;
    nombre?: string | null;
    numeroOficialDiio?: string | null;
    sexo?: string | null;
    raza?: { nombre?: string } | string | null;
  };
  nombreFinca?: string;
}

export default function ModalQrAnimal({
  isOpen,
  onClose,
  animal,
  nombreFinca,
}: ModalQrAnimalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // En la base de datos real, raza es una relación (objeto CatalogoRaza con { id, nombre, diasGestacion })
  // mientras que en datos simples puede ser un string. Extraer nombre de forma segura:
  const nombreRaza =
    typeof animal.raza === 'object' && animal.raza !== null
      ? animal.raza.nombre || null
      : typeof animal.raza === 'string'
      ? animal.raza
      : null;

  const targetUrl = typeof window !== 'undefined' ? getAnimalQrTargetUrl(String(animal.id)) : `/hato/${animal.id}`;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    generateAnimalQrDataUrl(animal.id)
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error al generar código QR:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, animal.id]);

  // Bloquear el scroll del fondo cuando el modal está abierto
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

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `QR-Arete-${animal.areteInterno}-ResDigital.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;

    // Crear un iframe invisible para aislar exclusivamente la ficha del código QR
    // y evitar imprimir el fondo, encabezados del modal, botones o generar múltiples páginas.
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Etiqueta QR - Arete #${animal.areteInterno}</title>
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
              background: #FFFFFF;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 80vh;
              box-sizing: border-box;
            }
            .ticket {
              width: 280px;
              border: 2px solid #0F2338;
              border-radius: 14px;
              padding: 16px;
              text-align: center;
              box-sizing: border-box;
              background: #FFFFFF;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .finca {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: #64748B;
              margin-bottom: 2px;
            }
            .arete {
              font-size: 20px;
              font-weight: 900;
              color: #0F2338;
              margin: 0 0 2px 0;
              line-height: 1.2;
            }
            .nombre {
              font-size: 12px;
              font-weight: 600;
              color: #475569;
              margin: 0 0 10px 0;
            }
            .qr-box {
              background: #FFFFFF;
              padding: 8px;
              border-radius: 10px;
              border: 1px solid #E2E8F0;
              display: inline-block;
              margin-bottom: 10px;
            }
            .qr-img {
              width: 160px;
              height: 160px;
              display: block;
            }
            .metadata {
              border-top: 1px solid #E2E8F0;
              padding-top: 8px;
              font-size: 11px;
              color: #475569;
              text-align: left;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .label {
              color: #64748B;
            }
            .value {
              font-weight: 700;
              color: #0F2338;
            }
            .disclaimer {
              margin-top: 8px;
              padding-top: 6px;
              border-top: 1px dashed #CBD5E1;
              font-size: 8.5px;
              color: #94A3B8;
              text-align: center;
              line-height: 1.25;
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="finca">${nombreFinca || 'ResDigital Ganadero'}</div>
            <h1 class="arete">Arete #${animal.areteInterno}</h1>
            ${animal.nombre ? `<div class="nombre">${animal.nombre}</div>` : ''}
            <div class="qr-box">
              <img src="${qrDataUrl}" class="qr-img" alt="Código QR Arete #${animal.areteInterno}" />
            </div>
            <div class="metadata">
              <div class="row">
                <span class="label">DIIO Oficial:</span>
                <span class="value">${animal.numeroOficialDiio || 'Sin registrar'}</span>
              </div>
              ${nombreRaza ? `
                <div class="row">
                  <span class="label">Raza:</span>
                  <span class="value">${nombreRaza}</span>
                </div>
              ` : ''}
              <div class="row">
                <span class="label">Ruta:</span>
                <span class="value" style="font-family: monospace; font-size: 9px;">/hato/${animal.id}</span>
              </div>
            </div>
            <div class="disclaimer">
              Identificador de Manejo Interno · No sustituye DIIO oficial
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Esperar renderizado y ejecutar impresión en la ventana aislada
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 1500);
      }
    }, 200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 id="qr-modal-title" className="text-base font-bold text-slate-900">
                Código QR de Expediente
              </h2>
              <p className="text-xs text-slate-500">
                Arete Interno #{animal.areteInterno}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Advertencia Regulatoria DIIO */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <p className="font-bold text-amber-950 mb-0.5">
                Identificador de Manejo Interno
              </p>
              <p>
                Este código QR es para uso operativo en ResDigital. <strong>No sustituye ni reemplaza el arete o Dispositivo de Identificación Individual Oficial (DIIO)</strong> regulado por SENASA/MAG.
              </p>
            </div>
          </div>

          {/* Tarjeta imprimible de la etiqueta */}
          <div
            ref={printRef}
            className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col items-center text-center shadow-xs"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
              {nombreFinca || 'ResDigital Ganadero'}
            </span>
            <h3 className="text-base font-black text-navy">
              Arete #{animal.areteInterno}
            </h3>
            {animal.nombre && (
              <p className="text-xs font-medium text-slate-600">
                {animal.nombre}
              </p>
            )}

            {/* Visualización del código QR */}
            <div className="my-3 p-2 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-center min-w-[170px] min-h-[170px]">
              {isLoading ? (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-navy" />
                  <span className="text-[11px]">Generando código...</span>
                </div>
              ) : qrDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrDataUrl}
                  alt={`Código QR para animal #${animal.areteInterno}`}
                  className="w-40 h-40 rounded-md"
                />
              ) : (
                <p className="text-xs text-red-500 font-medium">
                  Error al generar código QR
                </p>
              )}
            </div>

            {/* Metadatos en la etiqueta */}
            <div className="w-full pt-2.5 border-t border-slate-200 text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>DIIO Oficial:</span>
                <span className="font-semibold text-slate-800">
                  {animal.numeroOficialDiio || 'Sin registrar'}
                </span>
              </div>
              {nombreRaza && (
                <div className="flex justify-between">
                  <span>Raza:</span>
                  <span className="font-medium text-slate-700">{nombreRaza}</span>
                </div>
              )}
              <div className="text-[10px] text-slate-400 pt-0.5">
                Apunta a: <span className="font-mono">{`/hato/${animal.id}`}</span>
              </div>
            </div>
          </div>

          {/* Enlace directo */}
          <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
            <input
              type="text"
              readOnly
              value={targetUrl}
              className="bg-transparent text-xs text-slate-600 font-mono flex-1 outline-hidden select-all"
            />
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-600">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleDownloadPng}
            disabled={!qrDataUrl || isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-xs font-bold hover:bg-navy-light transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
