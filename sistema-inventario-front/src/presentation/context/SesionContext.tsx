import { createContext, useContext } from "react";
import type { UsuarioDto } from "../../infrastructure/api/inventarioApi";

export interface Sesion {
  usuario: UsuarioDto;
  esAdmin: boolean;
  tiene: (permiso: string) => boolean;
}

export const SesionContext = createContext<Sesion | null>(null);

export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);
  if (!sesion) throw new Error("useSesion se usa fuera de SesionContext");
  return sesion;
}

export function crearSesion(usuario: UsuarioDto): Sesion {
  const permisos = new Set(usuario.permisos);
  return {
    usuario,
    esAdmin: usuario.rol === "administrador",
    tiene: (permiso) => permisos.has(permiso),
  };
}
