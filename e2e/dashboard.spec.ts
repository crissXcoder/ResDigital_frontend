import { test, expect } from '@playwright/test';

/**
 * Prueba E2E — MOD-04 Dashboard + Motor de Alertas (Karla)
 *
 * Flujo completo definido en la bitácora técnica de la bóveda (Karla-STATE.md):
 * 1. Carga del Dashboard con renderizado de los 4 KPIs principales y widgets.
 * 2. Interacción con la campana de alertas activas.
 * 3. Sección de Acciones Rápidas:
 *    - Click en "Registrar Tratamiento Médico" → apertura del selector modal de animales.
 *    - Búsqueda reactiva de animal por nombre/arete.
 *    - Selección del animal y apertura directa del formulario oficial (ModalTratamiento).
 * 4. Filtro biológico en "Nuevo Evento Reproductivo":
 *    - Verificación de que el selector modal excluya a los machos.
 *    - Apertura del formulario de servicio (ModalServicio).
 */

const ANIMALES_MOCK_API = [
  {
    id: 'anim-1',
    tenantId: 'tenant-test',
    areteInterno: '#104',
    nombre: 'Canela',
    categoria: 'Vaca en Ordeño',
    sexo: 'Hembra',
    activo: true,
    razaId: 'raza-1',
  },
  {
    id: 'anim-2',
    tenantId: 'tenant-test',
    areteInterno: '#019',
    nombre: 'Titán',
    categoria: 'Semental/Reproductor',
    sexo: 'Macho',
    activo: true,
    razaId: 'raza-1',
  },
  {
    id: 'anim-3',
    tenantId: 'tenant-test',
    areteInterno: '#087',
    nombre: 'Estrella',
    categoria: 'Vaca en Ordeño',
    sexo: 'Hembra',
    activo: true,
    razaId: 'raza-1',
  },
  {
    id: 'anim-4',
    tenantId: 'tenant-test',
    areteInterno: '#999',
    nombre: 'BajaTest',
    categoria: 'Vaca Seca',
    sexo: 'Hembra',
    activo: false, // Inactiva
    razaId: 'raza-1',
  },
];

test.beforeEach(async ({ context, page }, testInfo) => {
  const role = testInfo.title.match(/AUTH-T002 role: (\w+)/)?.[1] ?? 'propietario';
  // Inyectar cookie de sesión de prueba para pasar el middleware de autenticación
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: 'playwright.test.token',
    refresh_token: 'playwright.test.refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: `${role}-test`,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${role}@example.test`,
      app_metadata: { rol: role, tenant_id: 'tenant-test' },
      user_metadata: { nombre_completo: `Usuario ${role} de prueba` },
    },
  };
  await context.addCookies([
    {
      name: 'playwright_test_session',
      value: 'true',
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'sb-jchrtqgzvidlcezzhols-auth-token',
      value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
      domain: 'localhost',
      path: '/',
    },
  ]);

  await page.route('**/auth/perfil', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: `${role}-test`,
        tenantId: 'tenant-test',
        rol: role,
        nombreCompleto: `Usuario ${role} de prueba`,
        correo: `${role}@example.test`,
        nombreFinca: 'Finca de prueba',
      }),
    });
  });

  // Interceptar llamadas a la API de backend para que la prueba sea determinista y aislada
  await page.route('**/animales*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ANIMALES_MOCK_API),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/catalogos/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/reproductivo/proximos-eventos*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
});

