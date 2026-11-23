import React, { useMemo, useState } from "react";
import { ConfirmarEliminarModal } from "../components/ConfirmarEliminarModal";
import { ProductoModal } from "../components/ProductoModal";
import { descargarCsv } from "../exportar";
import { diasHasta, fechaDia } from "../formato";
import { useInventario, type ItemInventario } from "../hooks/useInventario";
import { useSesion } from "../context/SesionContext";

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

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

type Nivel = "inactivo" | "agotado" | "bajo" | "ok";

const nivelDe = (i: ItemInventario): Nivel => {
  if (!i.estado) return "inactivo";
  if (i.cantidad === 0) return "agotado";
  if (i.cantidad <= i.stock_minimo) return "bajo";
  return "ok";
};

const nivelUi: Record<Nivel, { label: string; badge: string; bar: string }> = {
  ok: {
    label: "Disponible",
    badge: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
  },
  bajo: {
    label: "Stock bajo",
    badge: "bg-amber-100 text-amber-800",
    bar: "bg-amber-400",
  },
  agotado: {
    label: "Agotado",
    badge: "bg-rose-100 text-rose-700",
    bar: "bg-rose-400",
  },
  inactivo: {
    label: "Inactivo",
    badge: "bg-stone-200 text-stone-600",
    bar: "bg-stone-300",
  },
};

type Filtro = "todos" | "bajo" | "agotado" | "vence";

const filtros: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "bajo", label: "Stock bajo" },
  { id: "agotado", label: "Agotados" },
  { id: "vence", label: "Por vencer" },
];

const DIAS_AVISO = 30;
const caducidadDe = (i: ItemInventario) => {
  if (!i.fecha_caducidad || !i.estado || i.cantidad <= 0) return null;
  const dias = diasHasta(i.fecha_caducidad);
  if (dias < 0) return { texto: "Vencido", clase: "bg-rose-100 text-rose-700" };
  if (dias <= DIAS_AVISO)
    return {
      texto: dias === 0 ? "Caduca hoy" : `Caduca en ${dias} d`,
      clase: "bg-amber-100 text-amber-800",
    };
  return null;
};

