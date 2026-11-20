import React, { useState } from "react";
import { inventarioApi } from "../../infrastructure/api/inventarioApi";
import { mensajeError } from "../../infrastructure/api/mensajeError";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15";

export const CambiarPasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nueva.length < 8) return setError("La nueva contraseña debe tener al menos 8 caracteres.");
    if (nueva !== confirmar) return setError("La confirmación no coincide con la nueva contraseña.");
    setSaving(true);
    try {
      await inventarioApi.cambiarPassword(actual, nueva);
      setListo(true);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
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
        aria-labelledby="clave-titulo"
        className="w-full max-w-sm rounded-xl border border-stone-200 bg-stone-50 p-6 shadow-xl shadow-stone-900/10"
      >
        <h2 id="clave-titulo" className="m-0 mb-5 text-xl font-semibold tracking-tight text-stone-900">
          Cambiar mi contraseña
        </h2>

        {listo ? (
          <>
            <p role="status" className="m-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
              Tu contraseña se actualizó. Úsala la próxima vez que inicies sesión.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Listo
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}
            {[
              ["clave-actual", "Contraseña actual", actual, setActual, "current-password"],
              ["clave-nueva", "Nueva contraseña", nueva, setNueva, "new-password"],
              ["clave-confirmar", "Repite la nueva contraseña", confirmar, setConfirmar, "new-password"],
            ].map(([id, etiqueta, valor, fijar, auto]) => (
              <div key={id as string} className="flex flex-col gap-1.5">
                <label htmlFor={id as string} className="text-sm font-medium text-stone-700">
                  {etiqueta as string}
                </label>
                <input
                  id={id as string}
                  className={inputClass}
                  type="password"
                  value={valor as string}
                  onChange={(e) => (fijar as (v: string) => void)(e.target.value)}
                  autoComplete={auto as string}
                  autoFocus={id === "clave-actual"}
                  required
                  maxLength={72}
                />
              </div>
            ))}
            <p className="m-0 text-xs text-stone-400">Mínimo 8 caracteres.</p>
            <div className="flex justify-end gap-2">
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
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />}
                {saving ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
