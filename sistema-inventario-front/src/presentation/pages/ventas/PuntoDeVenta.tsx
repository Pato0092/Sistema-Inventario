import React, { useMemo, useRef, useState } from "react";
import { inventarioApi } from "../../../infrastructure/api/inventarioApi";
import { mensajeError } from "../../../infrastructure/api/mensajeError";
import { dinero } from "../../formato";
import type { ItemInventario } from "../../hooks/useInventario";

interface PuntoDeVentaProps {
  items: ItemInventario[];
  cargandoInventario: boolean;
  recargarInventario: () => void | Promise<void>;
}

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

export const PuntoDeVenta: React.FC<PuntoDeVentaProps> = ({
  items,
  cargandoInventario,
  recargarInventario,
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<Record<number, number>>({});
  const [recibido, setRecibido] = useState("");
  const [cobrando, setCobrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultima, setUltima] = useState<{ id: number; total: number; cambio: number | null } | null>(null);
  const buscador = useRef<HTMLInputElement>(null);

  const porId = useMemo(() => new Map(items.map((i) => [i.id_producto, i])), [items]);
  const vendibles = useMemo(
    () => items.filter((i) => i.estado && i.cantidad > 0).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [items],
  );
  const q = busqueda.trim().toLowerCase();
  const resultados = useMemo(
    () =>
      (q
        ? vendibles.filter((i) =>
            [i.nombre, i.marca, i.presentacion, i.codigo_barras]
              .filter(Boolean)
              .some((t) => String(t).toLowerCase().includes(q)),
          )
        : vendibles
      ).slice(0, 12),
    [vendibles, q],
  );

  const lineas = Object.entries(carrito)
    .map(([id, cantidad]) => ({ item: porId.get(Number(id))!, cantidad }))
    .filter((l) => l.item);
  const total = lineas.reduce((a, l) => a + l.cantidad * l.item.precio_venta, 0);
  const unidades = lineas.reduce((a, l) => a + l.cantidad, 0);
  const recibidoNum = Number(recibido);
  const cambio = recibido !== "" && recibidoNum >= total ? recibidoNum - total : null;
  const falta = recibido !== "" && recibidoNum < total ? total - recibidoNum : null;

  const fijarCantidad = (item: ItemInventario, nueva: number) => {
    if (nueva > item.cantidad) {
      setError(`Solo hay ${item.cantidad} de "${item.nombre}" en existencia.`);
      nueva = item.cantidad;
    } else {
      setError(null);
    }
    setUltima(null);
    setCarrito((prev) => {
      const siguiente = { ...prev };
      if (nueva <= 0) delete siguiente[item.id_producto];
      else siguiente[item.id_producto] = nueva;
      return siguiente;
    });
  };

  const agregar = (item: ItemInventario) =>
    fijarCantidad(item, (carrito[item.id_producto] ?? 0) + 1);

  const alPulsarEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const texto = busqueda.trim();
    if (!texto) return;
    const exacto = items.find((i) => i.estado && i.codigo_barras === texto);
    if (exacto) {
      if (exacto.cantidad <= 0) setError(`No hay existencias de "${exacto.nombre}".`);
      else agregar(exacto);
      setBusqueda("");
    } else if (resultados.length === 1) {
      agregar(resultados[0]);
      setBusqueda("");
    } else if (resultados.length === 0) {
      setError("No se encontró ningún producto con existencias.");
    } else {
      setError("Hay varios resultados: elige uno de la lista.");
    }
  };

  const cobrar = async () => {
    setCobrando(true);
    setError(null);
    try {
      const venta = await inventarioApi.registrarVenta(
        lineas.map((l) => ({ id_producto: l.item.id_producto, cantidad: l.cantidad })),
      );
      setUltima({ id: venta.id_venta, total: venta.total, cambio });
      setCarrito({});
      setRecibido("");
      await recargarInventario();
      buscador.current?.focus();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCobrando(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      {/* Buscador y resultados */}
      <section>
        <div className="group relative flex items-center">
          <span className="pointer-events-none absolute left-3.5 text-stone-400 transition group-focus-within:text-stone-900">
            <svg {...svgProps}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            ref={buscador}
            autoFocus
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setError(null);
            }}
            onKeyDown={alPulsarEnter}
            placeholder="Escanea un código de barras o busca por nombre"
            aria-label="Buscar producto"
            className="w-full rounded-lg border border-stone-300 bg-white py-3.5 pl-11 pr-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
          />
        </div>

        <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
          {resultados.length === 0 ? (
            <li className="rounded-lg border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-400">
              {cargandoInventario
                ? "Cargando productos..."
                : q
                  ? "Ningún producto con existencias coincide con la búsqueda."
                  : "No hay productos con existencias para vender."}
            </li>
          ) : (
            resultados.map((i) => {
              const enCarrito = carrito[i.id_producto] ?? 0;
              return (
                <li key={i.id_producto}>
                  <button
                    onClick={() => {
                      agregar(i);
                      buscador.current?.focus();
                    }}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white px-4 py-3 text-left transition hover:border-brand-600"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-stone-900">{i.nombre}</span>
                      <span className="block truncate text-xs text-stone-400">
                        {[i.marca, i.presentacion].filter(Boolean).join(" · ") || "Sin marca"} ·{" "}
                        <span className="font-mono">{i.codigo_barras}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold text-stone-900">{dinero.format(i.precio_venta)}</span>
                      <span className="block text-xs text-stone-400">
                        {i.cantidad - enCarrito} disp.
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* Carrito */}
      <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 lg:sticky lg:top-0">
        <h2 className="m-0 text-base font-semibold text-stone-900">
          Venta actual
          {unidades > 0 && <span className="ml-2 font-normal text-stone-400">{unidades} u.</span>}
        </h2>

        {ultima && (
          <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
            Venta #{ultima.id} registrada por {dinero.format(ultima.total)}
            {ultima.cambio !== null && ultima.cambio > 0 && <> · cambio {dinero.format(ultima.cambio)}</>}.
          </div>
        )}
        {error && (
          <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        {lineas.length === 0 ? (
          <p className="mb-0 mt-4 rounded-lg border border-dashed border-stone-300 px-3 py-8 text-center text-sm text-stone-400">
            Agrega productos para empezar la venta.
          </p>
        ) : (
          <ul className="m-0 mt-3 flex list-none flex-col divide-y divide-stone-100 p-0">
            {lineas.map(({ item, cantidad }) => (
              <li key={item.id_producto} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-stone-900">{item.nombre}</span>
                  <span className="shrink-0 text-sm font-semibold text-stone-900">
                    {dinero.format(cantidad * item.precio_venta)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-stone-400">{dinero.format(item.precio_venta)} c/u</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => fijarCantidad(item, cantidad - 1)}
                      aria-label={`Quitar una unidad de ${item.nombre}`}
                      className="grid size-7 cursor-pointer place-items-center rounded-lg border border-stone-300 text-stone-600 transition hover:border-brand-600"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={item.cantidad}
                      value={cantidad}
                      onChange={(e) => fijarCantidad(item, Math.floor(Number(e.target.value)) || 0)}
                      aria-label={`Cantidad de ${item.nombre}`}
                      className="w-12 rounded-lg border border-stone-300 py-1 text-center text-sm outline-none focus:border-brand-600"
                    />
                    <button
                      onClick={() => fijarCantidad(item, cantidad + 1)}
                      aria-label={`Agregar una unidad de ${item.nombre}`}
                      className="grid size-7 cursor-pointer place-items-center rounded-lg border border-stone-300 text-stone-600 transition hover:border-brand-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-stone-200 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-stone-500">Total</span>
            <span className="text-3xl font-semibold tracking-tight text-stone-900">{dinero.format(total)}</span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <label htmlFor="pv-recibido" className="text-sm text-stone-500">
              Recibido
            </label>
            <input
              id="pv-recibido"
              type="number"
              min="0"
              step="0.01"
              value={recibido}
              onChange={(e) => setRecibido(e.target.value)}
              placeholder="0.00"
              disabled={lineas.length === 0}
              className="w-32 rounded-lg border border-stone-300 px-3 py-2 text-right text-sm outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:bg-stone-50"
            />
          </div>
          {(cambio !== null || falta !== null) && (
            <p className={`mb-0 mt-2 text-right text-sm font-medium ${falta !== null ? "text-rose-700" : "text-stone-900"}`}>
              {falta !== null ? `Faltan ${dinero.format(falta)}` : `Cambio ${dinero.format(cambio ?? 0)}`}
            </p>
          )}

          <button
            onClick={cobrar}
            disabled={lineas.length === 0 || cobrando}
            className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cobrando && <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />}
            {cobrando ? "Registrando..." : "Cobrar"}
          </button>
          {lineas.length > 0 && (
            <button
              onClick={() => {
                setCarrito({});
                setRecibido("");
                setError(null);
              }}
              className="mt-2 w-full cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-stone-500 transition hover:text-stone-900"
            >
              Vaciar venta
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
