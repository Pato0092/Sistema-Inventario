import React, { useMemo, useState } from "react";
import type {
  DatosEdicionUsuario,
  DatosNuevoUsuario,
  PermisoDto,
  UsuarioDto,
} from "../../infrastructure/api/inventarioApi";

interface UsuarioModalProps {
  catalogo: PermisoDto[];
  usuario?: UsuarioDto;
  esUnoMismo?: boolean;
  onClose: () => void;
  onCrear: (datos: DatosNuevoUsuario) => Promise<void>;
  onActualizar: (id: number, datos: DatosEdicionUsuario) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500";

export const UsuarioModal: React.FC<UsuarioModalProps> = ({
  catalogo,
  usuario,
  esUnoMismo = false,
  onClose,
  onCrear,
  onActualizar,
}) => {
  const editando = usuario !== undefined;
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [correo, setCorreo] = useState(usuario?.correo ?? "");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<UsuarioDto["rol"]>(usuario?.rol ?? "empleado");
  const [activo, setActivo] = useState(usuario?.estado ?? true);
  const [permisos, setPermisos] = useState<Set<string>>(
    () =>
      new Set(usuario && usuario.rol === "empleado" ? usuario.permisos : []),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const mapa = new Map<string, PermisoDto[]>();
    for (const p of catalogo) mapa.set(p.grupo, [...(mapa.get(p.grupo) ?? []), p]);
    return [...mapa.entries()];
  }, [catalogo]);

  const alternar = (clave: string, marcado: boolean) => {
    setPermisos((prev) => {
      const nuevo = new Set(prev);
      const seccion = clave.split(".")[0];
      if (marcado) {
        nuevo.add(clave);
        if (clave.endsWith(".editar")) nuevo.add(`${seccion}.ver`);
      } else {
        nuevo.delete(clave);
        if (clave.endsWith(".ver")) nuevo.delete(`${seccion}.editar`);
      }
      return nuevo;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("Escribe el nombre del usuario.");
    if (!editando && password.length < 8)
      return setError("La contraseña debe tener al menos 8 caracteres.");
    if (editando && password && password.length < 8)
      return setError("La nueva contraseña debe tener al menos 8 caracteres.");

    setSaving(true);
    try {
      const claves = rol === "administrador" ? [] : [...permisos];
      if (editando) {
        await onActualizar(usuario.id_usuario, {
          nombre: nombre.trim(),
          rol,
          estado: activo,
          permisos: claves,
          password: password || null,
        });
      } else {
        await onCrear({
          nombre: nombre.trim(),
          correo: correo.trim(),
          password,
          rol,
          estado: activo,
          permisos: claves,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-stone-900/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="usuario-titulo"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl border border-stone-200 bg-stone-50 shadow-xl shadow-stone-900/10"
      >
        <div className="border-b border-stone-200 px-6 py-5">
          <h2
            id="usuario-titulo"
            className="m-0 text-xl font-bold tracking-tight text-stone-900"
          >
            {editando ? "Editar usuario" : "Nuevo usuario"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid flex-1 grid-cols-2 content-start gap-4 overflow-auto px-6 py-5">
            {error && (
              <div
                role="alert"
                className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <label htmlFor="usr-nombre" className="text-sm font-medium text-stone-700">
                Nombre
              </label>
              <input
                id="usr-nombre"
                className={inputClass}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <label htmlFor="usr-correo" className="text-sm font-medium text-stone-700">
                Correo electrónico
              </label>
              <input
                id="usr-correo"
                className={inputClass}
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                disabled={editando}
                autoComplete="off"
                placeholder="empleado@inventario.com"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <label htmlFor="usr-password" className="text-sm font-medium text-stone-700">
                {editando ? "Nueva contraseña (opcional)" : "Contraseña"}
              </label>
              <input
                id="usr-password"
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required={!editando}
                placeholder={editando ? "Déjala vacía para no cambiarla" : "Mínimo 8 caracteres"}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <label htmlFor="usr-rol" className="text-sm font-medium text-stone-700">
                Rol
              </label>
              <select
                id="usr-rol"
                className={inputClass}
                value={rol}
                onChange={(e) => setRol(e.target.value as UsuarioDto["rol"])}
                disabled={esUnoMismo}
              >
                <option value="empleado">Empleado (solo lo que le asignes)</option>
                <option value="administrador">Administrador (acceso total)</option>
              </select>
            </div>

            <label
              className={`col-span-2 flex items-center gap-2.5 text-sm text-stone-700 ${esUnoMismo ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                disabled={esUnoMismo}
                className="size-4 accent-brand-800"
              />
              Usuario activo (puede iniciar sesión)
            </label>
            {esUnoMismo && (
              <p className="col-span-2 m-0 -mt-2 text-xs text-stone-500">
                No puedes cambiar tu propio rol ni desactivar tu cuenta.
              </p>
            )}

            <div className="col-span-2 mt-1">
              <h3 className="m-0 text-sm font-semibold text-stone-900">Permisos</h3>
              {rol === "administrador" ? (
                <p className="mb-0 mt-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
                  Los administradores tienen acceso a todas las secciones y pueden
                  gestionar usuarios. No necesitan permisos individuales.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {grupos.map(([grupo, lista]) => (
                    <fieldset
                      key={grupo}
                      className="m-0 rounded-lg border border-stone-200 bg-white px-4 py-3"
                    >
                      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
                        {grupo}
                      </legend>
                      <div className="flex flex-col gap-2">
                        {lista.map((p) => (
                          <label
                            key={p.clave}
                            className="flex cursor-pointer items-start gap-2.5 text-sm text-stone-700"
                          >
                            <input
                              type="checkbox"
                              checked={permisos.has(p.clave)}
                              onChange={(e) => alternar(p.clave, e.target.checked)}
                              className="mt-0.5 size-4 shrink-0 accent-brand-800"
                            />
                            {p.etiqueta}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-stone-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
              )}
              {saving
                ? "Guardando..."
                : editando
                  ? "Guardar cambios"
                  : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};