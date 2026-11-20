import React, { useCallback, useState } from "react";
import { inventarioApi, type VentaDto } from "../../../infrastructure/api/inventarioApi";
import { descargarCsv, escaparHtml, imprimirDocumento } from "../../../infrastructure/archivos/exportar";
import { Paginador } from "../../components/Paginador";
import { dinero, fechaHora } from "../../formato";
import type { ItemInventario } from "../../hooks/useInventario";
import { usePaginado } from "../../hooks/usePaginado";

interface HistorialVentasProps {
  items: ItemInventario[];
  version: number;
}

const campo =
  "rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15";

export const HistorialVentas: React.FC<HistorialVentasProps> = ({ items, version }) => {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set());
  const [exportando, setExportando] = useState(false);

  const nombreDe = (id: number) =>
    items.find((i) => i.id_producto === id)?.nombre ?? `Producto #${id}`;

  const traer = useCallback(
    (limit: number, offset: number) => {
      void version;
      return inventarioApi.ventas({ desde: desde || undefined, hasta: hasta || undefined, limit, offset });
    },
    [desde, hasta, version],
  );
  const lista = usePaginado(traer, `${desde}|${hasta}`);

  const alternar = (id: number) =>
    setAbiertas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  const exportar = async () => {
    setExportando(true);
    try {
      const todas = await lista.traerTodo();
      const filas = todas.flatMap((v) => v.detalles.map((d) => ({ v, d })));
      descargarCsv(
        "ventas",
        [
          { titulo: "Venta", valor: ({ v }) => v.id_venta },
          { titulo: "Fecha", valor: ({ v }) => fechaHora(v.fecha_hora) },
          { titulo: "Vendedor", valor: ({ v }) => v.nombre_usuario },
          { titulo: "Estado", valor: ({ v }) => v.estado },
          { titulo: "Producto", valor: ({ d }) => nombreDe(d.id_producto) },
          { titulo: "Cantidad", valor: ({ d }) => d.cantidad },
          { titulo: "Precio unitario", valor: ({ d }) => d.precio_unitario },
          { titulo: "Subtotal", valor: ({ d }) => d.cantidad * d.precio_unitario },
        ],
        filas,
      );
    } finally {
      setExportando(false);
    }
  };

  const imprimirTicket = (v: VentaDto) =>
    imprimirDocumento(
      `Venta ${v.id_venta}`,
      `<h1>Venta #${v.id_venta}</h1>
       <p class="meta">${escaparHtml(fechaHora(v.fecha_hora))} · ${escaparHtml(v.nombre_usuario ?? "")}</p>
       <table><thead><tr><th>Producto</th><th class="der">Cant.</th><th class="der">Precio</th><th class="der">Importe</th></tr></thead><tbody>
       ${v.detalles
         .map(
           (d) =>
             `<tr><td>${escaparHtml(nombreDe(d.id_producto))}</td><td class="der">${d.cantidad}</td><td class="der">${escaparHtml(dinero.format(d.precio_unitario))}</td><td class="der">${escaparHtml(dinero.format(d.cantidad * d.precio_unitario))}</td></tr>`,
         )
         .join("")}
       </tbody></table><p class="tot">Total ${escaparHtml(dinero.format(v.total))}</p>`,
    );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" className={campo} />
        <span className="text-sm text-stone-400">a</span>
        <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" className={campo} />
        {(desde || hasta) && (
          <button
            onClick={() => {
              setDesde("");
              setHasta("");
            }}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition hover:text-stone-900"
          >
            Limpiar
          </button>
        )}
        <button
          onClick={exportar}
          disabled={exportando || lista.total === 0}
          className="ml-auto cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportando ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      {lista.error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {lista.error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3">Venta</th>
                <th className="px-5 py-3">Vendedor</th>
                <th className="px-5 py-3 text-right">Productos</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-stone-400">
                    {lista.loading ? "Cargando ventas..." : "No hay ventas en este periodo."}
                  </td>
                </tr>
              ) : (
                lista.items.map((v) => {
                  const abierta = abiertas.has(v.id_venta);
                  return (
                    <React.Fragment key={v.id_venta}>
                      <tr className="border-b border-stone-100 hover:bg-stone-50/70">
                        <td className="px-3 py-3.5">
                          <button
                            onClick={() => alternar(v.id_venta)}
                            aria-expanded={abierta}
                            aria-label={abierta ? "Ocultar productos" : "Ver productos"}
                            className="grid size-8 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                          >
                            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={`transition ${abierta ? "rotate-90" : ""}`} aria-hidden>
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="m-0 font-semibold text-stone-900">#{v.id_venta}</p>
                          <p className="m-0 text-xs text-stone-400">{fechaHora(v.fecha_hora)}</p>
                        </td>
                        <td className="px-5 py-3.5 text-stone-700">{v.nombre_usuario ?? "—"}</td>
                        <td className="px-5 py-3.5 text-right text-stone-700">
                          {v.detalles.length}{" "}
                          <span className="text-xs text-stone-400">({v.detalles.reduce((a, d) => a + d.cantidad, 0)} u.)</span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-stone-900">{dinero.format(v.total)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => imprimirTicket(v)}
                            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                          >
                            Imprimir
                          </button>
                        </td>
                      </tr>
                      {abierta && (
                        <tr className="border-b border-stone-100 bg-stone-50/60">
                          <td />
                          <td colSpan={5} className="px-3 py-3">
                            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                              {v.detalles.map((d) => (
                                <li key={d.id_producto} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                                  <span className="text-stone-700">
                                    <span className="font-semibold text-stone-900">{d.cantidad} ×</span> {nombreDe(d.id_producto)}
                                    <span className="text-stone-400"> @ {dinero.format(d.precio_unitario)}</span>
                                  </span>
                                  <span className="font-medium text-stone-900">{dinero.format(d.cantidad * d.precio_unitario)}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Paginador total={lista.total} offset={lista.offset} limit={lista.limit} loading={lista.loading} onChange={lista.irA} />
    </>
  );
};