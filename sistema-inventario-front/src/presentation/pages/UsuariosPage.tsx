import React, { useState } from "react";
import type { UsuarioDto } from "../../domain/modelos";
import { UsuarioModal } from "../components/UsuarioModal";
import { useSesion } from "../context/SesionContext";
import { useUsuarios } from "../hooks/useUsuarios";

const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const UsuariosPage: React.FC = () => {
  const { usuario: yo } = useSesion();
  const {
    items,
    catalogo,
    loading,
    error,
    recargar,
    crearUsuario,
    actualizarUsuario,
  } = useUsuarios();
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<UsuarioDto | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const alternarEstado = async (u: UsuarioDto) => {
    setErrorAccion(null);
    try {
      await actualizarUsuario(u.id_usuario, {
        nombre: u.nombre,
        rol: u.rol,
        estado: !u.estado,
        permisos: u.rol === "empleado" ? u.permisos : [],
      });
    } catch (err) {
      setErrorAccion(
        err instanceof Error ? err.message : "No se pudo completar la operación.",
      );
    }
  };

  const mensajeError = error ?? errorAccion;
  const activos = items.filter((u) => u.estado).length;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-medium tracking-tight text-stone-900">
            Usuarios
          </h1>
          <p className="mb-0 mt-1.5 text-sm text-stone-500">
            {items.length} {items.length === 1 ? "usuario" : "usuarios"} ·{" "}
            {activos} {activos === 1 ? "activo" : "activos"}. Los empleados solo
            ven las secciones que les asignes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreando(true)}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-900"
          >
            <svg {...svgProps}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo usuario
          </button>
          <button
            onClick={recargar}
            disabled={loading}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg {...svgProps} className={loading ? "animate-spin" : ""}>
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
            </svg>
            Actualizar
          </button>
        </div>
      </header>

      {mensajeError && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <svg {...svgProps} width={16} height={16}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {mensajeError}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Acceso</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-stone-400">
                    {loading ? "Cargando usuarios..." : "Aún no hay usuarios."}
                  </td>
                </tr>
              ) : (
                items.map((u) => {
                  const esYo = u.id_usuario === yo.id_usuario;
                  const secciones = catalogo.length
                    ? new Set(u.permisos.map((p) => p.split(".")[0])).size
                    : u.permisos.length;
                  return (
                    <tr
                      key={u.id_usuario}
                      className="border-b border-stone-100 last:border-0 hover:bg-stone-50/70"
                    >
                      <td className="px-5 py-3.5">
                        <p
                          className={`m-0 font-medium ${u.estado ? "text-stone-900" : "text-stone-400"}`}
                        >
                          {u.nombre}
                          {esYo && (
                            <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                              Tú
                            </span>
                          )}
                        </p>
                        <p className="m-0 text-xs text-stone-400">{u.correo}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            u.rol === "administrador"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {u.rol === "administrador" ? "Administrador" : "Empleado"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-stone-600">
                        {u.rol === "administrador"
                          ? "Acceso total"
                          : secciones === 0
                            ? "Sin permisos"
                            : `${secciones} ${secciones === 1 ? "sección" : "secciones"} · ${u.permisos.length} ${u.permisos.length === 1 ? "permiso" : "permisos"}`}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            u.estado
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-stone-200 text-stone-600"
                          }`}
                        >
                          {u.estado ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditando(u)}
                            aria-label={`Editar ${u.nombre}`}
                            title="Editar usuario y permisos"
                            className="grid size-8 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-brand-50 hover:text-brand-800"
                          >
                            <svg {...svgProps}>
                              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => alternarEstado(u)}
                            disabled={esYo}
                            title={esYo ? "No puedes desactivar tu propia cuenta" : undefined}
                            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent ${
                              u.estado
                                ? "text-stone-500 hover:bg-rose-50 hover:text-rose-700"
                                : "text-brand-800 hover:bg-brand-50"
                            }`}
                          >
                            {u.estado ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {creando && (
        <UsuarioModal
          catalogo={catalogo}
          onClose={() => setCreando(false)}
          onCrear={crearUsuario}
          onActualizar={actualizarUsuario}
        />
      )}
      {editando && (
        <UsuarioModal
          key={editando.id_usuario}
          catalogo={catalogo}
          usuario={editando}
          esUnoMismo={editando.id_usuario === yo.id_usuario}
          onClose={() => setEditando(null)}
          onCrear={crearUsuario}
          onActualizar={actualizarUsuario}
        />
      )}
    </>
  );
};