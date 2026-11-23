import { isAxiosError } from "axios";
import { ErrorDeAplicacion } from "../../domain/errors/ErrorDeAplicacion";

export function traducirError(err: unknown): ErrorDeAplicacion {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return new ErrorDeAplicacion(detail);
    if (Array.isArray(detail)) {
      return new ErrorDeAplicacion("Revisa que todos los datos sean válidos.");
    }
  }
  return new ErrorDeAplicacion("No se pudo completar la operación.");
}
