import { useCallback, useEffect, useState } from "react";
import { inventarioApi } from "../../infrastructure/api/inventarioApi";
import { mensajeError } from "../../infrastructure/api/mensajeError";

export interface ItemCategoria {
  id_categoria: number;
  nombre: string;
  estado: boolean;
  total_productos: number;
}

export function useCategorias() {
  const [items, setItems] = useState<ItemCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [categorias, productos] = await Promise.all([
        inventarioApi.categorias(),
        inventarioApi.productos(),
      ]);
      const conteo = new Map<number, number>();
      for (const p of productos) {
        conteo.set(p.id_categoria, (conteo.get(p.id_categoria) ?? 0) + 1);
      }
      setItems(
        categorias.map((c) => ({
          ...c,
          total_productos: conteo.get(c.id_categoria) ?? 0,
        })),
      );
    } catch {
      setError("No se pudieron cargar las categorías desde el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearCategoria = async (nombre: string) => {
    try {
      await inventarioApi.crearCategoria(nombre);
    } catch (err) {
      throw new Error(mensajeError(err));
    }
    await cargar();
  };

  const actualizarCategoria = async (
    id: number,
    datos: { nombre: string; estado: boolean },
  ) => {
    try {
      await inventarioApi.actualizarCategoria(id, datos);
    } catch (err) {
      throw new Error(mensajeError(err));
    }
    await cargar();
  };

  return {
    items,
    loading,
    error,
    recargar: cargar,
    crearCategoria,
    actualizarCategoria,
  };
}
