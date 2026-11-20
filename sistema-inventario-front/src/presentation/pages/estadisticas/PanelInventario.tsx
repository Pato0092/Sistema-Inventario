import React, { useMemo, useState } from "react";
import {
  BarList,
  Segmentado,
  StatTile,
  Tarjeta,
  Tooltip,
  type BarraItem,
  type TooltipState,
} from "../../components/charts";
import { diasHasta, fechaDia } from "../../formato";
import { useInventario, type ItemInventario } from "../../hooks/useInventario";

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

const numero = new Intl.NumberFormat("es-MX");
const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});


type Nivel = "ok" | "bajo" | "agotado";

const nivelDe = (i: ItemInventario): Nivel =>
  i.cantidad === 0 ? "agotado" : i.cantidad <= i.stock_minimo ? "bajo" : "ok";

const niveles: {
  id: Nivel;
  nombre: string;
  fondo: string;
  texto: string;
}[] = [
  { id: "ok", nombre: "Disponible", fondo: "bg-emerald-700", texto: "text-white" },
  { id: "bajo", nombre: "Stock bajo", fondo: "bg-amber-400", texto: "text-stone-900" },
  { id: "agotado", nombre: "Agotado", fondo: "bg-rose-600", texto: "text-white" },
];

type Medida = "unidades" | "valor";

