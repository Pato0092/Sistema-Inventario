import React, { useMemo, useState } from "react";
import type {
  EstadoPedido,
  PedidoDto,
} from "../../infrastructure/api/inventarioApi";
import {
  descargarCsv,
  escaparHtml,
  imprimirDocumento,
} from "../../infrastructure/archivos/exportar";
import { ConfirmarEliminarModal } from "../components/ConfirmarEliminarModal";
import { PedidoModal } from "../components/PedidoModal";
import { Segmentado } from "../components/charts";
import { useInventario } from "../hooks/useInventario";
import { usePedidos } from "../hooks/usePedidos";
import { useProveedores } from "../hooks/useProveedores";
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

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const estadoUi: Record<EstadoPedido, { label: string; badge: string }> = {
  EN_ESPERA: { label: "En espera", badge: "bg-amber-100 text-amber-800" },
  ENTREGADO: { label: "Entregado", badge: "bg-emerald-100 text-emerald-800" },
  CANCELADO: { label: "Cancelado", badge: "bg-stone-200 text-stone-600" },
};

type Filtro = "EN_ESPERA" | "ENTREGADO" | "CANCELADO" | "todos";

const filtros = [
  ["EN_ESPERA", "En espera"],
  ["ENTREGADO", "Entregados"],
  ["CANCELADO", "Cancelados"],
  ["todos", "Todos"],
] as const;

type Accion = { tipo: "entregar" | "cancelar"; pedido: PedidoDto };

