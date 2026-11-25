/**
 * Horas de los editores del panel: cada 30 minutos, de 00:00 a 23:30. Se
 * renderizan desde el servidor para que los selects funcionen sin JavaScript.
 */
export const HALF_HOUR_OPTIONS: readonly string[] = Array.from(
  { length: 48 },
  (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? "00" : "30";

    return `${String(hour).padStart(2, "0")}:${minute}`;
  },
);
