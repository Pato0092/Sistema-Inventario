import React, { useState } from "react";
import type { ItemCategoria } from "../hooks/useCategorias";

interface CategoriaModalProps {
  categoria?: ItemCategoria;
  onClose: () => void;
  onSubmit: (nombre: string) => Promise<void>;
}

export const CategoriaModal: React.FC<CategoriaModalProps> = ({
  categoria,
  onClose,
  onSubmit,
}) => {
  const editando = categoria !== undefined;
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) {
      setError("Escribe el nombre de la categoría.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(nombre.trim());
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
        aria-labelledby="categoria-titulo"
        className="w-full max-w-md rounded-xl border border-stone-200 bg-stone-50 p-6 shadow-xl shadow-stone-900/10"
      >
        <h2
          id="categoria-titulo"
          className="m-0 mb-5 text-xl font-bold tracking-tight text-stone-900"
        >
          {editando ? "Editar categoría" : "Nueva categoría"}
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
            <label
              htmlFor="cat-nombre"
              className="text-sm font-medium text-stone-700"
            >
              Nombre
            </label>
            <input
              id="cat-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={100}
              autoFocus
              placeholder="Abarrotes"
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
            />
          </div>

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
                  : "Crear categoría"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
