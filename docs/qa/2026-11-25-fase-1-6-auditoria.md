# Auditoría QA · Fase 1.6 — Endurecimiento y entrega

Fecha: 2026-11-25 · Agente: QA · Alcance: flujo público E2E y cierre de fase.

## Resultado: APTO

El criterio E2E queda implementado y ejecutado en verde, incluida la variante a
360 px. No se encontraron fallos bloqueantes ni importantes en el alcance
automatizado. La puesta en operación de los workflows y el tag `v1.0.0`
requieren acciones manuales explícitas, detalladas al final; no se presentan
como ejecutadas.

### Bloqueantes

Ninguno.

### Importantes

Ninguno.

### Menores

- [src/app/layout.tsx:26; src/app/globals.css:20] Next.js 16.4.6 muestra en el
  navegador de desarrollo el aviso `missing-data-scroll-behavior`: recomienda
  `data-scroll-behavior="smooth"` en `<html>`. No produjo errores de consola que
  abortaran el flujo, ni afectó al build, a la reserva o al viewport de 360 px.
- [src/app/layout.tsx:11] La descripción metadata dice «en bloques de sin crear
  cuenta»: falta la duración entre «de» y «sin». Es un defecto de copy/SEO, no
  del flujo transaccional ni de los criterios medidos por Lighthouse.
- [.github/workflows/anti-pausa.yml:10] El cron `0 12 */6 * *` se ejecuta los
  días 1, 7, 13, 19 y 25 de cada mes, no cada seis días naturales de forma
  continua. Tras un mes de 31 días puede haber siete días entre el día 25 y el
  día 1 siguiente, sin margen frente a la pausa por siete días de inactividad.
  El YAML es válido, pero conviene reducir ese intervalo; su eficacia real
  queda pendiente de verificación operativa.

### Entrega E2E

Archivo añadido: `tests/e2e/booking.spec.ts`. Contiene dos pruebas completas,
sin `test.skip` ni `test.fixme`:

1. Escritorio: `/` comprueba Charlie's Barbershop, Corte, 30 min y ₡6.000;
   navega a `/reservar`, comprueba días y espacios, toma el primer espacio
   ofrecido, envía nombre y teléfono, verifica `/cita/[token]`, estado
   **Confirmada**, hora, servicio, cliente y teléfono; cancela en dos pasos,
   verifica **Cancelada** y recarga para comprobar persistencia.
2. Móvil (`360 × 800`): repite el flujo completo con controles reales y
   comprueba en landing, formulario, confirmación y cancelación que
   `document.documentElement.scrollWidth <= clientWidth`; no hay desbordamiento
   horizontal de la página.

Robustez incorporada:

- Teléfono válido y único por flujo, derivado de `Date.now()` y validado con
  `^[678]\d{7}$` (`tests/e2e/booking.spec.ts:15-18`).
- Esperas mediante aserciones y `expect.poll`, sin sleeps fijos.
- Si el espacio se ocupa antes de mostrar el formulario o al enviarlo, se vuelve
  a `/reservar` y se intenta con otro, hasta tres intentos
  (`tests/e2e/booking.spec.ts:172-245`). La ejecución final no necesitó activar
  este reintento; no se afirma que se haya inducido un conflicto real.
- Las alertas se consultan dentro de `#datos` para no confundir el anunciador
  accesible de rutas de Next con un error de la reserva.

### Comandos ejecutados

| Comando                | Resultado final                                                              |
| ---------------------- | ---------------------------------------------------------------------------- |
| `npx playwright test`  | ✓ 2/2; escritorio y 360 px; reserva real cancelada en ambos                  |
| `npm run lint`         | ✓ sin errores ni avisos                                                      |
| `npm run typecheck`    | ✓ TypeScript estricto, sin errores                                           |
| `npm run test`         | ✓ 4 archivos, 58/58 Vitest                                                   |
| `npm run test:db`      | ✓ 28/28 contra Supabase                                                      |
| `npm run audit:rls`    | ✓ 44/44 con la clave pública; reporte regenerado en `docs/qa/rls-audit.md`   |
| `npm run build`        | ✓ compilación y TypeScript; `/`, `/reservar` y `/cita/[token]` dinámicos (ƒ) |
| `npm run format`       | ✓ Prettier aplicado                                                          |
| `npm run format:check` | ✓ todos los archivos con estilo Prettier                                     |

Los E2E se ejecutaron localmente bajo demanda contra `npm run dev` y la base de
`.env.local`, tal como establece `playwright.config.ts`; no se añadieron a CI.

### Reglas de negocio y seguridad comprobadas

La ejecución de `npm run test:db` verificó directamente:

- bloques de 30 minutos, alineados y dentro del horario;
- descanso de 12:00–13:00 y miércoles cerrado;
- rechazo con menos de una hora de antelación;
- rechazo a más de 30 días;
- rechazo de un segundo intento sobre el mismo espacio;
- dos reservas simultáneas del mismo espacio: solo una se crea;
- cancelación con token y liberación del espacio.

La auditoría RLS denegó a `anon` `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre
`appointments`. Al denegarse la tabla, tampoco expone teléfonos ni tokens por
lectura directa. Las RPC administrativas también quedaron denegadas; el resumen
fue 44/44.

### Criterios verificados

- [x] **Auditoría de RLS con la clave pública** — verificado automáticamente por
      esta ejecución: `npm run audit:rls`, 44/44. Evidencia:
      `docs/qa/rls-audit.md`.
- [x] **Responsive y Lighthouse móvil ≥ 90** — responsive verificado
      automáticamente con el flujo E2E completo a 360 px y sin overflow.
      Lighthouse consta en `docs/qa/lighthouse.md` con **93/100/100/100**
      (Performance/Accessibility/Best practices/SEO), medición realizada por el
      líder; QA no repitió esa medición.
- [x] **E2E Playwright del flujo completo** — verificado automáticamente:
      `tests/e2e/booking.spec.ts`, 2/2 en la ejecución final, desde landing
      hasta cancelación persistida.
- [x] **Definición de backup semanal y ping anti-pausa** — los dos YAML fueron
      procesados por Prettier sin cambios y `format:check` pasó, por lo que su
      sintaxis es válida. No se ejecutaron los workflows ni se validó su
      eficacia operativa; véase la observación menor sobre el cron.
- [x] **Documentación de operación** — revisados `docs/operacion.md` y
      `README.md`: incluyen variables públicas, migraciones, backups,
      restauración, anti-pausa, incidentes y comandos de verificación.
- [ ] **Ejecución operativa del backup y del anti-pausa** — requiere acción del
      usuario; no verificada automáticamente.
- [ ] **Tag `v1.0.0`** — pendiente del líder al cierre; no se hizo commit, push
      ni tag desde QA.

### Verificación manual pendiente del usuario

1. Crear en GitHub Actions el secret `SUPABASE_ACCESS_TOKEN` con los permisos
   descritos en `docs/operacion.md`. El workflow de backup no puede funcionar
   sin ese paso.
2. Ejecutar manualmente **Backup semanal de Supabase** y confirmar que termina
   en verde y publica `backup-schema.sql` y `backup-data.sql` en el artifact.
   Idealmente, validar la restauración en un proyecto separado antes de
   depender del backup.
3. Ejecutar manualmente **Anti-pausa Supabase** o esperar una ejecución
   programada y comprobar que `/api/health` responde `"database":"ok"`.
   Valorar el ajuste del cron señalado arriba para no llegar al límite de siete
   días.
4. Tras incorporar estos resultados, el líder debe crear el tag `v1.0.0` y
   actualizar los checkboxes de `docs/plan.md`; QA no modificó ese archivo.
