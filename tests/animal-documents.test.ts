import { describe, expect, it, vi } from 'vitest';
const storageMocks = vi.hoisted(() => ({
  from: vi.fn(),
  upload: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: storageMocks.from } }),
}));
import {
  createAnimalDocumentPath,
  getAnimalDocumentExtension,
  MAX_ANIMAL_DOCUMENT_BYTES,
  uploadAnimalDocument,
} from '@/lib/supabase/animal-documents';

function createFile(name: string, type: string, size = 1): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('documentos privados del expediente animal', () => {
  it('sube al bucket privado con MIME explícito y sin reemplazar objetos', async () => {
    storageMocks.from.mockReturnValue({ upload: storageMocks.upload });
    storageMocks.upload.mockResolvedValue({ error: null });
    const file = createFile('foto.jpeg', 'image/jpeg');

    await uploadAnimalDocument('tenant/animal/fotografia/id.jpg', file);

    expect(storageMocks.from).toHaveBeenCalledWith('animal_docs');
    expect(storageMocks.upload).toHaveBeenCalledWith('tenant/animal/fotografia/id.jpg', file, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  });

  it('acepta PDF, PNG, JPG y normaliza JPEG al formato permitido por Storage', () => {
    expect(getAnimalDocumentExtension(createFile('doc.pdf', 'application/pdf'))).toBe('pdf');
    expect(getAnimalDocumentExtension(createFile('foto.png', 'image/png'))).toBe('png');
    expect(getAnimalDocumentExtension(createFile('foto.jpg', 'image/jpeg'))).toBe('jpg');
    expect(getAnimalDocumentExtension(createFile('foto.jpeg', 'image/jpeg'))).toBe('jpg');
  });

  it('rechaza tipos no permitidos y MIME que no corresponde con la extensión', () => {
    expect(() => getAnimalDocumentExtension(createFile('foto.webp', 'image/webp'))).toThrow(/PDF, PNG o JPG/);
    expect(() => getAnimalDocumentExtension(createFile('foto.png', 'image/jpeg'))).toThrow(/no coincide/);
  });

  it('rechaza archivos vacíos y mayores a 10 MiB, pero acepta el límite exacto', () => {
    expect(() => getAnimalDocumentExtension(createFile('vacio.jpg', 'image/jpeg', 0))).toThrow(/mayor que 0/);
    expect(() => getAnimalDocumentExtension(createFile('grande.pdf', 'application/pdf', MAX_ANIMAL_DOCUMENT_BYTES + 1))).toThrow(/10 MiB/);
    expect(getAnimalDocumentExtension(createFile('limite.pdf', 'application/pdf', MAX_ANIMAL_DOCUMENT_BYTES))).toBe('pdf');
  });

  it('genera una ruta canónica privada por finca y animal', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('33333333-3333-4333-8333-333333333333');
    const path = createAnimalDocumentPath(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      'Fotografía',
      createFile('foto.jpeg', 'image/jpeg'),
    );

    expect(path).toBe('11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/fotografia/33333333-3333-4333-8333-333333333333.jpg');
    vi.restoreAllMocks();
  });
});
