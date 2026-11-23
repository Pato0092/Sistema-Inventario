import React, { useCallback, useState } from "react";
import { container } from "../../infrastructure/container";
import { descargarCsv } from "../exportar";
import { Paginador } from "../components/Paginador";
import { fechaHora } from "../formato";
import { useInventario } from "../hooks/useInventario";
import { usePaginado } from "../hooks/usePaginado";

const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const MovimientosPage: React.FC = () => {
  const inventario = useInventario();
  const [producto, setProducto] = useState("");
  const [exportando, setExportando] = useState(false);

  const traer = useCallback(
    (limit: number, offset: number) =>
      container.inventario.movimientos({
        id_producto: producto ? Number(producto) : undefined,
        limit,
        offset,
      }),
    [producto],
  );
  const lista = usePaginado(traer, producto);

  const exportar = async () => {
    setExportando(true);
    try {
      const todo = await lista.traerTodo();
      descargarCsv(
        "movimientos-de-inventario",
        [
          { titulo: "Fecha", valor: (l) => fechaHora(l.fecha_hora) },
          { titulo: "Producto", valor: (l) => l.producto },
          { titulo: "Tipo", valor: (l) => (l.tipo === "ENTRADA" ? "Entrada" : "Salida") },
          { titulo: "Cantidad", valor: (l) => (l.tipo === "ENTRADA" ? l.cantidad : -l.cantidad) },
          { titulo: "Motivo", valor: (l) => l.motivo },
          { titulo: "Usuario", valor: (l) => l.usuario },
        ],
        todo,
      );
    } finally {
      setExportando(false);
    }
  };

  const productos = [...inventario.items].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-medium tracking-tight text-stone-900">
            Movimientos
          </h1>
          <p className="mb-0 mt-1.5 max-w-xl text-sm text-stone-500">
            Cada vez que alguien corrige las existencias de un producto a mano
            (merma, conteo físico, devolución) queda aquí con su motivo, para
            poder explicar por qué cambió el inventario.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            aria-label="Filtrar por producto"
            className="rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
          >
            <option value="">Todos los productos</option>
            {productos.map((p) => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.nombre}
              </option>
            ))}
          </select>
          <button
            onClick={exportar}
            disabled={exportando || lista.total === 0}
            className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportando ? "Exportando..." : "Exportar CSV"}
          </button>
          <button
            onClick={lista.recargar}
            disabled={lista.loading}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg {...svgProps} className={lista.loading ? "animate-spin" : ""}>
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
            </svg>
            Actualizar
          </button>
        </div>
      </header>

      {lista.error && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {lista.error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Movimiento</th>
                <th className="px-5 py-3">Motivo</th>
                <th className="px-5 py-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {lista.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-stone-400">
                    {lista.loading ? "Cargando movimientos..." : "Aún no hay ajustes de inventario registrados."}
                  </td>
                </tr>
              ) : (
                lista.items.map((l, i) => {
                  const entrada = l.tipo === "ENTRADA";
                  return (
                    <tr key={`${l.id_movimiento}-${i}`} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/70">
                      <td className="whitespace-nowrap px-5 py-3.5 text-stone-500">{fechaHora(l.fecha_hora)}</td>
                      <td className="px-5 py-3.5 font-medium text-stone-900">{l.producto ?? `Producto #${l.id_producto}`}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${entrada ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
                          {entrada ? "Entrada" : "Salida"}
                        </span>{" "}
                        <span className="font-semibold text-stone-900">
                          {entrada ? "+" : "−"}
                          {l.cantidad}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-stone-600">{l.motivo}</td>
                      <td className="px-5 py-3.5 text-stone-500">{l.usuario ?? "—"}</td>
                    </tr>
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
