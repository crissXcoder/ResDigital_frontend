import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TerminosPage from '@/app/terminos/page';
import PrivacidadPage from '@/app/privacidad/page';
import Home from '@/app/page';
import { Sidebar } from '@/components/layout/Sidebar';
import * as useAuthUserModule from '@/lib/hooks/useAuthUser';

const mockBack = vi.fn();
const mockPush = vi.fn();

// Mock de useRouter y usePathname
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
}));

// Mock del hook useAuthUser
vi.mock('@/lib/hooks/useAuthUser', () => ({
  useAuthUser: vi.fn(),
}));

// Mock de React Query en Sidebar
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: [{ id: '1', activo: true }],
    isLoading: false,
    error: null,
  })),
}));

describe('Páginas Legales y Términos para Piloto (LEG-T001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockProfile = {
      userId: 'usr-1',
      correo: 'productor@fincasanmartin.cr',
      nombreCompleto: 'Don Carlos Ganadero',
      rol: 'propietario' as const,
      tenantId: 'finca-001',
      nombreFinca: 'Finca San Martín',
    };
    vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
      user: mockProfile,
      role: 'propietario',
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isAuthenticated: true,
    });
  });

  describe('Página de Términos y Condiciones (/terminos)', () => {
    it('renderiza título, advertencia de carácter académico y descargo de no asesoría legal ni médica', () => {
      render(<TerminosPage />);

      expect(
        screen.getByRole('heading', {
          name: /términos y condiciones del piloto resdigital/i,
        }),
      ).toBeDefined();

      expect(
        screen.getByText(/documento académico · piloto de investigación/i),
      ).toBeDefined();

      expect(
        screen.getByText(
          /este documento no constituye asesoría legal profesional ni contrato mercantil comercial vinculante/i,
        ),
      ).toBeDefined();
      expect(
        screen.getByText(
          /no constituyen diagnóstico ni prescripción médica veterinaria/i,
        ),
      ).toBeDefined();
    });

    it('establece la distinción entre DIIO oficial del Estado y arete/QR interno de ResDigital', () => {
      render(<TerminosPage />);

      expect(
        screen.getByText(
          /identificación oficial vs\. identificación interna resdigital/i,
        ),
      ).toBeDefined();
      expect(
        screen.getByText(/dispositivo de identificación individual oficial/i),
      ).toBeDefined();
      expect(
        screen.getByText(
          /en ningún caso sustituyen, modifican ni reemplazan el arete oficial o certificado oficial emitido por el estado/i,
        ),
      ).toBeDefined();
    });

    it('el botón "Volver" retrocede en el historial del usuario a la pantalla previa en lugar de forzar a la landing', () => {
      render(<TerminosPage />);

      const backButton = screen.getByRole('button', { name: /volver/i });
      fireEvent.click(backButton);

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('muestra acceso directo al Dashboard cuando el usuario está autenticado', () => {
      render(<TerminosPage />);

      const dashboardLink = screen.getByRole('link', { name: /ir al dashboard/i });
      expect(dashboardLink.getAttribute('href')).toBe('/dashboard');
    });
  });

  describe('Página de Política de Privacidad (/privacidad)', () => {
    it('renderiza título, referencia a la Ley 8968 de Costa Rica y aviso de no asesoría jurídica', () => {
      render(<PrivacidadPage />);

      expect(
        screen.getByRole('heading', {
          name: /política de privacidad y tratamiento de datos/i,
        }),
      ).toBeDefined();

      expect(
        screen.getByText(/ley de protección de la persona frente al tratamiento de sus datos personales de costa rica \(ley n° 8968\)/i),
      ).toBeDefined();

      expect(
        screen.getByText(/no constituye asesoría jurídica formal/i),
      ).toBeDefined();
    });

    it('detalla medidas de seguridad: hashing seguro con bcrypt y aislamiento multi-tenant por tenant_id', () => {
      render(<PrivacidadPage />);

      expect(
        screen.getByText(/medidas de seguridad y aislamiento de datos \(multi-tenant\)/i),
      ).toBeDefined();
      expect(
        screen.getByText(/algoritmos robustos de hash de contraseñas de un solo sentido \(bcrypt/i),
      ).toBeDefined();
      expect(
        screen.getByText(/aislamiento estricto por finca \(multi-tenant\)/i),
      ).toBeDefined();
      expect(screen.getByText('tenant_id')).toBeDefined();
    });

    it('reconoce y enumera los Derechos ARCO conforme a la normativa costarricense', () => {
      render(<PrivacidadPage />);

      expect(
        screen.getByText(/derechos del titular \(derechos arco\)/i),
      ).toBeDefined();
      expect(screen.getByText(/acceso:/i)).toBeDefined();
      expect(screen.getByText(/rectificación:/i)).toBeDefined();
      expect(screen.getByText(/cancelación y supresión:/i)).toBeDefined();
      expect(screen.getByText(/oposición:/i)).toBeDefined();
    });

    it('el botón "Volver" retrocede a la pantalla previa en el navegador', () => {
      render(<PrivacidadPage />);

      const backButton = screen.getByRole('button', { name: /volver/i });
      fireEvent.click(backButton);

      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accesibilidad de enlaces legales en la aplicación', () => {
    it('el Sidebar incluye enlaces a Términos y Privacidad en su pie de página', () => {
      render(<Sidebar isOpen={true} onClose={vi.fn()} />);

      const termsLink = screen.getByRole('link', { name: /términos/i });
      const privacyLink = screen.getByRole('link', { name: /privacidad/i });

      expect(termsLink.getAttribute('href')).toBe('/terminos');
      expect(privacyLink.getAttribute('href')).toBe('/privacidad');
    });

    it('la página de inicio (Landing Page) incluye enlaces a Términos y Privacidad', () => {
      render(<Home />);

      const termsLink = screen.getByRole('link', { name: /términos y condiciones/i });
      const privacyLink = screen.getByRole('link', { name: /política de privacidad/i });

      expect(termsLink.getAttribute('href')).toBe('/terminos');
      expect(privacyLink.getAttribute('href')).toBe('/privacidad');
    });
  });
});
