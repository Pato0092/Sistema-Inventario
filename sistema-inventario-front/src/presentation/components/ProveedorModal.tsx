import React, { useState } from "react";
import type { DatosProveedor } from "../../infrastructure/api/inventarioApi";
import type { ItemProveedor } from "../hooks/useProveedores";

interface ProveedorModalProps {
  proveedor?: ItemProveedor;
  onClose: () => void;
  onSubmit: (datos: DatosProveedor) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15";

export const ProveedorModal: React.FC<ProveedorModalProps> = ({
  proveedor,
  onClose,
  onSubmit,
}) => {
  const editando = proveedor !== undefined;
  const [nombre, setNombre] = useState(proveedor?.nombre ?? "");
  const [telefono, setTelefono] = useState(proveedor?.telefono ?? "");
  const [correo, setCorreo] = useState(proveedor?.correo ?? "");
  const [activo, setActivo] = useState(proveedor?.estado ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) {
      setError("Escribe el nombre del proveedor.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        correo: correo.trim() || null,
        estado: activo,
      });
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
        aria-labelledby="proveedor-titulo"
        className="w-full max-w-md rounded-xl border border-stone-200 bg-stone-50 p-6 shadow-xl shadow-stone-900/10"
      >
        <h2
          id="proveedor-titulo"
          className="m-0 mb-5 text-xl font-bold tracking-tight text-stone-900"
        >
          {editando ? "Editar proveedor" : "Nuevo proveedor"}
        </h2>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prov-nombre" className="text-sm font-medium text-stone-700">
              Nombre
            </label>
            <input
              id="prov-nombre"
              className={inputClass}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={150}
              autoFocus
              placeholder="Distribuidora del Norte"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prov-telefono" className="text-sm font-medium text-stone-700">
              Teléfono (opcional)
            </label>
            <input
              id="prov-telefono"
              className={inputClass}
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              maxLength={20}
              placeholder="555 123 4567"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prov-correo" className="text-sm font-medium text-stone-700">
              Correo electrónico (opcional)
            </label>
            <input
              id="prov-correo"
              className={inputClass}
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              maxLength={150}
              placeholder="ventas@proveedor.com"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="size-4 accent-brand-800"
            />
            Proveedor activo
          </label>

          <div className="mt-1 flex justify-end gap-2">
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
                  : "Crear proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};