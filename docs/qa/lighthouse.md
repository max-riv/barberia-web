# Auditoría Lighthouse — Fase 1.6

- **Fecha:** 2026-11-25
- **URL medida:** https://barberia-web.netlify.app (producción)
- **Método:** Lighthouse (CLI local, Chromium vía Microsoft Edge, perfil móvil).
- **Objetivo del plan:** "Responsive y Lighthouse móvil ≥ 90".

## Resultado

| Categoría      | Puntuación | ¿≥ 90? |
| -------------- | ---------: | ------ |
| Performance    |         93 | ✅     |
| Accessibility  |        100 | ✅     |
| Best practices |        100 | ✅     |
| SEO            |        100 | ✅     |

**El criterio queda cumplido**: las cuatro categorías están en ≥ 90, con
Performance en 93. No se requieren cambios de código para alcanzar el objetivo.

## Oportunidades detectadas (no bloqueantes)

Lighthouse señala 9 auditorías por debajo del ideal. Las más relevantes:

| Auditoría                                           | Valor       | Comentario                           |
| --------------------------------------------------- | ----------- | ------------------------------------ |
| `server-response-time` / `document-latency-insight` | TTFB ~4.0 s | Documento raíz lento                 |
| `speed-index`                                       | 6.9 s       | Derivado de la latencia del servidor |
| `lcp-breakdown-insight`                             | —           | LCP dominado por el TTFB             |
| `unused-javascript`                                 | ~28 KiB     | Runtime de Next.js                   |
| `legacy-javascript-insight`                         | ~13 KiB     | Polyfills de Next.js                 |
| `render-blocking-insight`                           | —           | Recursos de arranque                 |
| `cache-insight`                                     | ~11 KiB     | Cabeceras de caché                   |
| `bf-cache`                                          | —           | Restauración back/forward            |

### Nota sobre el TTFB (decisión de diseño)

El TTFB alto (~4 s) viene de que las páginas públicas usan
`export const dynamic = "force-dynamic"`: cada petición consulta Supabase en el
servidor para mostrar siempre los datos reales del negocio (horarios, precios,
bloqueos) **sin necesidad de redesplegar**, tal como exige la Fase 1.5.

Bajar ese TTFB implicaría introducir caché (ISR con `revalidate`), lo que haría
que los cambios del panel tardaran en verse en lugar de ser inmediatos. Es un
**trade-off deliberado**: se prioriza que el barbero vea sus cambios al instante
frente a unos milisegundos de TTFB. Performance sigue en 93, por encima del
objetivo.

Si en el futuro se quiere más margen, la palanca es una caché corta
(`revalidate = 30`) en las páginas públicas — candidata a Fase 2, no a esta
fase.

## Responsive (360 px)

Las vistas nuevas (`/admin/horarios`, `/admin/ajustes`) se construyeron
mobile-first a 360 px y fueron verificadas en la Fase 1.5. El flujo público se
re-verifica a 360 px dentro de los E2E de esta fase.
