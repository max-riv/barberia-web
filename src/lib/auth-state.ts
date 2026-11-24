/**
 * Estado del formulario de login. Vive fuera de la Server Action porque un
 * archivo `"use server"` solo puede exportar funciones asíncronas.
 */

export type LoginField = "email" | "password";

export type LoginState =
  { status: "idle" } | { status: "error"; message: string; field?: LoginField };

export const initialLoginState: LoginState = { status: "idle" };
