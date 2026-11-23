import { useCallback, useEffect, useState } from "react";
import type { DatosEdicionUsuario, DatosNuevoUsuario, PermisoDto, UsuarioDto } from "../../domain/modelos";
import { container } from "../../infrastructure/container";
import { mensajeError } from "../mensajeError";

export function useUsuarios() {
  const [items, setItems] = useState<UsuarioDto[]>([]);
  const [catalogo, setCatalogo] = useState<PermisoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usuarios, permisos] = await Promise.all([
        container.inventario.usuarios(),
        container.inventario.catalogoPermisos(),
      ]);
      setItems(usuarios);
      setCatalogo(permisos);
    } catch {
      setError("No se pudieron cargar los usuarios desde el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ejecutar = async (accion: () => Promise<unknown>) => {
    try {
      await accion();
    } catch (err) {
      throw new Error(mensajeError(err));
    }
    await cargar();
  };

  return {
    items,
    catalogo,
    loading,
    error,
    recargar: cargar,
    crearUsuario: (datos: DatosNuevoUsuario) =>
      ejecutar(() => container.inventario.crearUsuario(datos)),
    actualizarUsuario: (id: number, datos: DatosEdicionUsuario) =>
      ejecutar(() => container.inventario.actualizarUsuario(id, datos)),
  };
}
