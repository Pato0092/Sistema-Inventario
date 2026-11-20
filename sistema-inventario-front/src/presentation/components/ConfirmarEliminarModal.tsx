import React, { useState } from "react";

interface ConfirmarEliminarModalProps {
  titulo: string;
  mensaje: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  tono?: "peligro" | "normal";
  textoConfirmar?: string;
  textoOcupado?: string;
  textoCancelar?: string;
}

export const ConfirmarEliminarModal: React.FC<ConfirmarEliminarModalProps> = ({
  titulo,
  mensaje,
  onClose,
  onConfirm,
  tono = "peligro",
  textoConfirmar = "Eliminar",
  textoOcupado = "Eliminando...",
  textoCancelar = "Cancelar",
}) => {
  const peligro = tono === "peligro";
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    setWorking(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
      setWorking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-stone-900/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !working) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        aria-describedby="confirmar-mensaje"
        className="w-full max-w-md rounded-xl border border-stone-200 bg-stone-50 p-6 shadow-xl shadow-stone-900/10"
      >
        <div className="flex items-start gap-4">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-lg ${peligro ? "bg-rose-100 text-rose-700" : "bg-brand-100 text-brand-800"}`}
          >
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {peligro ? (
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
              ) : (
                <path d="M20 6 9 17l-5-5" />
              )}
            </svg>
          </span>
          <div>
            <h2
              id="confirmar-titulo"
              className="m-0 text-xl font-bold tracking-tight text-stone-900"
            >
              {titulo}
            </h2>
            <p
              id="confirmar-mensaje"
              className="mb-0 mt-1.5 text-sm text-stone-600"
            >
              {mensaje}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={working}
            autoFocus
            className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-400"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={working}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-60 ${
              peligro
                ? "bg-rose-700 shadow-rose-900/20 hover:bg-rose-600 active:bg-rose-800"
                : "bg-brand-800 shadow-brand-900/20 hover:bg-brand-700 active:bg-brand-900"
            }`}
          >
            {working && (
              <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            )}
            {working ? textoOcupado : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};
