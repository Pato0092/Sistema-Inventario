import { ErrorDeAplicacion } from "../domain/errors/ErrorDeAplicacion";

export function mensajeError(err: unknown): string {
  if (err instanceof ErrorDeAplicacion) return err.message;
  return "No se pudo completar la operación.";
}
