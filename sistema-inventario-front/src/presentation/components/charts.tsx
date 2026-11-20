import React from "react";

export interface TooltipState {
  x: number;
  y: number;
  valor: string;
  detalle: string;
}

export const Tooltip: React.FC<{ t: TooltipState | null }> = ({ t }) =>
  t && (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-lg"
      style={{ left: t.x, top: t.y - 10 }}
    >
      <p className="m-0 text-sm font-semibold text-stone-900">{t.valor}</p>
      <p className="m-0 text-xs text-stone-500">{t.detalle}</p>
    </div>
  );

export interface Delta {
  texto: string;
  bueno: boolean | null;
}

export const StatTile: React.FC<{
  label: string;
  value: string;
  hint: string;
  delta?: Delta;
}> = ({ label, value, hint, delta }) => (
  <div className="rounded-xl border border-stone-200 bg-white p-5">
    <p className="m-0 text-sm font-medium text-stone-500">{label}</p>
    <p className="mb-0 mt-2 text-3xl font-semibold tracking-tight text-stone-900">
      {value}
    </p>
    <p className="m-0 mt-1 text-xs text-stone-400">
      {delta && (
        <span
          className={`mr-1.5 font-semibold ${
            delta.bueno === null
              ? "text-stone-500"
              : delta.bueno
                ? "text-emerald-700"
                : "text-rose-700"
          }`}
        >
          {delta.texto}
        </span>
      )}
      {hint}
    </p>
  </div>
);

export const Tarjeta: React.FC<{
  titulo: string;
  subtitulo?: string;
  accion?: React.ReactNode;
  children: React.ReactNode;
}> = ({ titulo, subtitulo, accion, children }) => (
  <section className="rounded-xl border border-stone-200 bg-white p-6">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="m-0 text-lg font-semibold text-stone-900">{titulo}</h2>
        {subtitulo && (
          <p className="mb-0 mt-1 text-sm text-stone-500">{subtitulo}</p>
        )}
      </div>
      {accion}
    </div>
    {children}
  </section>
);

export function Segmentado<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: readonly (readonly [T, string])[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1">
      {opciones.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-pressed={valor === id}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            valor === id
              ? "bg-brand-800 text-white"
              : "text-stone-600 hover:bg-stone-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export interface BarraItem {
  id: number | string;
  etiqueta: string;
  valor: number;
  texto: string;
  detalle: string;
}

export const BarList: React.FC<{
  datos: BarraItem[];
  onTip: (t: TooltipState | null) => void;
}> = ({ datos, onTip }) => {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {datos.map((d) => {
        const ancho = d.valor > 0 ? Math.max((d.valor / max) * 82, 1) : 0;
        return (
          <li
            key={d.id}
            tabIndex={0}
            aria-label={`${d.etiqueta}: ${d.texto}. ${d.detalle}`}
            onPointerMove={(e) =>
              onTip({
                x: e.clientX,
                y: e.clientY,
                valor: d.texto,
                detalle: d.detalle,
              })
            }
            onPointerLeave={() => onTip(null)}
            onFocus={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onTip({
                x: r.left + r.width / 2,
                y: r.top,
                valor: d.texto,
                detalle: d.detalle,
              });
            }}
            onBlur={() => onTip(null)}
            className="group grid cursor-default grid-cols-[minmax(6rem,10rem)_1fr] items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
          >
            <span className="truncate text-sm text-stone-600">
              {d.etiqueta}
            </span>
            <span className="flex items-center gap-2">
              <span
                className="h-3.5 rounded-r bg-brand-700 transition group-hover:bg-brand-600"
                style={{ width: `${ancho}%`, minWidth: d.valor > 0 ? 2 : 0 }}
              />
              <span className="text-sm font-semibold text-stone-900">
                {d.texto}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export interface ColumnaItem {
  id: string;
  etiqueta: string;
  valor: number;
  texto: string;
  detalle: string;
}

export const ColumnChart: React.FC<{
  datos: ColumnaItem[];
  formatoEje: (v: number) => string;
  onTip: (t: TooltipState | null) => void;
}> = ({ datos, formatoEje, onTip }) => {
  const max = Math.max(...datos.map((d) => d.valor), 0);
  const tope = max > 0 ? max : 1;
  const paso = Math.max(1, Math.ceil(datos.length / 8));
  return (
    <div className="flex gap-3">
      <div className="flex h-52 w-14 shrink-0 flex-col justify-between text-right text-xs text-stone-400">
        <span>{formatoEje(max)}</span>
        <span>{formatoEje(max / 2)}</span>
        <span>{formatoEje(0)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative flex h-52 items-end border-b border-stone-200">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-stone-100" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-stone-100" />
          {datos.map((d) => (
            <div
              key={d.id}
              tabIndex={0}
              aria-label={`${d.etiqueta}: ${d.texto}. ${d.detalle}`}
              onPointerMove={(e) =>
                onTip({
                  x: e.clientX,
                  y: e.clientY,
                  valor: d.texto,
                  detalle: `${d.etiqueta} · ${d.detalle}`,
                })
              }
              onPointerLeave={() => onTip(null)}
              onFocus={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                onTip({
                  x: r.left + r.width / 2,
                  y: r.top,
                  valor: d.texto,
                  detalle: `${d.etiqueta} · ${d.detalle}`,
                });
              }}
              onBlur={() => onTip(null)}
              className="group relative flex h-full min-w-0 flex-1 cursor-default items-end px-px outline-none"
            >
              <div
                className="mx-auto w-full max-w-6 rounded-t bg-brand-700 transition group-hover:bg-brand-600 group-focus-visible:bg-brand-600"
                style={{
                  height: `${(d.valor / tope) * 100}%`,
                  minHeight: d.valor > 0 ? 2 : 0,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex">
          {datos.map((d, idx) => (
            <span
              key={d.id}
              className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-xs text-stone-400"
            >
              {idx % paso === 0 ? d.etiqueta : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
