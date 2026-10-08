import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModalTratamiento, { type TratamientoFormData } from '@/components/modals/ModalTratamiento';
import { BadgesRetiro } from '@/components/sanitario/BadgesRetiro';
import { DocumentoTratamientoLink } from '@/components/sanitario/DocumentoTratamientoLink';
import { ApiError } from '@/lib/api/client';
import { rutaDocumentoTratamiento } from '@/lib/sanitario/documento';
import type { EstadoSanitario } from '@/lib/api/sanitary';

const storage = vi.hoisted(() => ({
  bucket: '',
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: (bucket: string) => {
        storage.bucket = bucket;
        return { upload: storage.upload, remove: storage.remove, createSignedUrl: storage.createSignedUrl };
      },
    },
  }),
}));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    fetchApi: vi.fn(async (endpoint: string) =>
      endpoint === '/catalogos/medicamentos'
        ? [{ id: MED, nombreComercial: 'Oxitetraciclina', principioActivo: 'Oxi', viaAdministracion: 'Intramuscular', diasRetiroLecheDefault: 7, diasRetiroCarneDefault: 28 }]
        : [{ id: PAD, nombre: 'Neumonía', categoria: 'Respiratorio', medicamentoSugeridoId: null }],
    ),
  };
});

const TENANT = '11111111-1111-4111-8111-111111111111';
const ANIMAL = '22222222-2222-4222-8222-222222222222';
const MED = '55555555-5555-4555-8555-555555555555';
const PAD = '66666666-6666-4666-8666-666666666666';
const RUTA = new RegExp(`^${TENANT}/${ANIMAL}/tratamiento/[0-9a-f-]{36}\\.pdf$`);

function pdf(nombre = 'receta.pdf', bytes = 10): File {
  return new File([new Uint8Array(bytes)], nombre, { type: 'application/pdf' });
}

const ESTADO: EstadoSanitario = {
  animalId: ANIMAL,
  enRetiro: true,
  liberacionLeche: '2099-01-05',
  liberacionCarne: null,
  diasRestantesLeche: 3,
  diasRestantesCarne: 0,
  tratamientoReferencia: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  storage.upload.mockResolvedValue({ error: null });
  storage.remove.mockResolvedValue({ error: null });
  storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://firmada/doc' }, error: null });
});
afterEach(cleanup);

describe('BadgesRetiro', () => {
  it('muestra leche BLOQUEADO y carne LIBRE de forma independiente', () => {
    render(<BadgesRetiro estado={ESTADO} />);
    expect(screen.getByTestId('badge-retiro-leche').textContent).toContain('Leche: BLOQUEADO');
    expect(screen.getByTestId('badge-retiro-leche').textContent).toContain('05/01/2099');
    expect(screen.getByTestId('badge-retiro-carne').textContent).toContain('Carne: LIBRE');
  });

  it('sin retiro ambos quedan LIBRE', () => {
    render(<BadgesRetiro estado={{ ...ESTADO, enRetiro: false, liberacionLeche: null, diasRestantesLeche: 0 }} />);
    expect(screen.getByTestId('badge-retiro-leche').textContent).toContain('Leche: LIBRE');
    expect(screen.getByTestId('badge-retiro-carne').textContent).toContain('Carne: LIBRE');
  });
});

describe('documento del tratamiento', () => {
  it('arma la ruta privada de la finca y del animal', () => {
    expect(rutaDocumentoTratamiento(TENANT, ANIMAL, pdf())).toMatch(RUTA);
    expect(rutaDocumentoTratamiento(TENANT, ANIMAL, pdf('foto.JPEG'))).toMatch(/\.jpg$/);
  });

  it('rechaza tipos no permitidos y archivos vacíos', () => {
    expect(() => rutaDocumentoTratamiento(TENANT, ANIMAL, pdf('virus.exe'))).toThrow(/PDF, PNG o JPG/);
    expect(() => rutaDocumentoTratamiento(TENANT, ANIMAL, pdf('vacio.pdf', 0))).toThrow(/10 MB/);
  });

  it('una ruta privada se abre con enlace firmado y una URL heredada tal cual', async () => {
    render(<DocumentoTratamientoLink documento={`${TENANT}/${ANIMAL}/tratamiento/x.pdf`}>privado</DocumentoTratamientoLink>);
    expect((await screen.findByText('privado')).getAttribute('href')).toBe('https://firmada/doc');
    expect(storage.bucket).toBe('animal_docs');

    render(<DocumentoTratamientoLink documento="https://viejo/publico.pdf">heredado</DocumentoTratamientoLink>);
    expect(screen.getByText('heredado').getAttribute('href')).toBe('https://viejo/publico.pdf');
  });
});

describe('ModalTratamiento con receta adjunta', () => {
  async function registrarConReceta(onSubmit: Mock<(data: TratamientoFormData) => Promise<void>>) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ModalTratamiento isOpen onClose={vi.fn()} onSubmit={onSubmit} animalId={ANIMAL} tenantId={TENANT} />
      </QueryClientProvider>,
    );
    const [selectDiagnostico, selectFarmaco] = screen.getAllByRole('combobox');
    await screen.findAllByRole('option', { name: /Oxitetraciclina/ });
    fireEvent.change(selectDiagnostico, { target: { value: PAD } });
    fireEvent.change(selectFarmaco, { target: { value: MED } });
    fireEvent.change(screen.getByPlaceholderText('ej. 20 ml, 1 jeringa'), { target: { value: '20 ml' } });
    fireEvent.change(document.getElementById('document-upload')!, { target: { files: [pdf()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar Tratamiento' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  }

  it('sube al bucket privado y envía la ruta, no una URL pública', async () => {
    const onSubmit = vi.fn<(data: TratamientoFormData) => Promise<void>>().mockResolvedValue(undefined);
    await registrarConReceta(onSubmit);

    expect(storage.bucket).toBe('animal_docs');
    const ruta = storage.upload.mock.calls[0][0] as string;
    expect(ruta).toMatch(RUTA);
    expect(onSubmit.mock.calls[0][0].documentoUrl).toBe(ruta);
  });

  it('si la API rechaza el registro (4xx) retira el archivo subido', async () => {
    const onSubmit = vi.fn<(data: TratamientoFormData) => Promise<void>>().mockRejectedValue(new ApiError('Datos inválidos', 400));
    await registrarConReceta(onSubmit);

    await waitFor(() => expect(storage.remove).toHaveBeenCalledWith([storage.upload.mock.calls[0][0]]));
    expect(await screen.findByText('Datos inválidos')).toBeDefined();
  });

  it('tras un error 5xx conserva el archivo porque el registro pudo guardarse', async () => {
    const onSubmit = vi.fn<(data: TratamientoFormData) => Promise<void>>().mockRejectedValue(new ApiError('Error del servidor', 500));
    await registrarConReceta(onSubmit);

    await screen.findByText('Error del servidor');
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
