/** Estado del formulario de reserva. Vive fuera de la Server Action porque
 * ese archivo solo puede exportar funciones asíncronas. */

export type BookingState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: "name" | "phone" | "slot" };

export const initialBookingState: BookingState = { status: "idle" };
