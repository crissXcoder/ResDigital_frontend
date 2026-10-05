import QRCode from 'qrcode';

export interface AnimalQrInfo {
  animalId: string;
  areteInterno: string;
  nombre?: string;
  numeroOficialDiio?: string | null;
}

/**
 * Genera la ruta interna estable hacia el expediente del animal.
 * INVARIANTE (FL-09 / QR-T001): El QR no almacena historia clínica ni datos sensibles
 * en el payload; solo codifica el enlace al recurso interno autenticado.
 */
export function getAnimalQrTargetUrl(animalId: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/hato/${animalId}`;
}

/**
 * Genera el DataURL en formato PNG del código QR.
 */
export async function generateAnimalQrDataUrl(
  animalId: string,
  origin?: string,
  options?: QRCode.QRCodeToDataURLOptions,
): Promise<string> {
  const targetUrl = getAnimalQrTargetUrl(animalId, origin);
  return QRCode.toDataURL(targetUrl, {
    width: options?.width || 280,
    margin: options?.margin ?? 2,
    color: {
      dark: '#0F2338', // Brand Navy
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
    ...options,
  });
}

/**
 * Genera el código QR en formato SVG vectorial.
 */
export async function generateAnimalQrSvg(
  animalId: string,
  origin?: string,
): Promise<string> {
  const targetUrl = getAnimalQrTargetUrl(animalId, origin);
  return QRCode.toString(targetUrl, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#0F2338',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Valida y extrae el ID de animal de un código QR escaneado.
 * Asegura que apunta estrictamente a una ruta de expediente /hato/:id.
 */
export function parseAnimalQrPayload(payload: string): {
  isValid: boolean;
  animalId: string | null;
  error?: string;
} {
  if (!payload || typeof payload !== 'string') {
    return { isValid: false, animalId: null, error: 'Código QR vacío o inválido' };
  }

  const cleanPayload = payload.trim();

  // Caso 1: Ruta relativa `/hato/:id`
  const relativeMatch = cleanPayload.match(/^\/hato\/([a-zA-Z0-9_-]+)$/);
  if (relativeMatch) {
    return { isValid: true, animalId: relativeMatch[1] };
  }

  // Caso 2: URL absoluta `https?://.../hato/:id`
  try {
    const url = new URL(cleanPayload);
    const pathMatch = url.pathname.match(/^\/hato\/([a-zA-Z0-9_-]+)$/);
    if (pathMatch) {
      return { isValid: true, animalId: pathMatch[1] };
    }
  } catch {
    // No es una URL válida
  }

  // Si no coincide con el formato esperado del expediente interno
  return {
    isValid: false,
    animalId: null,
    error: 'El código QR no corresponde a un expediente de ResDigital',
  };
}
