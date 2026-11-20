import { useCallback, useEffect, useState } from "react";
import {
  inventarioApi,
  type VentaDto,
} from "../../infrastructure/api/inventarioApi";

export function useVentas(desde?: string) {
  const [ventas, setVentas] = useState<VentaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setVentas((await inventarioApi.ventas({ desde })).items);
    } catch {
      setError("No se pudo cargar el historial de ventas.");
    } finally {
      setLoading(false);
    }
  }, [desde]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { ventas, loading, error, recargar: cargar };
}
