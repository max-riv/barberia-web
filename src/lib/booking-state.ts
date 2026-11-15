/** Estado del formulario de reserva. Vive fuera de la Server Action porque
 * ese archivo solo puede exportar funciones asíncronas. */

export type BookingState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: "name" | "phone" | "slot" }
  | {
      status: "success";
      appointment: {
        /** Token del enlace de cancelación (Fase 1.3 lo usa en /cita/[token]). */
        token: string;
        startsAt: string;
        endsAt: string;
        name: string;
        phone: string;
      };
    };

export const initialBookingState: BookingState = { status: "idle" };
