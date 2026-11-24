---
name: Convenciones Next.js 16
description: Usar antes de escribir o revisar código de Next.js 16 en este repo (rutas, params, proxy, Server Actions, caché y Route Handlers).
---

# Next.js 16 en este proyecto

Esta versión tiene cambios que no están en los datos de entrenamiento. Antes de
escribir código, lee la guía correspondiente en `node_modules/next/dist/docs/`
(está en la raíz del repo). No inventes APIs: si algo no aparece en esos docs,
repórtalo en vez de suponer.

`next dev` reescribe el bloque de reglas en `AGENTS.md`; no lo borres ni lo
muevas.

## Reglas del proyecto

- Server Components por defecto; `"use client"` solo cuando haga falta
  interacción.
- UI en español, tuteo neutro, mobile-first a **360 px**.
- TypeScript estricto: sin `any` nuevos ni `@ts-ignore` sin justificar.
- Antes de terminar: `npm run lint`, `npm run typecheck` y `npm run test`.
  Si cambiaste una ruta, agrega `npm run build`.

## Rutas dinámicas y props

`params` y `searchParams` son `Promise`. En un Server Component:

```tsx
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
}
```

En un Client Component se usa `use(params)` o `useParams()`. Para tipos existen
`PageProps<'/ruta'>`, `LayoutProps<'/ruta'>` y `RouteContext<'/ruta'>`.

`cookies()`, `headers()` y `draftMode()` también son asíncronos:
`const store = await cookies()`.

Docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`.

## Proxy (antes middleware)

En Next 16 el middleware se llama **Proxy**. Va en un único `proxy.ts` en la
raíz o en `src/`, con export `proxy` (o default) y `export const config = { matcher }`.

- No lo uses como autorización definitiva ni para manejar sesiones: sirve para
  chequeos optimistas (redirigir a login), pero la autorización real va en la
  capa de datos (RPC o Server Action que valida `auth.uid()`).
- `use cache` y `use server` no tienen efecto dentro del proxy.
- No hace fetch lento ni caché de `fetch`.

Docs: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.

## Server Actions

- Directiva `"use server"`; en este proyecto viven en `src/actions/`.
- Se despachan de una en una por cliente: no paralelices varias acciones con
  `Promise.all`.
- Trata cada acción como entrada no confiable: autentica, autoriza y valida
  `FormData` dentro, aunque la UI solo la muestre a usuarios válidos.
- `redirect()` lanza una excepción de control: déjalo fuera de `try/catch`.
- Si necesitas revalidar, hazlo antes de `redirect()`.
- Devuelve solo lo que la UI necesita, no filas crudas de la base.

Docs: `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`.

## Caché y renderizado

`cacheComponents` está **desactivado a propósito** (ver el comentario en
`next.config.ts`). No uses la directiva `use cache`.

Para páginas que leen Supabase o cookies en cada petición (`/`, `/cita/[token]`,
`/admin`), marca explícitamente:

```ts
export const dynamic = "force-dynamic";
```

Docs: `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`.

## Route Handlers

Para respuestas que no son HTML (por ejemplo el `.ics` de una cita) usa
`route.ts` con `NextResponse`. Si el dato es personal, agrega
`Cache-Control: no-store`. Docs:
`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`.

## Estados de UI

Cada ruta con datos debe cubrir cargando, vacío y error, con textos en español
y sin códigos técnicos. Usa `loading.tsx`, `error.tsx` y `not-found.tsx` cuando
correspondan.

## Checklist

- [ ] Leí la guía relevante en `node_modules/next/dist/docs/`.
- [ ] `params`, `searchParams`, `cookies()` y `headers()` con `await`.
- [ ] Si hace falta lógica por petición, `proxy.ts` (no middleware).
- [ ] Autorización real en la capa de datos, no solo en la UI.
- [ ] `dynamic = "force-dynamic"` en páginas con datos por petición.
- [ ] Probado a 360 px y con estados cargando/vacío/error.
- [ ] `lint` + `typecheck` + `test` (+ `build` si cambié rutas).
