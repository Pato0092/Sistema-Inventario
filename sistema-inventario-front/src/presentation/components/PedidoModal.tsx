import React, { useMemo, useState } from "react";
import type {
  DetallePedidoDto,
  PedidoDto,
} from "../../infrastructure/api/inventarioApi";
import type { ItemInventario } from "../hooks/useInventario";
import type { ProductoDeProveedor } from "../hooks/useProveedores";

interface PedidoModalProps {
  proveedor: { nombre: string; catalogo: ProductoDeProveedor[] };
  productos: ItemInventario[];
  pedido?: PedidoDto;
  onClose: () => void;
  onGuardar: (detalles: DetallePedidoDto[]) => Promise<void>;
}

interface Linea {
  cantidad: string;
  precio: string;
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-right text-sm text-stone-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15";

export const PedidoModal: React.FC<PedidoModalProps> = ({
  proveedor,
  productos,
  pedido,
  onClose,
  onGuardar,
}) => {
  const editando = pedido !== undefined;

  const todos = useMemo(
    () => new Map(productos.map((p) => [p.id_producto, p])),
    [productos],
  );
  const catalogo = useMemo(
    () =>
      proveedor.catalogo.filter((c) => todos.get(c.id_producto)?.estado),
    [proveedor.catalogo, todos],
  );
  const idsCatalogo = useMemo(
    () => new Set(catalogo.map((c) => c.id_producto)),
    [catalogo],
  );

  const [lineas, setLineas] = useState<Record<number, Linea>>(() => {
    const inicial: Record<number, Linea> = Object.fromEntries(
      catalogo.map((c) => [
        c.id_producto,
        { cantidad: "", precio: String(c.ultimo_precio) },
      ]),
    );
    for (const d of pedido?.detalles ?? []) {
      inicial[d.id_producto] = {
        cantidad: String(d.cantidad),
        precio: String(d.precio_proveedor),
      };
    }
    return inicial;
  });
  const [extras, setExtras] = useState<number[]>(() =>
    (pedido?.detalles ?? [])
      .map((d) => d.id_producto)
      .filter((id) => !idsCatalogo.has(id)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const filas = [...catalogo.map((c) => c.id_producto), ...extras].filter((id) =>
    todos.has(id),
  );
  const disponiblesParaAgregar = productos
    .filter(
      (p) =>
        p.estado && !idsCatalogo.has(p.id_producto) && !extras.includes(p.id_producto),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const cambiar = (id: number, cambio: Partial<Linea>) => {
    setError(null);
    setLineas((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { cantidad: "", precio: "" }), ...cambio },
    }));
  };

  const seleccionadas = filas
    .map((id) => {
      const l = lineas[id] ?? { cantidad: "", precio: "" };
      return {
        id,
        cantidad: Number(l.cantidad),
        precio: Number(l.precio),
        producto: todos.get(id)!,
      };
    })
    .filter((l) => l.cantidad > 0);

  const total = seleccionadas.reduce(
    (a, l) => a + (l.precio > 0 ? l.cantidad * l.precio : 0),
    0,
  );
  const unidades = seleccionadas.reduce((a, l) => a + l.cantidad, 0);

  const validar = (): string | null => {
    if (seleccionadas.length === 0)
      return editando
        ? "El pedido no puede quedar vacío. Para descartarlo usa «Cancelar pedido» en la lista."
        : "Selecciona al menos un producto.";
    for (const l of seleccionadas) {
      if (!Number.isInteger(l.cantidad))
        return `La cantidad de "${l.producto.nombre}" debe ser un número entero.`;
      if (!(l.precio > 0))
        return `Escribe un precio mayor a 0 para "${l.producto.nombre}".`;
      if (!l.producto.estado)
        return `"${l.producto.nombre}" está inactivo: quítalo del pedido.`;
    }
    return null;
  };

  const sugerir = () => {
    const nuevas = { ...lineas };
    let sugeridos = 0;
    for (const c of catalogo) {
      const p = todos.get(c.id_producto);
      if (!p || !p.estado || p.cantidad > p.stock_minimo) continue;
      const objetivo = Math.max(p.stock_minimo * 2, c.ultima_cantidad);
      nuevas[c.id_producto] = {
        cantidad: String(Math.max(objetivo - p.cantidad, 1)),
        precio: nuevas[c.id_producto]?.precio || String(c.ultimo_precio),
      };
      sugeridos++;
    }
    const fuera = productos.filter(
      (p) =>
        p.estado &&
        p.cantidad <= p.stock_minimo &&
        !idsCatalogo.has(p.id_producto) &&
        !extras.includes(p.id_producto),
    ).length;
    setLineas(nuevas);
    setError(null);
    setAviso(
      sugeridos === 0
        ? "Ningún producto de este proveedor está en o bajo su stock mínimo."
        : `Se sugirieron ${sugeridos} ${sugeridos === 1 ? "producto" : "productos"} con stock bajo. Ajusta las cantidades si lo necesitas.` +
            (fuera > 0
              ? ` Hay ${fuera} más con stock bajo que este proveedor nunca ha surtido; agrégalos con el selector si quieres.`
              : ""),
    );
  };

  const copiarPedido = async () => {
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    const texto = [
      `Pedido para ${proveedor.nombre}`,
      ...seleccionadas.map(
        (l) =>
          `- ${l.cantidad} × ${l.producto.nombre} @ ${dinero.format(l.precio)} = ${dinero.format(l.cantidad * l.precio)}`,
      ),
      `Total: ${dinero.format(total)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar al portapapeles.");
    }
  };

  const guardar = async () => {
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onGuardar(
        seleccionadas.map((l) => ({
          id_producto: l.id,
          cantidad: l.cantidad,
          precio_proveedor: l.precio,
        })),
      );
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
        aria-labelledby="pedido-titulo"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-stone-200 bg-stone-50 shadow-xl shadow-stone-900/10"
      >
        <div className="border-b border-stone-200 px-6 py-5">
          <h2
            id="pedido-titulo"
            className="m-0 text-xl font-bold tracking-tight text-stone-900"
          >
            {editando ? `Editar pedido #${pedido.id_pedido}` : "Nuevo pedido"} ·{" "}
            {proveedor.nombre}
          </h2>
          <p className="mb-0 mt-1 text-sm text-stone-500">
            {editando
              ? "Quita los productos que no llegaron o ajusta cantidades y precios."
              : "Arma el carrito: marca los productos y la cantidad. Los precios son los de tu última compra y puedes cambiarlos."}{" "}
            El inventario no cambia hasta que marques el pedido como entregado.
          </p>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {filas.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={sugerir}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800"
              >
                Sugerir lo que falta
              </button>
              {aviso && <p className="m-0 min-w-0 flex-1 text-xs text-stone-500">{aviso}</p>}
            </div>
          )}
          {filas.length === 0 && (
            <p className="m-0 rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
              Aún no le has comprado productos a este proveedor. Agrega
              productos del inventario con el selector de abajo.
            </p>
          )}

          {filas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-136 border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    <th className="w-8 pb-2" />
                    <th className="pb-2">Producto</th>
                    <th className="w-24 pb-2 text-right">Cantidad</th>
                    <th className="w-28 pb-2 pl-3 text-right">Precio</th>
                    <th className="w-28 pb-2 pl-3 text-right">Subtotal</th>
                    <th className="w-8 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {filas.map((id) => {
                    const p = todos.get(id)!;
                    const l = lineas[id] ?? { cantidad: "", precio: "" };
                    const cant = Number(l.cantidad);
                    const prec = Number(l.precio);
                    const marcado = cant > 0;
                    const hist = proveedor.catalogo.find((c) => c.id_producto === id);
                    const esExtra = extras.includes(id);
                    return (
                      <tr key={id} className="border-t border-stone-200">
                        <td className="py-2.5 pr-2">
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={(e) =>
                              cambiar(id, { cantidad: e.target.checked ? "1" : "" })
                            }
                            aria-label={`Incluir ${p.nombre}`}
                            className="size-4 cursor-pointer accent-brand-800"
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <p className="m-0 font-medium text-stone-900">
                            {p.nombre}
                            {!p.estado && (
                              <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
                                Inactivo
                              </span>
                            )}
                          </p>
                          <p className="m-0 text-xs text-stone-400">
                            En inventario: {p.cantidad}
                            {p.stock_minimo > 0 && ` (mínimo ${p.stock_minimo})`}
                            {hist &&
                              ` · Última compra: ${hist.ultima_cantidad} u. el ${new Date(hist.ultima_fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`}
                          </p>
                        </td>
                        <td className="py-2.5">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={l.cantidad}
                            onChange={(e) => cambiar(id, { cantidad: e.target.value })}
                            aria-label={`Cantidad de ${p.nombre}`}
                            placeholder="0"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-2.5 pl-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.precio}
                            onChange={(e) => cambiar(id, { precio: e.target.value })}
                            aria-label={`Precio de ${p.nombre}`}
                            placeholder="0.00"
                            className={inputClass}
                          />
                        </td>
                        <td className="py-2.5 pl-3 text-right font-semibold text-stone-900">
                          {marcado && prec > 0 ? dinero.format(cant * prec) : "—"}
                        </td>
                        <td className="py-2.5 pl-1 text-right">
                          {esExtra && (
                            <button
                              onClick={() => {
                                setExtras((x) => x.filter((e) => e !== id));
                                cambiar(id, { cantidad: "" });
                              }}
                              aria-label={`Quitar ${p.nombre}`}
                              title="Quitar de la lista"
                              className="grid size-7 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-700"
                            >
                              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                                <path d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {disponiblesParaAgregar.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5">
              <label htmlFor="pedido-agregar" className="text-sm font-medium text-stone-700">
                Agregar otro producto del inventario
              </label>
              <select
                id="pedido-agregar"
                value=""
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (!id) return;
                  setExtras((x) => [...x, id]);
                  cambiar(id, { cantidad: "1", precio: "" });
                }}
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
              >
                <option value="">Selecciona un producto…</option>
                {disponiblesParaAgregar.map((p) => (
                  <option key={p.id_producto} value={p.id_producto}>
                    {p.nombre}
                    {p.marca ? ` · ${p.marca}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="border-t border-stone-200 px-6 py-4">
          {error && (
            <div
              role="alert"
              className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-medium uppercase tracking-wider text-stone-400">
                Costo total
              </p>
              <p className="m-0 text-2xl font-semibold tracking-tight text-stone-900">
                {dinero.format(total)}
              </p>
              <p className="m-0 text-xs text-stone-400">
                {seleccionadas.length}{" "}
                {seleccionadas.length === 1 ? "producto" : "productos"} ·{" "}
                {unidades} {unidades === 1 ? "unidad" : "unidades"}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-400"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={copiarPedido}
                disabled={saving}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800"
              >
                {copiado ? "¡Copiado!" : "Copiar pedido"}
              </button>
              <button
                type="button"
                onClick={guardar}
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
                    : "Crear pedido en espera"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};