export const PedidosPage: React.FC = () => {
  const { tiene } = useSesion();
  const puedeEditar = tiene("pedidos.editar");
  const pedidos = usePedidos();
  const proveedores = useProveedores();
  const inventario = useInventario();

  const [filtro, setFiltro] = useState<Filtro>("EN_ESPERA");
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());
  const [editando, setEditando] = useState<PedidoDto | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);

  const loading = pedidos.loading || proveedores.loading || inventario.loading;
  const error = pedidos.error ?? proveedores.error ?? inventario.error;
  const recargar = () => {
    void pedidos.recargar();
    void proveedores.recargar();
    void inventario.recargar();
  };

  const proveedorDe = (id: number) =>
    proveedores.items.find((p) => p.id_proveedor === id);
  const nombreProducto = (id: number) =>
    inventario.items.find((p) => p.id_producto === id)?.nombre ??
    `Producto #${id}`;

  const visibles = useMemo(
    () =>
      pedidos.items.filter((p) => filtro === "todos" || p.estado === filtro),
    [pedidos.items, filtro],
  );
  const enEspera = pedidos.items.filter((p) => p.estado === "EN_ESPERA").length;

  const imprimirPedido = (p: PedidoDto) => {
    const prov = proveedorDe(p.id_proveedor);
    imprimirDocumento(
      `Pedido ${p.id_pedido}`,
      `<h1>Pedido #${p.id_pedido}</h1>
       <p class="meta">${escaparHtml(prov?.nombre ?? `Proveedor #${p.id_proveedor}`)}
         ${prov?.telefono ? " · " + escaparHtml(prov.telefono) : ""}${prov?.correo ? " · " + escaparHtml(prov.correo) : ""}
         <br>${escaparHtml(fechaCorta(p.fecha_hora))} · ${escaparHtml(estadoUi[p.estado].label)}</p>
       <table><thead><tr><th>Producto</th><th class="der">Cantidad</th><th class="der">Precio</th><th class="der">Importe</th></tr></thead><tbody>
       ${p.detalles
         .map(
           (d) =>
             `<tr><td>${escaparHtml(nombreProducto(d.id_producto))}</td><td class="der">${d.cantidad}</td><td class="der">${escaparHtml(dinero.format(d.precio_proveedor))}</td><td class="der">${escaparHtml(dinero.format(d.subtotal))}</td></tr>`,
         )
         .join("")}
       </tbody></table><p class="tot">Total ${escaparHtml(dinero.format(p.total))}</p>`,
    );
  };

  const exportarCsv = () =>
    descargarCsv(
      "pedidos",
      [
        { titulo: "Pedido", valor: ({ p }) => p.id_pedido },
        { titulo: "Fecha", valor: ({ p }) => fechaCorta(p.fecha_hora) },
        { titulo: "Proveedor", valor: ({ p }) => proveedorDe(p.id_proveedor)?.nombre ?? `Proveedor #${p.id_proveedor}` },
        { titulo: "Estado", valor: ({ p }) => estadoUi[p.estado].label },
        { titulo: "Producto", valor: ({ d }) => nombreProducto(d.id_producto) },
        { titulo: "Cantidad", valor: ({ d }) => d.cantidad },
        { titulo: "Precio", valor: ({ d }) => d.precio_proveedor },
        { titulo: "Subtotal", valor: ({ d }) => d.subtotal },
      ],
      visibles.flatMap((p) => p.detalles.map((d) => ({ p, d }))),
    );

  const alternar = (id: number) =>
    setAbiertos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-medium tracking-tight text-stone-900">
            Pedidos
          </h1>
          <p className="mb-0 mt-1.5 text-sm text-stone-500">
            {enEspera === 0
              ? "No tienes pedidos esperando entrega."
              : `${enEspera} ${enEspera === 1 ? "pedido espera" : "pedidos esperan"} a que el proveedor surta.`}{" "}
            Los pedidos nuevos se crean desde Proveedores.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmentado opciones={filtros} valor={filtro} onChange={setFiltro} />
          <button
            onClick={exportarCsv}
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

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <svg {...svgProps} width={16} height={16}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3">Pedido</th>
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-5 py-3 text-right">Productos</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                    {loading
                      ? "Cargando pedidos..."
                      : pedidos.items.length === 0
                        ? "Aún no has creado pedidos. Ve a Proveedores y pulsa «Pedir»."
                        : "No hay pedidos con este estado."}
                  </td>
                </tr>
              ) : (
                visibles.map((p) => {
                  const ui = estadoUi[p.estado];
                  const abierto = abiertos.has(p.id_pedido);
                  const unidades = p.detalles.reduce((a, d) => a + d.cantidad, 0);
                  return (
                    <React.Fragment key={p.id_pedido}>
                      <tr className="border-b border-stone-100 hover:bg-stone-50/70">
                        <td className="px-3 py-3.5">
                          <button
                            onClick={() => alternar(p.id_pedido)}
                            aria-expanded={abierto}
                            aria-label={abierto ? "Ocultar productos" : "Ver productos"}
                            className="grid size-8 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                          >
                            <svg
                              {...svgProps}
                              className={`transition ${abierto ? "rotate-90" : ""}`}
                            >
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="m-0 font-semibold text-stone-900">
                            #{p.id_pedido}
                          </p>
                          <p className="m-0 text-xs text-stone-400">
                            {fechaCorta(p.fecha_hora)}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-stone-800">
                          {proveedorDe(p.id_proveedor)?.nombre ??
                            `Proveedor #${p.id_proveedor}`}
                        </td>
                        <td className="px-5 py-3.5 text-right text-stone-700">
                          {p.detalles.length}{" "}
                          <span className="text-xs text-stone-400">
                            ({unidades} u.)
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-stone-900">
                          {dinero.format(p.total)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ui.badge}`}
                          >
                            {ui.label}
                          </span>
                          {p.estado === "ENTREGADO" && p.fecha_entrega && (
                            <p className="m-0 mt-1 text-xs text-stone-400">
                              el {fechaCorta(p.fecha_entrega)} · compra #{p.id_compra}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => imprimirPedido(p)}
                            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                          >
                            Imprimir
                          </button>
                          {p.estado === "EN_ESPERA" && puedeEditar && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditando(p)}
                                aria-label={`Editar pedido ${p.id_pedido}`}
                                title="Editar pedido"
                                className="grid size-8 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-brand-50 hover:text-brand-800"
                              >
                                <svg {...svgProps}>
                                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setAccion({ tipo: "cancelar", pedido: p })}
                                className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-rose-50 hover:text-rose-700"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => setAccion({ tipo: "entregar", pedido: p })}
                                className="cursor-pointer rounded-lg bg-brand-800 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                              >
                                Marcar entregado
                              </button>
                            </div>
                          )}
                          </div>
                        </td>
                      </tr>
                      {abierto && (
                        <tr className="border-b border-stone-100 bg-stone-50/60">
                          <td />
                          <td colSpan={6} className="px-3 py-3">
                            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                              {p.detalles.map((d) => (
                                <li
                                  key={d.id_producto}
                                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                                >
                                  <span className="text-stone-700">
                                    <span className="font-semibold text-stone-900">
                                      {d.cantidad} ×
                                    </span>{" "}
                                    {nombreProducto(d.id_producto)}
                                    <span className="text-stone-400">
                                      {" "}
                                      @ {dinero.format(d.precio_proveedor)}
                                    </span>
                                  </span>
                                  <span className="font-medium text-stone-900">
                                    {dinero.format(d.subtotal)}
                                  </span>
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

      {editando && proveedorDe(editando.id_proveedor) && (
        <PedidoModal
          key={editando.id_pedido}
          proveedor={proveedorDe(editando.id_proveedor)!}
          productos={inventario.items}
          pedido={editando}
          onClose={() => setEditando(null)}
          onGuardar={(detalles) =>
            pedidos.actualizarPedido(editando.id_pedido, detalles)
          }
        />
      )}

      {accion?.tipo === "entregar" && (
        <ConfirmarEliminarModal
          tono="normal"
          titulo={`¿Marcar el pedido #${accion.pedido.id_pedido} como entregado?`}
          mensaje={`Se registrará una compra por ${dinero.format(accion.pedido.total)} y se sumarán ${accion.pedido.detalles.reduce((a, d) => a + d.cantidad, 0)} unidades de ${accion.pedido.detalles.length} ${accion.pedido.detalles.length === 1 ? "producto" : "productos"} al inventario. Si algún producto no llegó, edita el pedido antes de continuar.`}
          textoConfirmar="Sí, ya llegó"
          textoOcupado="Registrando..."
          textoCancelar="Todavía no"
          onClose={() => setAccion(null)}
          onConfirm={async () => {
            await pedidos.entregarPedido(accion.pedido.id_pedido);
            void inventario.recargar();
            void proveedores.recargar();
          }}
        />
      )}
      {accion?.tipo === "cancelar" && (
        <ConfirmarEliminarModal
          titulo={`¿Cancelar el pedido #${accion.pedido.id_pedido}?`}
          mensaje="El pedido quedará como cancelado y ya no se podrá editar ni marcar como entregado. El inventario no se modifica."
          textoConfirmar="Cancelar pedido"
          textoOcupado="Cancelando..."
          textoCancelar="Mantenerlo"
          onClose={() => setAccion(null)}
          onConfirm={() => pedidos.cancelarPedido(accion.pedido.id_pedido)}
        />
      )}
    </>
  );
};