for (const role of ['propietario', 'administrador', 'peon', 'veterinario']) {
  test(`AUTH-T002 role: ${role}: permisos visibles de acciones y documentos`, async ({ page }) => {
    await page.goto('/dashboard');
    for (const action of ['tratamiento', 'reproductivo']) {
      await expect(page.getByTestId(`accion-rapida-${action}`)).toBeEnabled();
    }
    const milkAction = page.getByTestId('accion-rapida-leche');
    if (role === 'veterinario') await expect(milkAction).toBeDisabled();
    else await expect(milkAction).toBeEnabled();

    const animalId = `auth-role-${role}`;
    await page.route(`**/animales/${animalId}*`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      const body = path.endsWith('/documentos') ? [] : {
        id: animalId,
        tenantId: 'tenant-test',
        nombre: 'Animal autorizado',
        areteInterno: 'AUTH-001',
        sexo: 'Hembra',
        razaId: 'raza-test',
        fechaNacimiento: '2020-01-01',
        categoria: 'Vaca',
        activo: true,
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.route(`**/pesajes/${animalId}*`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.route(`**/tratamientos/animal/${animalId}*`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.goto(`/hato/${animalId}`);
    await page.getByRole('button', { name: 'Documentos', exact: true }).click();
    const uploadButton = page.getByRole('button', { name: 'Agregar Documento' });
    if (role === 'propietario' || role === 'administrador') {
      await expect(uploadButton).toBeVisible();
    } else {
      await expect(uploadButton).toHaveCount(0);
    }
  });
}

test('CORE-T004: no borra un archivo si la respuesta del registro puede haberse perdido tras el commit', async ({ page }) => {
  const animalId = 'animal-upload-timeout-test';
  let deleteRequests = 0;
  page.on('dialog', dialog => dialog.accept());
  await page.route(`**/animales/${animalId}/documentos`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Respuesta incierta"}' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
  });
  await page.route(`**/animales/${animalId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: animalId,
        tenantId: 'tenant-test',
        nombre: 'Animal de prueba',
        areteInterno: 'UPLOAD-001',
        sexo: 'Hembra',
        razaId: 'raza-test',
        fechaNacimiento: '2020-01-01',
        categoria: 'Vaca',
        activo: true,
      }),
    });
  });
  await page.route('**/storage/v1/object/animal_docs/**', async (route) => {
    if (route.request().method() === 'DELETE') deleteRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'synthetic' }) });
  });
  await page.goto(`/hato/${animalId}`);
  await page.getByRole('button', { name: 'Documentos', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar Documento' }).click();
  await page.locator('input[list="docTypes"]').fill('Certificado de Prueba');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'prueba.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nfixture'),
  });
  await page.getByRole('button', { name: 'Guardar Documento' }).click();
  await expect.poll(() => deleteRequests).toBe(0);
});

test.describe('Dashboard MOD-04 — Flujo principal de usuario', () => {
  test('debe cargar el Dashboard con los 4 KPIs principales y widgets', async ({ page }) => {
    await page.goto('/dashboard');

    // Verificar encabezado principal
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    await expect(page.getByText('Vistazo rápido del estado del hato y las alertas activas.')).toBeVisible();

    // Verificar los 4 KPIs del diseño
    await expect(page.getByText(/Total de hato activo/i)).toBeVisible();
    await expect(page.getByText(/Vacas en ordeño/i)).toBeVisible();
    await expect(page.getByText(/Gestantes confirmadas/i)).toBeVisible();
    await expect(page.getByText('Alertas activas', { exact: true })).toBeVisible();

    // Verificar secciones de Semáforo Sanitario y Calendario Reproductivo
    await expect(page.getByText('Semáforo de Retiro Sanitario')).toBeVisible();
    await expect(page.getByText('Calendario Reproductivo')).toBeVisible();

    // Verificar sección de Acciones Rápidas
    await expect(page.getByRole('heading', { name: 'Acciones Rápidas' })).toBeVisible();
  });

  test('debe abrir la campana de notificaciones y mostrar alertas activas', async ({ page }) => {
    await page.goto('/dashboard');

    // Botón de notificaciones
    const botonCampana = page.getByRole('button', { name: 'Notificaciones' });
    await expect(botonCampana).toBeVisible();
    await botonCampana.click();

    // Dropdown de alertas
    await expect(page.getByRole('heading', { name: 'Alertas Activas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar' })).toBeVisible();

    // Cerrar el menú desplegable
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('heading', { name: 'Alertas Activas' })).not.toBeVisible();
  });

  test('flujo Acciones Rápidas: Registrar Tratamiento → Buscar Animal → Abrir Formulario Modal', async ({ page }) => {
    await page.goto('/dashboard');

    // 1. Click en la tarjeta de Acción Rápida "Registrar Tratamiento Médico"
    await page.getByRole('button', { name: /Registrar Tratamiento Médico/i }).click();

    // 2. Comprobar que se abre el modal selector de animales
    const selectorModal = page.locator('div.fixed.inset-0').filter({ hasText: /Seleccionar Animal para Tratamiento/i });
    await expect(selectorModal).toBeVisible();

    // 3. Probar la búsqueda interactiva
    const inputBusqueda = selectorModal.getByPlaceholder('Buscar por arete, nombre o categoría...');
    await expect(inputBusqueda).toBeVisible();
    await inputBusqueda.fill('Canela');

    // Debe mostrar a Canela dentro del selector y no a Titán
    await expect(selectorModal.getByText('Canela')).toBeVisible();
    await expect(selectorModal.getByText('Titán')).not.toBeVisible();

    // 4. Seleccionar el animal
    await selectorModal.getByRole('button', { name: /Seleccionar →/i }).first().click();

    // 5. Debe cerrarse el selector y abrirse directamente el formulario ModalTratamiento
    await expect(selectorModal).not.toBeVisible();
    const modalTratamiento = page.locator('div.fixed.inset-0').filter({ hasText: /Registrar Tratamiento Veterinario/i });
    await expect(modalTratamiento.getByRole('heading', { name: 'Registrar Tratamiento Veterinario' })).toBeVisible();
    await expect(modalTratamiento.getByText(/Fármaco \*/i)).toBeVisible();
    const fechaCostaRica = await page.evaluate(() =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Costa_Rica',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    );
    await expect(modalTratamiento.locator('input[type="date"]')).toHaveValue(
      fechaCostaRica,
    );

    // Cerrar el modal de tratamiento
    await modalTratamiento.getByRole('button', { name: 'Cancelar' }).click();
    await expect(modalTratamiento).not.toBeVisible();
  });

  test('filtro biológico: Evento Reproductivo solo permite seleccionar hembras activas', async ({ page }) => {
    await page.goto('/dashboard');

    // 1. Click en "Nuevo Evento Reproductivo"
    await page.getByRole('button', { name: /Nuevo Evento Reproductivo/i }).click();

    // 2. Verificar título del selector
    const selectorModal = page.locator('div.fixed.inset-0').filter({ hasText: /Seleccionar Hembra para Evento Reproductivo/i });
    await expect(selectorModal).toBeVisible();

    // 3. Titán (Macho) y BajaTest (Inactiva) NUNCA deben aparecer en el selector
    await expect(selectorModal.getByText('Titán')).not.toBeVisible();
    await expect(selectorModal.getByText('BajaTest')).not.toBeVisible();

    // Canela y Estrella (Hembras activas) sí deben aparecer
    await expect(selectorModal.getByText('Canela')).toBeVisible();
    await expect(selectorModal.getByText('Estrella')).toBeVisible();

    // 4. Seleccionar a Canela
    await selectorModal.getByRole('button', { name: /Seleccionar →/i }).first().click();

    // 5. Debe abrirse el formulario de servicio reproductivo
    await expect(selectorModal).not.toBeVisible();
    const modalServicio = page.locator('div.fixed.inset-0').filter({ hasText: /Registrar Celo \/ Servicio/i });
    await expect(modalServicio.getByRole('heading', { name: 'Registrar Celo / Servicio' })).toBeVisible();
    await expect(modalServicio.getByText(/Tipo de Servicio/i)).toBeVisible();

    // Cerrar modal
    await modalServicio.getByRole('button', { name: 'Cancelar' }).click();
    await expect(modalServicio).not.toBeVisible();
  });

  test('el expediente conserva DateOnly y el PDF usa hoy de Costa Rica', async ({ page }) => {
    const animalId = 'animal-date-test';
    await page.route('**/animales/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === `/animales/${animalId}`) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: animalId,
            tenantId: 'tenant-test',
            nombre: 'Fecha Civil',
            areteInterno: 'DATE-001',
            sexo: 'Hembra',
            razaId: 'raza-test',
            fechaNacimiento: '2020-01-01',
            categoria: 'Vaca',
            activo: true,
          }),
        });
      } else if (path.endsWith('/estado-reproductivo')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ animalId, sexo: 'Hembra', estadoActual: 'Vacía' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });
    await page.route('**/pesajes/**', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.route('**/tratamientos/animal/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      const body = path.endsWith('/estado-sanitario')
        ? {
            animalId,
            enRetiro: false,
            liberacionLeche: null,
            liberacionCarne: null,
            diasRestantesLeche: 0,
            diasRestantesCarne: 0,
            tratamientoReferencia: null,
          }
        : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.goto(`/hato/${animalId}`);
    await expect(page.getByText('01/01/2020', { exact: true })).toBeVisible();
    const hoyCostaRica = await page.evaluate(() =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Costa_Rica',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    );
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar PDF' }).click();
    expect((await descarga).suggestedFilename()).toBe(
      `Expediente_DATE-001_${hoyCostaRica}.pdf`,
    );
  });
});


test('QA-T004: Hato inicializa por animal, descarta borrador al reabrir y deriva búsqueda URL', async ({ page }) => {
  await page.route('**/potreros', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto('/hato');
  const row = page.getByRole('row').filter({ hasText: 'Canela' });
  await row.getByRole('button').click();
  await page.getByRole('button', { name: 'Editar Datos' }).click();
  const name = page.getByPlaceholder('Ej. Mariposa');
  await expect(name).toHaveValue('Canela');
  await name.fill('Borrador descartado');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await row.getByRole('button').click();
  await page.getByRole('button', { name: 'Editar Datos' }).click();
  await expect(name).toHaveValue('Canela');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const second = page.getByRole('row').filter({ hasText: 'Estrella' });
  await second.getByRole('button').click();
  await page.getByRole('button', { name: 'Editar Datos' }).click();
  await expect(name).toHaveValue('Estrella');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.goto('/hato?buscar=Canela');
  await expect(page.getByPlaceholder('Buscar por arete (#104), nombre o raza...')).toHaveValue('Canela');
  await expect(page.getByRole('row').filter({ hasText: 'Estrella' })).toHaveCount(0);
  await page.goto('/hato?buscar=Estrella');
  await expect(page.getByPlaceholder('Buscar por arete (#104), nombre o raza...')).toHaveValue('Estrella');
  await expect(page.getByRole('row').filter({ hasText: 'Canela' })).toHaveCount(0);
});
