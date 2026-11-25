# Auditoría de RLS con clave pública

Fecha: 2026-11-25T17:57:31.138Z (UTC).

Auditoría ejecutada exclusivamente con `NEXT_PUBLIC_SUPABASE_ANON_KEY` y el rol `anon`; no se utilizó `service_role`.

Las escrituras son intentos no destructivos que deben fallar. Los INSERT contienen valores `NULL` inválidos y los UPDATE/DELETE apuntan a un UUID inexistente para evitar mutaciones incluso ante una concesión incorrecta.

## Tabla `businesses`

| Operación                                             | Esperado                               | Resultado                                                                         | ✓/✗ |
| ----------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- | :-: |
| SELECT columnas públicas (id, name, slug, timezone)   | Permitido; devuelve al menos una fila  | Permitido; 1 fila visible en la muestra                                           |  ✓  |
| INSERT                                                | Error de permiso/RLS, no de validación | Denegado por permiso/RLS: permission denied for table businesses [42501] HTTP 401 |  ✓  |
| UPDATE                                                | Error de permiso/RLS, no de validación | Denegado por permiso/RLS: permission denied for table businesses [42501] HTTP 401 |  ✓  |
| DELETE                                                | Error de permiso/RLS                   | Denegado por permiso/RLS: permission denied for table businesses [42501] HTTP 401 |  ✓  |
| Integridad: conteo antes/después de toda la auditoría | 1 filas antes y después                | Sin cambios: antes=1, después=1                                                   |  ✓  |

## Tabla `barbers`

| Operación                                                        | Esperado                                  | Resultado                                                                      | ✓/✗ |
| ---------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ | :-: |
| SELECT columnas públicas (id, business_id, display_name, active) | Permitido; devuelve al menos una fila     | Permitido; 1 fila visible en la muestra                                        |  ✓  |
| SELECT auth_user_id                                              | Error de permiso por columna no concedida | Denegado por permiso/RLS: permission denied for table barbers [42501] HTTP 401 |  ✓  |
| INSERT                                                           | Error de permiso/RLS, no de validación    | Denegado por permiso/RLS: permission denied for table barbers [42501] HTTP 401 |  ✓  |
| UPDATE                                                           | Error de permiso/RLS, no de validación    | Denegado por permiso/RLS: permission denied for table barbers [42501] HTTP 401 |  ✓  |
| DELETE                                                           | Error de permiso/RLS                      | Denegado por permiso/RLS: permission denied for table barbers [42501] HTTP 401 |  ✓  |
| Integridad: conteo antes/después de toda la auditoría            | 1 filas antes y después                   | Sin cambios: antes=1, después=1                                                |  ✓  |

## Tabla `services`

| Operación                                                | Esperado                               | Resultado                                                                       | ✓/✗ |
| -------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- | :-: |
| SELECT columnas públicas (id, business_id, name, active) | Permitido; devuelve al menos una fila  | Permitido; 1 fila visible en la muestra                                         |  ✓  |
| INSERT                                                   | Error de permiso/RLS, no de validación | Denegado por permiso/RLS: permission denied for table services [42501] HTTP 401 |  ✓  |
| UPDATE                                                   | Error de permiso/RLS, no de validación | Denegado por permiso/RLS: permission denied for table services [42501] HTTP 401 |  ✓  |
| DELETE                                                   | Error de permiso/RLS                   | Denegado por permiso/RLS: permission denied for table services [42501] HTTP 401 |  ✓  |
| Integridad: conteo antes/después de toda la auditoría    | 1 filas antes y después                | Sin cambios: antes=1, después=1                                                 |  ✓  |

## Tabla `working_hours`

| Operación                                                               | Esperado                               | Resultado                                                                            | ✓/✗ |
| ----------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ | :-: |
| SELECT columnas públicas (id, barber_id, weekday, start_time, end_time) | Permitido; devuelve al menos una fila  | Permitido; 1 fila visible en la muestra                                              |  ✓  |
| INSERT                                                                  | Error de permiso/RLS, no de validación | Denegado por permiso/RLS: permission denied for table working_hours [42501] HTTP 401 |  ✓  |
| UPDATE                                                                  | Error de permiso/RLS, no de validación | Denegado por permiso/RLS: permission denied for table working_hours [42501] HTTP 401 |  ✓  |
| DELETE                                                                  | Error de permiso/RLS                   | Denegado por permiso/RLS: permission denied for table working_hours [42501] HTTP 401 |  ✓  |
| Integridad: conteo antes/después de toda la auditoría                   | 12 filas antes y después               | Sin cambios: antes=12, después=12                                                    |  ✓  |

## Tabla `time_off`

| Operación | Esperado                                      | Resultado                                                                       | ✓/✗ |
| --------- | --------------------------------------------- | ------------------------------------------------------------------------------- | :-: |
| SELECT id | Error de permiso; un array vacío no es válido | Denegado por permiso/RLS: permission denied for table time_off [42501] HTTP 401 |  ✓  |
| INSERT    | Error de permiso/RLS, no de validación        | Denegado por permiso/RLS: permission denied for table time_off [42501] HTTP 401 |  ✓  |
| UPDATE    | Error de permiso/RLS, no de validación        | Denegado por permiso/RLS: permission denied for table time_off [42501] HTTP 401 |  ✓  |
| DELETE    | Error de permiso/RLS                          | Denegado por permiso/RLS: permission denied for table time_off [42501] HTTP 401 |  ✓  |