export const InventarioPage: React.FC = () => {
  const { tiene } = useSesion();
  const puedeEditar = tiene("inventario.editar");
  const {
    items,
    categorias,
    loading,
    error,
    recargar,
    crearProducto,
    editarProducto,
    alternarEstado,
    eliminarProducto,
  } = useInventario();
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cambiarEstado = async (i: ItemInventario) => {
    setErrorAccion(null);
    try {
      await alternarEstado(i);
    } catch (err) {
      setErrorAccion(
        err instanceof Error ? err.message : "No se pudo completar la operación.",
      );
    }
  };
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<ItemInventario | null>(null);
  const [eliminando, setEliminando] = useState<ItemInventario | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const resumen = useMemo(() => {
    const activos = items.filter((i) => i.estado);
    return {
      total: activos.length,
      unidades: activos.reduce((a, i) => a + i.cantidad, 0),
      bajo: activos.filter((i) => nivelDe(i) === "bajo").length,
      agotados: activos.filter((i) => nivelDe(i) === "agotado").length,
      vencen: activos.filter((i) => caducidadDe(i)).length,
    };
  }, [items]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((i) => {
      const nivel = nivelDe(i);
      if (filtro === "bajo" && nivel !== "bajo") return false;
      if (filtro === "agotado" && nivel !== "agotado") return false;
      if (filtro === "vence" && !caducidadDe(i)) return false;
      if (!q) return true;
      return [i.nombre, i.marca, i.codigo_barras, i.categoria, i.presentacion]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(q));
    });
  }, [items, busqueda, filtro]);

  return (
    <>
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="m-0 text-3xl font-medium tracking-tight text-stone-900">
                Inventario
              </h1>
              <p className="mb-0 mt-1.5 text-sm text-stone-500">
                {resumen.total} productos · {resumen.unidades} unidades
                {resumen.bajo > 0 && (
                  <span className="text-amber-700">
                    {" "}
                    · {resumen.bajo} con stock bajo
                  </span>
                )}
                {resumen.agotados > 0 && (
                  <span className="text-rose-600">
                    {" "}
                    · {resumen.agotados} agotados
                  </span>
                )}
                {resumen.vencen > 0 && (
                  <span className="text-amber-700">
                    {" "}
                    · {resumen.vencen} por vencer
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {puedeEditar && (
<button
                onClick={() => setModalAbierto(true)}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-900"
              >
                <svg {...svgProps}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Agregar producto
              </button>
)}
              <button
                onClick={() =>
                  descargarCsv(
                    "inventario",
                    [
                      { titulo: "Código de barras", valor: (i) => i.codigo_barras },
                      { titulo: "Producto", valor: (i) => i.nombre },
                      { titulo: "Marca", valor: (i) => i.marca },
                      { titulo: "Presentación", valor: (i) => i.presentacion },
                      { titulo: "Categoría", valor: (i) => i.categoria },
                      { titulo: "Precio de venta", valor: (i) => i.precio_venta },
                      { titulo: "Cantidad", valor: (i) => i.cantidad },
                      { titulo: "Stock mínimo", valor: (i) => i.stock_minimo },
                      { titulo: "Caducidad", valor: (i) => i.fecha_caducidad },
                      { titulo: "Estado", valor: (i) => (i.estado ? "Activo" : "Inactivo") },
                    ],
                    visibles,
                  )
                }
                disabled={visibles.length === 0}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Exportar CSV
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

          {(error ?? errorAccion) && (
            <div
              role="alert"
              className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <svg {...svgProps} width={16} height={16}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {error ?? errorAccion}
            </div>
          )}

          {/* Búsqueda y filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="group relative flex min-w-64 flex-1 items-center">
              <span className="pointer-events-none absolute left-3 text-stone-400 transition group-focus-within:text-brand-700">
                <svg {...svgProps}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, marca, código o categoría"
                className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1">
              {filtros.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  className={`cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    filtro === f.id
                      ? "bg-brand-800 text-white"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de productos */}
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-220 border-collapse text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    <th className="px-5 py-3">Producto</th>
                    <th className="px-5 py-3">Categoría</th>
                    <th className="px-5 py-3 text-right">Precio</th>
                    <th className="px-5 py-3">Disponible</th>
                    <th className="px-5 py-3 text-right">Mínimo</th>
                    <th className="px-5 py-3">Estado</th>
                    {puedeEditar && (
<th className="px-5 py-3 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
)}
                  </tr>
                </thead>
                <tbody>
                  {visibles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={puedeEditar ? 7 : 6}
                        className="px-5 py-12 text-center text-stone-400"
                      >
                        {loading
                          ? "Cargando inventario..."
                          : items.length === 0
                            ? "Aún no hay productos registrados."
                            : "Ningún producto coincide con la búsqueda."}
                      </td>
                    </tr>
                  ) : (
                    visibles.map((i) => {
                      const nivel = nivelDe(i);
                      const ui = nivelUi[nivel];
                      const tope = Math.max(i.stock_minimo * 3, i.cantidad, 1);
                      return (
                        <tr
                          key={i.id_producto}
                          className="border-b border-stone-100 last:border-0 hover:bg-stone-50/70"
                        >
                          <td className="px-5 py-3.5">
                            <p
                              className={`m-0 font-medium ${i.estado ? "text-stone-900" : "text-stone-400"}`}
                            >
                              {i.nombre}
                            </p>
                            <p className="m-0 mt-0.5 text-xs text-stone-400">
                              {[i.marca, i.presentacion]
                                .filter(Boolean)
                                .join(" · ") || "Sin marca"}
                              {" · "}
                              <span className="font-mono">
                                {i.codigo_barras}
                              </span>
                              {i.fecha_caducidad && !caducidadDe(i) && (
                                <> · Cad. {fechaDia(i.fecha_caducidad)}</>
                              )}
                              {caducidadDe(i) && (
                                <span
                                  className={`ml-2 rounded-full px-2 py-0.5 font-medium ${caducidadDe(i)!.clase}`}
                                >
                                  {caducidadDe(i)!.texto}
                                </span>
                              )}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-stone-600">
                            {i.categoria}
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium text-stone-900">
                            {money.format(i.precio_venta)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="w-10 text-right text-base font-bold text-stone-900">
                                {i.cantidad}
                              </span>
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-100">
                                <div
                                  className={`h-full rounded-full ${ui.bar}`}
                                  style={{
                                    width: `${Math.min(100, (i.cantidad / tope) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right text-stone-500">
                            {i.stock_minimo}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ui.badge}`}
                            >
                              {ui.label}
                            </span>
                          </td>
                          {puedeEditar && (
<td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditando(i)}
                                aria-label={`Editar ${i.nombre}`}
                                title="Editar"
                                className="grid size-8 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-brand-50 hover:text-brand-800"
                              >
                                <svg {...svgProps}>
                                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => cambiarEstado(i)}
                                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                  i.estado
                                    ? "text-stone-500 hover:bg-rose-50 hover:text-rose-700"
                                    : "text-brand-800 hover:bg-brand-50"
                                }`}
                              >
                                {i.estado ? "Desactivar" : "Activar"}
                              </button>
                              <button
                                onClick={() => setEliminando(i)}
                                aria-label={`Eliminar ${i.nombre}`}
                                title="Eliminar permanentemente"
                                className="grid size-8 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-700"
                              >
                                <svg {...svgProps}>
                                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          </td>
)}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>


      {modalAbierto && (
        <ProductoModal
          categorias={categorias}
          onClose={() => setModalAbierto(false)}
          onSubmit={crearProducto}
        />
      )}
      {editando && (
        <ProductoModal
          key={editando.id_producto}
          categorias={categorias}
          producto={editando}
          onClose={() => setEditando(null)}
          onSubmit={(datos, nuevaCategoria) =>
            editarProducto(editando.id_producto, datos, nuevaCategoria)
          }
        />
      )}
      {eliminando && (
        <ConfirmarEliminarModal
          titulo="¿Eliminar producto?"
          mensaje={`Se eliminará "${eliminando.nombre}" de forma permanente, junto con sus ${eliminando.cantidad} unidades en inventario. Esta acción no se puede deshacer. Si solo quieres dejar de venderlo, usa "Desactivar".`}
          onClose={() => setEliminando(null)}
          onConfirm={() => eliminarProducto(eliminando.id_producto)}
        />
      )}
    </>
  );
};