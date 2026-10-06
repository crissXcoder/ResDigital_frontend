This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
