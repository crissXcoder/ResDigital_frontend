# ResDigital — Frontend

Interfaz web de **ResDigital**, cuaderno de campo digital para trazabilidad, sanidad, reproducción y producción lechera de pequeños y medianos ganaderos de Costa Rica.

> Necesita la API del repositorio `backend` corriendo para mostrar datos. Ver su README.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js (App Router) + React 19 + TypeScript |
| Estilos | Tailwind CSS 4 + componentes tipo shadcn/ui (Radix) |
| Datos | TanStack Query; formularios con TanStack Form y Zod |
| Autenticación | Supabase Auth (`@supabase/ssr`); el inicio de sesión nunca pasa por contraseñas propias |
| Gráficos y reportes | Recharts, jsPDF (expedientes y reportes en PDF), códigos QR |
| Pruebas | Vitest + Testing Library; e2e con Playwright |
| Gestor de paquetes | pnpm 10.32.1, Node `>=24.14 <25` |

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   pnpm install
   ```

2. Crear el archivo de entorno a partir del ejemplo:

   ```bash
   cp .env.example .env.local
   ```

   Variables (los valores reales los entrega el equipo; **nunca** se suben al repositorio):

   | Variable | Para qué sirve |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública de Supabase |
   | `NEXT_PUBLIC_BACKEND_URL` | URL de la API (en local, `http://localhost:3001`) |
   | `NEXT_PUBLIC_SUPABASE_BUCKET_DOCUMENTOS`, `..._ANIMAL_DOCS`, `..._ANIMALES_FOTOS` | Buckets de Storage para documentos y fotos |

3. Levantar la API del backend (puerto 3001) y luego la interfaz:

   ```bash
   pnpm dev
   ```

   Abrir `http://localhost:3000`.

4. Versión de producción local (la que se usó para medir con Lighthouse):

   ```bash
   pnpm build
   pnpm start
   ```

## Uso rápido

1. Entrar a `/login` con un usuario de la finca, o registrar una finca nueva en `/registro`. Los usuarios demo del seed están descritos en el README del backend.
2. El propietario o administrador invita a más personas desde la sección de equipo y les asigna un rol: `propietario`, `administrador`, `peon` o `veterinario`.
3. Flujo principal: dar de alta animales en **Hato ganadero**, registrar servicio, diagnóstico y parto en **Reproducción**, tratamientos en la ficha del animal, y litros en **Producción lechera**. La leche producida bajo retiro sanitario se registra como descarte.

## Estructura

```
app/(dashboard)/   Panel principal, hato, reproductivo, producción, potreros, reportes, QR, equipo
app/               Login, registro, invitaciones, recuperación de contraseña, términos y privacidad
components/        UI, modales, formularios y paneles por módulo
lib/api/           Cliente de la API y tipos generados desde OpenAPI
lib/supabase/      Clientes de Supabase (navegador, servidor y middleware)
lib/reportes/      Generación de PDF
tests/  e2e/       Pruebas unitarias/de componente y e2e
```

## Pruebas y calidad

```bash
pnpm test          # Vitest
pnpm test:e2e      # Playwright
pnpm typecheck     # tipos
pnpm lint          # ESLint
pnpm openapi:check # el contrato del backend coincide con los tipos
```

## Idioma, moneda y fechas

La interfaz está en español (`lang="es"`). Los montos se muestran en colones (₡) y las fechas se manejan por día civil en la zona `America/Costa_Rica` (UTC−6) para evitar corrimientos de un día. No hay selector de idioma ni de moneda todavía.

## Git y CI

- `main` y `dev` reciben cambios por PR, con revisión de otro integrante, CODEOWNERS y todos los checks requeridos.
- Node `24.14.x` y pnpm `10.32.1` son las versiones fijadas. No se añaden dependencias para estas barreras.
- `pnpm git:setup-hooks` configura hooks solo en este clon; no corre automáticamente. El pre-commit escanea el index con Gitleaks y bloquea si no logra validar.
- `pnpm git:workflows` valida el formato de workflows y referencias a Actions fijadas por SHA. Las herramientas se guardan en el directorio Git y se validan mediante SHA-256.
- CI verifica título y plantilla del PR, secretos, dependencias, lint, tipos, pruebas, build y sintaxis/seguridad de workflows. Un check agregador falla si algún job falla o se omite.
- Dependabot propone actualizaciones semanalmente. No se fusionan automáticamente.
- Los tags de release requieren formato y versión coincidente, commit presente en `main` y check requerido aprobado; CI solo crea un borrador de release.
- CD de aplicación queda pendiente hasta que se definan entornos, secretos, aprobadores y rollback.

Ver plan operativo y procedimiento de aplicación de rulesets en la bóveda ResDigital: `00-Sistema/Git-y-Entrega.md`.
