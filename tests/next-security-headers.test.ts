import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('cabeceras de seguridad de Next.js', () => {
  it('niega framing, sniffing y permisos sensibles en todas las rutas', async () => {
    const headers = await nextConfig.headers?.();
    const global = headers?.find((entry) => entry.source === '/:path*');
    const values = Object.fromEntries(
      (global?.headers ?? []).map((header) => [header.key, header.value]),
    );

    expect(values['X-Content-Type-Options']).toBe('nosniff');
    expect(values['X-Frame-Options']).toBe('DENY');
    expect(values['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(values['Permissions-Policy']).toContain('camera=()');
  });
});
