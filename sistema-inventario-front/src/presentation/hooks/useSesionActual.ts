import { useEffect, useState } from "react";
import {
  inventarioApi,
  type UsuarioDto,
} from "../../infrastructure/api/inventarioApi";

export function useSesionActual(autenticado: boolean) {
  const [usuario, setUsuario] = useState<UsuarioDto | null>(null);
  const [cargando, setCargando] = useState(autenticado);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autenticado) {
      setUsuario(null);
      setCargando(false);
      return;
    }
    let activo = true;
    setCargando(true);
    setError(null);
    inventarioApi
      .miPerfil()
      .then((u) => activo && setUsuario(u))
      .catch(() => activo && setError("No se pudo cargar tu perfil."))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [autenticado]);

  return { usuario, cargando, error };
}
