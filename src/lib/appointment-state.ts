/**
 * Estado del formulario de cancelación. Vive fuera de la Server Action porque
 * un archivo `"use server"` solo puede exportar funciones asíncronas.
 */

export type CancelState =
  | { status: "idle" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export const initialCancelState: CancelState = { status: "idle" };
