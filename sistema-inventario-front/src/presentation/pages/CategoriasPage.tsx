import React, { useState } from "react";
import { CategoriaModal } from "../components/CategoriaModal";
import { useCategorias, type ItemCategoria } from "../hooks/useCategorias";
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

export const CategoriasPage: React.FC = () => {
  const { tiene } = useSesion();
  const puedeEditar = tiene("categorias.editar");
  const {
    items,
    loading,
    error,
    recargar,
    crearCategoria,
    actualizarCategoria,
  } = useCategorias();
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<ItemCategoria | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const alternarEstado = async (c: ItemCategoria) => {
    setErrorAccion(null);
    try {
      await actualizarCategoria(c.id_categoria, {
        nombre: c.nombre,
        estado: !c.estado,
      });
    } catch (err) {
      setErrorAccion(
        err instanceof Error ? err.message : "No se pudo completar la operación.",
      );
    }
  };

  const mensajeError = error ?? errorAccion;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-medium tracking-tight text-stone-900">
            Categorías
          </h1>
          <p className="mb-0 mt-1.5 text-sm text-stone-500">
            {items.length} {items.length === 1 ? "categoría" : "categorías"}{" "}
            registradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {puedeEditar && (
<button
            onClick={() => setCreando(true)}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-900"
          >
            <svg {...svgProps}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva categoría
          </button>
)}
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

      {mensajeError && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <svg {...svgProps} width={16} height={16}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {mensajeError}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-120 border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Productos</th>
                {puedeEditar && (
<th className="px-5 py-3 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
)}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={puedeEditar ? 4 : 3}
                    className="px-5 py-12 text-center text-stone-400"
                  >
                    {loading
                      ? "Cargando categorías..."
                      : "Aún no hay categorías registradas."}
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr
                    key={c.id_categoria}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50/70"
                  >
                    <td
                      className={`px-5 py-3.5 font-medium ${c.estado ? "text-stone-900" : "text-stone-400"}`}
                    >
                      {c.nombre}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          c.estado
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {c.estado ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-base font-bold text-stone-900">
                      {c.total_productos}
                    </td>
                    {puedeEditar && (
<td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditando(c)}
                          aria-label={`Editar ${c.nombre}`}
                          title="Editar nombre"
                          className="grid size-8 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-brand-50 hover:text-brand-800"
                        >
                          <svg {...svgProps}>
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => alternarEstado(c)}
                          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            c.estado
                              ? "text-stone-500 hover:bg-rose-50 hover:text-rose-700"
                              : "text-brand-800 hover:bg-brand-50"
                          }`}
                        >
                          {c.estado ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {creando && (
        <CategoriaModal
          onClose={() => setCreando(false)}
          onSubmit={crearCategoria}
        />
      )}
      {editando && (
        <CategoriaModal
          key={editando.id_categoria}
          categoria={editando}
          onClose={() => setEditando(null)}
          onSubmit={(nombre) =>
            actualizarCategoria(editando.id_categoria, {
              nombre,
              estado: editando.estado,
            })
          }
        />
      )}
    </>
  );
};
