import { useCallback, useEffect, useState } from "react";
import type { Pagina } from "../../infrastructure/api/inventarioApi";

export const TAMANO_PAGINA = 25;
const MAX_POR_PETICION = 200; 

export function usePaginado<T>(
  traer: (limit: number, offset: number) => Promise<Pagina<T>>,
  clave: string,
  limit = TAMANO_PAGINA,
) {
  const [posicion, setPosicion] = useState({ clave, offset: 0 });
  const offset = posicion.clave === clave ? posicion.offset : 0;

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pagina = await traer(limit, offset);
      setItems(pagina.items);
      setTotal(pagina.total);
    } catch {
      setError("No se pudieron cargar los datos del servidor.");
    } finally {
      setLoading(false);
    }
  }, [traer, limit, offset]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const traerTodo = useCallback(async (): Promise<T[]> => {
    const todo: T[] = [];
    for (let desde = 0; ; desde += MAX_POR_PETICION) {
      const pagina = await traer(MAX_POR_PETICION, desde);
      todo.push(...pagina.items);
      if (todo.length >= pagina.total || pagina.items.length === 0) return todo;
    }
  }, [traer]);

  return {
    items,
    total,
    loading,
    error,
    offset,
    limit,
    irA: (nuevo: number) => setPosicion({ clave, offset: Math.max(0, nuevo) }),
    recargar: cargar,
    traerTodo,
  };
}
