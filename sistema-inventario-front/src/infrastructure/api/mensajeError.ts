import { isAxiosError } from "axios";

export function mensajeError(err: unknown): string {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return "Revisa que todos los datos sean válidos.";
  }
  return "No se pudo completar la operación.";
}
