import { useCallback, useEffect, useState } from "react";
import type { VentaDto } from "../../domain/modelos";
import { container } from "../../infrastructure/container";

export function useVentas(desde?: string) {
  const [ventas, setVentas] = useState<VentaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setVentas((await container.inventario.ventas({ desde })).items);
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