export const PanelInventario: React.FC = () => {
  const { items, loading, error, recargar } = useInventario();
  const [medida, setMedida] = useState<Medida>("unidades");
  const [tip, setTip] = useState<TooltipState | null>(null);

  const datos = useMemo(() => {
    const activos = items.filter((i) => i.estado);
    const valorDe = (i: ItemInventario) => i.cantidad * i.precio_venta;

    const conteo: Record<Nivel, number> = { ok: 0, bajo: 0, agotado: 0 };
    for (const i of activos) conteo[nivelDe(i)]++;

    const porCategoria = new Map<
      string,
      { unidades: number; valor: number; productos: number }
    >();
    for (const i of activos) {
      const c = porCategoria.get(i.categoria) ?? {
        unidades: 0,
        valor: 0,
        productos: 0,
      };
      c.unidades += i.cantidad;
      c.valor += valorDe(i);
      c.productos += 1;
      porCategoria.set(i.categoria, c);
    }

    return {
      total: activos.length,
      unidades: activos.reduce((a, i) => a + i.cantidad, 0),
      valor: activos.reduce((a, i) => a + valorDe(i), 0),
      conteo,
      categorias: [...porCategoria.entries()].map(([nombre, c]) => ({
        nombre,
        ...c,
      })),
      topValor: [...activos]
        .map((i) => ({ i, valor: valorDe(i) }))
        .filter((x) => x.valor > 0)
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5),
      reponer: activos
        .filter((i) => nivelDe(i) !== "ok")
        .sort((a, b) => a.cantidad - b.cantidad),
      caducan: activos
        .filter((i) => i.cantidad > 0 && i.fecha_caducidad && diasHasta(i.fecha_caducidad) <= 30)
        .sort((a, b) => a.fecha_caducidad!.localeCompare(b.fecha_caducidad!)),
    };
  }, [items]);

  const barrasCategoria: BarraItem[] = [...datos.categorias]
    .sort((a, b) => b[medida] - a[medida])
    .map((c) => ({
      id: c.nombre,
      etiqueta: c.nombre,
      valor: c[medida],
      texto:
        medida === "unidades"
          ? `${numero.format(c.unidades)} u.`
          : dinero.format(c.valor),
      detalle: `${c.productos} ${c.productos === 1 ? "producto" : "productos"} · ${numero.format(c.unidades)} u. · ${dinero.format(c.valor)}`,
    }));

  const barrasTop: BarraItem[] = datos.topValor.map(({ i, valor }) => ({
    id: i.id_producto,
    etiqueta: i.nombre,
    valor,
    texto: dinero.format(valor),
    detalle: `${numero.format(i.cantidad)} u. × ${dinero.format(i.precio_venta)}`,
  }));

  const vacio = !loading && datos.total === 0;

  return (
    <>
      <div className="mb-5 flex justify-end">
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

      {vacio ? (
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-16 text-center text-sm text-stone-400">
          Aún no hay productos activos para mostrar estadísticas.
        </div>
      ) : (
        <div
          className={`flex flex-col gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}
        >
          {/* Indicadores */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Productos activos"
              value={numero.format(datos.total)}
              hint={`${datos.categorias.length} ${datos.categorias.length === 1 ? "categoría" : "categorías"}`}
            />
            <StatTile
              label="Unidades en existencia"
              value={numero.format(datos.unidades)}
              hint="Suma de todo el inventario"
            />
            <StatTile
              label="Valor del inventario"
              value={dinero.format(datos.valor)}
              hint="Unidades × precio de venta"
            />
            <StatTile
              label="Por reponer"
              value={numero.format(datos.conteo.bajo + datos.conteo.agotado)}
              hint={`${datos.conteo.bajo} con stock bajo · ${datos.conteo.agotado} agotados`}
            />
          </section>

          {/* Estado del stock */}
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="m-0 text-lg font-semibold text-stone-900">
              Estado del stock
            </h2>
            <p className="mb-4 mt-1 text-sm text-stone-500">
              Cómo se reparten los {datos.total} productos activos.
            </p>
            <div
              role="img"
              aria-label={niveles
                .map((n) => `${n.nombre}: ${datos.conteo[n.id]}`)
                .join(", ")}
              className="flex h-7 gap-0.5"
            >
              {niveles.map((n) => {
                const cuenta = datos.conteo[n.id];
                if (cuenta === 0) return null;
                const pct = (cuenta / datos.total) * 100;
                return (
                  <div
                    key={n.id}
                    onPointerMove={(e) =>
                      setTip({
                        x: e.clientX,
                        y: e.clientY,
                        valor: `${cuenta} ${cuenta === 1 ? "producto" : "productos"}`,
                        detalle: `${n.nombre} · ${Math.round(pct)}%`,
                      })
                    }
                    onPointerLeave={() => setTip(null)}
                    style={{ width: `${pct}%` }}
                    className={`flex min-w-0 items-center rounded px-2 text-xs font-semibold ${n.fondo} ${n.texto}`}
                  >
                    {pct >= 12 && `${Math.round(pct)}%`}
                  </div>
                );
              })}
            </div>
            <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
              {niveles.map((n) => (
                <li
                  key={n.id}
                  className="flex items-center gap-2 text-sm text-stone-600"
                >
                  <span className={`size-2.5 rounded-sm ${n.fondo}`} />
                  {n.nombre}
                  <span className="font-semibold text-stone-900">
                    {datos.conteo[n.id]}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Categorías y productos con más valor */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="m-0 text-lg font-semibold text-stone-900">
                  Existencias por categoría
                </h2>
                <Segmentado
                  opciones={
                    [
                      ["unidades", "Unidades"],
                      ["valor", "Valor"],
                    ] as const
                  }
                  valor={medida}
                  onChange={setMedida}
                />
              </div>
              <BarList datos={barrasCategoria} onTip={setTip} />
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="m-0 mb-4 text-lg font-semibold text-stone-900">
                Productos con más valor en inventario
              </h2>
              {barrasTop.length === 0 ? (
                <p className="m-0 py-6 text-center text-sm text-stone-400">
                  Ningún producto tiene existencias todavía.
                </p>
              ) : (
                <BarList datos={barrasTop} onTip={setTip} />
              )}
            </div>
          </section>

          {datos.caducan.length > 0 && (
            <Tarjeta
              titulo="Próximos a caducar"
              subtitulo="Productos con existencias que ya vencieron o vencen en los próximos 30 días."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      <th className="py-2 pr-4">Producto</th>
                      <th className="px-4 py-2 text-right">Existencias</th>
                      <th className="px-4 py-2">Caducidad</th>
                      <th className="py-2 pl-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.caducan.map((i) => {
                      const dias = diasHasta(i.fecha_caducidad!);
                      return (
                        <tr key={i.id_producto} className="border-b border-stone-100 last:border-0">
                          <td className="py-3 pr-4 font-medium text-stone-900">{i.nombre}</td>
                          <td className="px-4 py-3 text-right text-stone-900">{i.cantidad} u.</td>
                          <td className="px-4 py-3 text-stone-600">{fechaDia(i.fecha_caducidad!)}</td>
                          <td className="py-3 pl-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${dias < 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
                              {dias < 0 ? `Vencido hace ${-dias} d` : dias === 0 ? "Vence hoy" : `Vence en ${dias} d`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          )}

          {/* Productos por reponer */}
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="m-0 text-lg font-semibold text-stone-900">
              Productos por reponer
            </h2>
            <p className="mb-4 mt-1 text-sm text-stone-500">
              Agotados o con existencias en el mínimo o por debajo.
            </p>
            {datos.reponer.length === 0 ? (
              <p className="m-0 py-6 text-center text-sm text-stone-400">
                Todo el inventario está por encima del mínimo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      <th className="py-2 pr-4">Producto</th>
                      <th className="px-4 py-2">Categoría</th>
                      <th className="px-4 py-2 text-right">Disponible</th>
                      <th className="px-4 py-2 text-right">Mínimo</th>
                      <th className="py-2 pl-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.reponer.slice(0, 10).map((i) => (
                      <tr
                        key={i.id_producto}
                        className="border-b border-stone-100 last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium text-stone-900">
                          {i.nombre}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {i.categoria}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-stone-900">
                          {i.cantidad}
                        </td>
                        <td className="px-4 py-3 text-right text-stone-500">
                          {i.stock_minimo}
                        </td>
                        <td className="py-3 pl-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              nivelDe(i) === "agotado"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {nivelDe(i) === "agotado" ? "Agotado" : "Stock bajo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {datos.reponer.length > 10 && (
                  <p className="mb-0 mt-3 text-xs text-stone-400">
                    y {datos.reponer.length - 10} más en la página Inventario.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      <Tooltip t={tip} />
    </>
  );
};