## Tabla `appointments`

| Operación | Esperado                                      | Resultado                                                                           | ✓/✗ |
| --------- | --------------------------------------------- | ----------------------------------------------------------------------------------- | :-: |
| SELECT id | Error de permiso; un array vacío no es válido | Denegado por permiso/RLS: permission denied for table appointments [42501] HTTP 401 |  ✓  |
| INSERT    | Error de permiso/RLS, no de validación        | Denegado por permiso/RLS: permission denied for table appointments [42501] HTTP 401 |  ✓  |
| UPDATE    | Error de permiso/RLS, no de validación        | Denegado por permiso/RLS: permission denied for table appointments [42501] HTTP 401 |  ✓  |
| DELETE    | Error de permiso/RLS                          | Denegado por permiso/RLS: permission denied for table appointments [42501] HTTP 401 |  ✓  |

## Función `get_available_slots(uuid, date)`

| Operación                                      | Esperado                                                 | Resultado                                             | ✓/✗ |
| ---------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------- | :-: |
| EXECUTE con fecha local de Costa Rica +40 días | Ejecutable; devuelve un array vacío, no error de permiso | Ejecutable; devolvió [] para una fecha fuera de rango |  ✓  |

## Función `book_appointment(uuid, uuid, timestamptz, text, text)`

| Operación                            | Esperado                                   | Resultado                                                                  | ✓/✗ |
| ------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------- | :-: |
| EXECUTE con p_starts_at en el pasado | Ejecutable; error de negocio SLOT_TOO_SOON | Ejecutable; error de negocio SLOT_TOO_SOON: SLOT_TOO_SOON [P0001] HTTP 400 |  ✓  |

## Función `cancel_appointment(uuid)`

| Operación                        | Esperado                                           | Resultado                                                                                  | ✓/✗ |
| -------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------ | :-: |
| EXECUTE con token UUID aleatorio | Ejecutable; error de negocio APPOINTMENT_NOT_FOUND | Ejecutable; error de negocio APPOINTMENT_NOT_FOUND: APPOINTMENT_NOT_FOUND [P0001] HTTP 400 |  ✓  |

## Función `normalize_cr_phone(text)`

| Operación | Esperado                                | Resultado                                                                                    | ✓/✗ |
| --------- | --------------------------------------- | -------------------------------------------------------------------------------------------- | :-: |
| EXECUTE   | Error de permiso; anon no tiene EXECUTE | Denegado por permiso/RLS: permission denied for function normalize_cr_phone [42501] HTTP 401 |  ✓  |

## Función `admin_get_agenda(date, date)`

| Operación | Esperado                                            | Resultado                                                                                  | ✓/✗ |
| --------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_get_agenda [42501] HTTP 401 |  ✓  |

## Función `admin_get_appointment(uuid)`

| Operación | Esperado                                            | Resultado                                                                                       | ✓/✗ |
| --------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_get_appointment [42501] HTTP 401 |  ✓  |

## Función `admin_get_slots(date)`

| Operación | Esperado                                            | Resultado                                                                                 | ✓/✗ |
| --------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_get_slots [42501] HTTP 401 |  ✓  |

## Función `admin_create_appointment(uuid, timestamptz, text, text)`

| Operación | Esperado                                            | Resultado                                                                                          | ✓/✗ |
| --------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------- | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_create_appointment [42501] HTTP 401 |  ✓  |

## Función `admin_set_appointment_status(uuid, appointment_status)`

| Operación | Esperado                                            | Resultado                                                                                              | ✓/✗ |
| --------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_set_appointment_status [42501] HTTP 401 |  ✓  |

## Función `admin_set_working_hours(smallint, jsonb)`

| Operación | Esperado                                            | Resultado                                                                                         | ✓/✗ |
| --------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_set_working_hours [42501] HTTP 401 |  ✓  |

## Función `admin_create_time_off(timestamptz, timestamptz, text, boolean)`

| Operación | Esperado                                            | Resultado                                                                                       | ✓/✗ |
| --------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_create_time_off [42501] HTTP 401 |  ✓  |

## Función `admin_list_time_off()`

| Operación | Esperado                                            | Resultado                                                                                     | ✓/✗ |
| --------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_list_time_off [42501] HTTP 401 |  ✓  |

## Función `admin_delete_time_off(uuid)`

| Operación | Esperado                                            | Resultado                                                                                       | ✓/✗ |
| --------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_delete_time_off [42501] HTTP 401 |  ✓  |

## Función `admin_update_business_settings(text, text, text)`

| Operación | Esperado                                            | Resultado                                                                                                | ✓/✗ |
| --------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_update_business_settings [42501] HTTP 401 |  ✓  |

## Función `admin_update_service_price(uuid, integer)`

| Operación | Esperado                                            | Resultado                                                                                            | ✓/✗ |
| --------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | :-: |
| EXECUTE   | Error de permiso; no error de negocio/autenticación | Denegado por permiso/RLS: permission denied for function admin_update_service_price [42501] HTTP 401 |  ✓  |

## Resumen

**44/44 comprobaciones en verde.**

No se detectaron agujeros de RLS/GRANT en las operaciones auditadas.

---

Archivo generado automáticamente por `npm run audit:rls`; no editar manualmente.
