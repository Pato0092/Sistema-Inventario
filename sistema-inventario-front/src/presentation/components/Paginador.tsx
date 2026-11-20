import React from "react";

interface PaginadorProps {
  total: number;
  offset: number;
  limit: number;
  loading?: boolean;
  onChange: (offset: number) => void;
}

export const Paginador: React.FC<PaginadorProps> = ({
  total,
  offset,
  limit,
  loading = false,
  onChange,
}) => {
  if (total === 0) return null;
  const desde = offset + 1;
  const hasta = Math.min(offset + limit, total);
  const hayAnterior = offset > 0;
  const haySiguiente = offset + limit < total;

  const boton =
    "cursor-pointer rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-300 disabled:hover:text-stone-700";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
      <span>
        {desde}–{hasta} de {total}
      </span>
      <div className="flex gap-2">
        <button
          className={boton}
          disabled={!hayAnterior || loading}
          onClick={() => onChange(offset - limit)}
        >
          Anterior
        </button>
        <button
          className={boton}
          disabled={!haySiguiente || loading}
          onClick={() => onChange(offset + limit)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};
