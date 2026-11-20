import { useCallback, useEffect, useState } from "react";
import {
  inventarioApi,
  type DatosEdicionUsuario,
  type DatosNuevoUsuario,
  type PermisoDto,
  type UsuarioDto,
} from "../../infrastructure/api/inventarioApi";
import { mensajeError } from "../../infrastructure/api/mensajeError";

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
        inventarioApi.usuarios(),
        inventarioApi.catalogoPermisos(),
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
      ejecutar(() => inventarioApi.crearUsuario(datos)),
    actualizarUsuario: (id: number, datos: DatosEdicionUsuario) =>
      ejecutar(() => inventarioApi.actualizarUsuario(id, datos)),
  };
}
