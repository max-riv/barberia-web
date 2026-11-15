# Ficha del negocio

Datos reales de Charlie's Barbershop. **Los agentes no inventan datos**: si algo
falta aquí, se pregunta antes de escribir código o de cambiarlo en el seed.

## Identidad

| Campo            | Valor                                  |
| ---------------- | -------------------------------------- |
| Nombre           | Charlie's Barbershop                   |
| Slug             | `charlies-barbershop`                  |
| Dirección        | Pendiente de confirmar                 |
| Zona horaria     | `America/Costa_Rica` (UTC−6, sin DST)  |
| Moneda           | CRC (colones costarricenses)           |
| WhatsApp público | `+506 8767 7997` → `wa.me/50687677997` |
| Email del panel  | `rmax67157@gmail.com` (provisional)    |

El número de WhatsApp lo genera el cliente al confirmar su cita, así que **queda
público** en la web. Es el número personal de momento; para producción conviene
uno del barbero o de WhatsApp Business. Se cambia en la tabla `businesses`, sin
tocar código.

El email del panel es solo el identificador del usuario de Supabase Auth. No es
necesario registrarse en ningún sitio: el usuario se crea desde el dashboard y
la contraseña se define ahí (Fase 1.4).

## Servicios

| Servicio | Duración | Precio | `price_cents` |
| -------- | -------- | ------ | ------------- |
| Corte    | 30 min   | ₡6.000 | `600000`      |

Un solo servicio activo en la Fase 1. El modelo (`services`) admite más
servicios y otras duraciones sin cambiar el esquema.

## Horario

Miércoles cerrado. El resto de días, dos tramos con un descanso al mediodía:

| Día       | Tramos                    |
| --------- | ------------------------- |
| Lunes     | 08:00–12:00 · 13:00–18:00 |
| Martes    | 08:00–12:00 · 13:00–18:00 |
| Miércoles | Cerrado                   |
| Jueves    | 08:00–12:00 · 13:00–18:00 |
| Viernes   | 08:00–12:00 · 13:00–18:00 |
| Sábado    | 08:00–12:00 · 13:00–18:00 |
| Domingo   | 08:00–12:00 · 13:00–18:00 |

- El descanso `12:00–13:00` se modela como el hueco entre los dos tramos de
  `working_hours`; no existe como tabla aparte.
- 18 espacios de 30 minutos por día, 108 por semana.
- El barbero todavía no está seguro del horario exacto. Cambiarlo es editar
  `working_hours` (Fase 1.5 tendrá la UI); no requiere deploy.

## Reglas de reserva

| Regla                   | Valor                                      |
| ----------------------- | ------------------------------------------ |
| Duración del bloque     | 30 min, alineado a `:00` y `:30`           |
| Antelación mínima       | 1 hora                                     |
| Máximo hacia adelante   | 30 días                                    |
| Datos del cliente       | Nombre y teléfono obligatorios             |
| Teléfono                | Normalizado a E.164 (`+506XXXXXXXX`)       |
| Cancelación del cliente | Con su enlace, hasta el inicio de la cita  |
| Doble reserva           | Imposible: `EXCLUDE USING gist` en la base |

## Identificadores fijos del seed

Sirven para pruebas y para la verificación de la base de datos. No cambiar sin
actualizar `scripts/db-smoke-test.mjs`.

| Entidad  | UUID                                   |
| -------- | -------------------------------------- |
| Negocio  | `00000000-0000-4000-8000-000000000001` |
| Barbero  | `00000000-0000-4000-8000-000000000002` |
| Servicio | `00000000-0000-4000-8000-000000000003` |

## Pendiente de confirmar

- Dirección del local (para la página y el mensaje de WhatsApp).
- Si el descanso es realmente `12:00–13:00`.
- Si el domingo abre de verdad.
