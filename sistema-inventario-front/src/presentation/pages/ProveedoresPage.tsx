import React, { useMemo, useState } from "react";
import { PedidoModal } from "../components/PedidoModal";
import { ProveedorModal } from "../components/ProveedorModal";
import { useInventario } from "../hooks/useInventario";
import { usePedidos } from "../hooks/usePedidos";
import { useProveedores, type ItemProveedor } from "../hooks/useProveedores";
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

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export const ProveedoresPage: React.FC = () => {
  const { tiene } = useSesion();
  const puedeEditar = tiene("proveedores.editar");
  const puedePedir = tiene("pedidos.editar");
  const {
    items,
    loading,
    error,
    recargar,
    crearProveedor,
    actualizarProveedor,
  } = useProveedores();
  const { crearPedido } = usePedidos();
  const inventario = useInventario();
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<ItemProveedor | null>(null);
  const [pidiendo, setPidiendo] = useState<ItemProveedor | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const alternarEstado = async (p: ItemProveedor) => {
    setErrorAccion(null);
    try {
      await actualizarProveedor(p.id_proveedor, {
        nombre: p.nombre,
        telefono: p.telefono,
        correo: p.correo,
        estado: !p.estado,
      });
    } catch (err) {
      setErrorAccion(
        err instanceof Error ? err.message : "No se pudo completar la operación.",
      );
    }
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) =>
      [p.nombre, p.telefono, p.correo]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(q)),
    );
  }, [items, busqueda]);

  const activos = items.filter((p) => p.estado).length;
  const mensajeError = error ?? errorAccion;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-medium tracking-tight text-stone-900">
            Proveedores
          </h1>
          <p className="mb-0 mt-1.5 text-sm text-stone-500">
            {items.length} {items.length === 1 ? "proveedor" : "proveedores"}{" "}
            registrados · {activos} {activos === 1 ? "activo" : "activos"}
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
            Nuevo proveedor
          </button>
)}
          <button
            onClick={() => {
              void recargar();
              void inventario.recargar();
            }}
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

      {aviso && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900"
        >
          {aviso}
          <button
            onClick={() => setAviso(null)}
            aria-label="Cerrar aviso"
            className="cursor-pointer text-emerald-700 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      <div className="group relative mb-4 flex items-center">
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
          placeholder="Buscar por nombre, teléfono o correo"
          className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-5 py-3">Contacto</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Compras</th>
                <th className="px-5 py-3 text-right">Total comprado</th>
                {(puedeEditar || puedePedir) && (
<th className="px-5 py-3 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
)}
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={puedeEditar || puedePedir ? 6 : 5} className="px-5 py-12 text-center text-stone-400">
                    {loading
                      ? "Cargando proveedores..."
                      : items.length === 0
                        ? "Aún no hay proveedores registrados."
                        : "Ningún proveedor coincide con la búsqueda."}
                  </td>
                </tr>
              ) : (
                visibles.map((p) => (
                  <tr
                    key={p.id_proveedor}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50/70"
                  >
                    <td
                      className={`px-5 py-3.5 font-medium ${p.estado ? "text-stone-900" : "text-stone-400"}`}
                    >
                      {p.nombre}
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      {p.telefono || p.correo ? (
                        <>
                          {p.telefono && <p className="m-0">{p.telefono}</p>}
                          {p.correo && (
                            <p className="m-0 text-xs text-stone-400">{p.correo}</p>
                          )}
                        </>
                      ) : (
                        <span className="text-stone-300">Sin datos</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          p.estado
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {p.estado ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-stone-900">
                      {p.num_compras}
                    </td>
                    <td className="px-5 py-3.5 text-right text-stone-700">
                      {dinero.format(p.total_comprado)}
                    </td>
                    {(puedeEditar || puedePedir) && (
<td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {puedePedir && (
<button
                          onClick={() => setPidiendo(p)}
                          disabled={!p.estado}
                          title={p.estado ? "Crear un pedido en espera" : "Activa el proveedor para hacer pedidos"}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent"
                        >
                          <svg {...svgProps} width={15} height={15}>
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0" />
                          </svg>
                          Pedir
                        </button>
)}
                        {puedeEditar && (
<button
                          onClick={() => setEditando(p)}
                          aria-label={`Editar ${p.nombre}`}
                          title="Editar"
                          className="grid size-8 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-brand-50 hover:text-brand-800"
                        >
                          <svg {...svgProps}>
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
)}
                        {puedeEditar && (
<button
                          onClick={() => alternarEstado(p)}
                          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            p.estado
                              ? "text-stone-500 hover:bg-rose-50 hover:text-rose-700"
                              : "text-brand-800 hover:bg-brand-50"
                          }`}
                        >
                          {p.estado ? "Desactivar" : "Activar"}
                        </button>
)}
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
        <ProveedorModal
          onClose={() => setCreando(false)}
          onSubmit={crearProveedor}
        />
      )}
      {editando && (
        <ProveedorModal
          key={editando.id_proveedor}
          proveedor={editando}
          onClose={() => setEditando(null)}
          onSubmit={(datos) => actualizarProveedor(editando.id_proveedor, datos)}
        />
      )}
      {pidiendo && (
        <PedidoModal
          key={pidiendo.id_proveedor}
          proveedor={pidiendo}
          productos={inventario.items}
          onClose={() => setPidiendo(null)}
          onGuardar={async (detalles) => {
            await crearPedido(pidiendo.id_proveedor, detalles);
            setAviso(
              `Pedido a ${pidiendo.nombre} creado en espera. Lo encuentras en la sección Pedidos.`,
            );
          }}
        />
      )}
    </>
  );
};