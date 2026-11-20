import React, { useMemo, useState } from "react";
import {
  calcularRangos,
  destacados,
  porDiaSemana,
  resumir,
  serieTemporal,
  variacion,
  type Periodo,
  type TotalesProducto,
} from "../../../application/estadisticasVentas";
import {
  BarList,
  ColumnChart,
  Segmentado,
  StatTile,
  Tarjeta,
  Tooltip,
  type BarraItem,
  type Delta,
  type TooltipState,
} from "../../components/charts";
import { descargarCsv } from "../../../infrastructure/archivos/exportar";
import { useInventario } from "../../hooks/useInventario";
import { useVentas } from "../../hooks/useVentas";

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
const dineroCompacto = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  maximumFractionDigits: 1,
});

const periodos = [
  ["30d", "30 días"],
  ["3m", "3 meses"],
  ["6m", "6 meses"],
  ["12m", "12 meses"],
  ["todo", "Todo"],
  ["custom", "Personalizado"],
] as const;

const nombrePeriodo: Record<Periodo, string> = {
  "30d": "los últimos 30 días",
  "3m": "los últimos 3 meses",
  "6m": "los últimos 6 meses",
  "12m": "los últimos 12 meses",
  todo: "todo el historial",
  custom: "el rango elegido",
};

const aFechaIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const aDelta = (v: number | null): Delta | undefined =>
  v === null
    ? undefined
    : {
        texto: `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(0)}%`,
        bueno: Math.abs(v) < 0.5 ? null : v > 0,
      };

const Destacado: React.FC<{
  titulo: string;
  nombre: string | null;
  metrica: string;
  vacio: string;
}> = ({ titulo, nombre, metrica, vacio }) => (
  <div className="rounded-xl border border-stone-200 bg-white p-5">
    <p className="m-0 text-xs font-semibold uppercase tracking-wider text-stone-400">
      {titulo}
    </p>
    {nombre ? (
      <>
        <p className="mb-0 mt-2 truncate text-lg font-semibold text-stone-900" title={nombre}>
          {nombre}
        </p>
        <p className="m-0 mt-0.5 text-sm text-brand-800">{metrica}</p>
      </>
    ) : (
      <p className="mb-0 mt-2 text-sm text-stone-400">{vacio}</p>
    )}
  </div>
);

type MedidaTop = "unidades" | "utilidad" | "ingresos";
type MedidaSerie = "ingresos" | "utilidad";

export const PanelVentas: React.FC = () => {
  const inv = useInventario();
  const [ahora] = useState(() => new Date());
  const [periodo, setPeriodo] = useState<Periodo>("6m");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const inicioNecesario = useMemo(() => {
    const r = calcularRangos(periodo, ahora, desde, hasta);
    const d = r.anterior?.desde ?? r.actual.desde;
    return d ? aFechaIso(d) : undefined;
  }, [periodo, ahora, desde, hasta]);
  const hist = useVentas(inicioNecesario);
  const [medidaTop, setMedidaTop] = useState<MedidaTop>("unidades");
  const [medidaSerie, setMedidaSerie] = useState<MedidaSerie>("ingresos");
  const [tip, setTip] = useState<TooltipState | null>(null);

  const loading = inv.loading || hist.loading;
  const error = inv.error ?? hist.error;
  const recargar = () => {
    void inv.recargar();
    void hist.recargar();
  };

  const nombreDe = useMemo(() => {
    const m = new Map(inv.items.map((i) => [i.id_producto, i.nombre]));
    return (id: number) => m.get(id) ?? `Producto #${id}`;
  }, [inv.items]);

  const calc = useMemo(() => {
    const rangos = calcularRangos(periodo, ahora, desde, hasta);
    const actual = resumir(hist.ventas, rangos.actual);
    const previo = rangos.anterior ? resumir(hist.ventas, rangos.anterior) : null;
    const idsVendidos = new Set(actual.productos.map((p) => p.id_producto));
    const sinMovimiento = inv.items
      .filter((i) => i.estado && i.cantidad > 0 && !idsVendidos.has(i.id_producto))
      .map((i) => ({ i, valor: i.cantidad * i.precio_venta }))
      .sort((a, b) => b.valor - a.valor);
    return {
      rangos,
      actual,
      previo,
      dest: destacados(actual.productos),
      serie: serieTemporal(actual.ventas, rangos.actual.desde, rangos.actual.hasta),
      semana: porDiaSemana(actual.ventas),
      sinMovimiento,
    };
  }, [hist.ventas, inv.items, periodo, ahora, desde, hasta]);

  const { actual, previo, dest } = calc;
  const margen = actual.ingresos > 0 ? (actual.utilidad / actual.ingresos) * 100 : 0;
  const ticket = actual.ventas.length > 0 ? actual.ingresos / actual.ventas.length : 0;

  const detalleProd = (p: TotalesProducto) =>
    `${numero.format(p.unidades)} u. · ${dinero.format(p.ingresos)} ingresos · ${dinero.format(p.utilidad)} utilidad`;

  const barrasTop: BarraItem[] = [...actual.productos]
    .sort((a, b) => b[medidaTop] - a[medidaTop])
    .slice(0, 10)
    .map((p) => ({
      id: p.id_producto,
      etiqueta: nombreDe(p.id_producto),
      valor: Math.max(p[medidaTop], 0),
      texto:
        medidaTop === "unidades"
          ? `${numero.format(p.unidades)} u.`
          : dinero.format(p[medidaTop]),
      detalle: detalleProd(p),
    }));

  const exportarRanking = () =>
    descargarCsv(
      `ranking-productos-${periodo}`,
      [
        { titulo: "Producto", valor: (p) => nombreDe(p.id_producto) },
        { titulo: "Unidades vendidas", valor: (p) => p.unidades },
        { titulo: "Ingresos", valor: (p) => Number(p.ingresos.toFixed(2)) },
        { titulo: "Utilidad", valor: (p) => Number(p.utilidad.toFixed(2)) },
        { titulo: "Margen %", valor: (p) => (p.ingresos > 0 ? Number(((p.utilidad / p.ingresos) * 100).toFixed(1)) : 0) },
      ],
      [...actual.productos].sort((a, b) => b.unidades - a.unidades),
    );

  const nombreMedidaSerie = medidaSerie === "ingresos" ? "Ingresos" : "Utilidad";
  const columnas = calc.serie.map((p) => ({
    id: p.id,
    etiqueta: p.etiqueta,
    valor: Math.max(p[medidaSerie], 0),
    texto: dinero.format(p[medidaSerie]),
    detalle: `${p.ventas} ${p.ventas === 1 ? "venta" : "ventas"}`,
  }));

  const barrasSemana: BarraItem[] = calc.semana.map((d) => ({
    id: d.dia,
    etiqueta: d.dia,
    valor: d.ventas,
    texto: `${d.ventas} ${d.ventas === 1 ? "venta" : "ventas"}`,
    detalle: dinero.format(d.ingresos),
  }));

  const sinVentas = !loading && actual.ventas.length === 0;

  return (
    <>
      {/* Filtros: una sola fila sobre el contenido */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmentado opciones={periodos} valor={periodo} onChange={setPeriodo} />
        {periodo === "custom" && (
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
              aria-label="Fecha inicial"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
            />
            <span>a</span>
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
              aria-label="Fecha final"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
            />
          </div>
        )}
        <button
          onClick={recargar}
          disabled={loading}
          className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg {...svgProps} className={loading ? "animate-spin" : ""}>
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
          </svg>
          Actualizar
        </button>
      </div>

      {(error || calc.rangos.aviso) && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <svg {...svgProps} width={16} height={16}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {error ?? calc.rangos.aviso}
        </div>
      )}

      {sinVentas ? (
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-16 text-center text-sm text-stone-400">
          No hay ventas confirmadas en {nombrePeriodo[periodo]}.
        </div>
      ) : (
        <div
          className={`flex flex-col gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}
        >
          {/* Indicadores del periodo */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Ingresos"
              value={dinero.format(actual.ingresos)}
              hint={previo ? "vs periodo anterior" : "en todo el historial"}
              delta={previo ? aDelta(variacion(actual.ingresos, previo.ingresos)) : undefined}
            />
            <StatTile
              label="Utilidad"
              value={dinero.format(actual.utilidad)}
              hint={previo ? "vs periodo anterior" : "ingresos menos costo"}
              delta={previo ? aDelta(variacion(actual.utilidad, previo.utilidad)) : undefined}
            />
            <StatTile
              label="Margen de utilidad"
              value={`${margen.toFixed(1)}%`}
              hint="utilidad sobre ingresos"
            />
            <StatTile
              label="Ventas realizadas"
              value={numero.format(actual.ventas.length)}
              hint={`ticket promedio ${dinero.format(ticket)} · ${numero.format(actual.unidades)} u.`}
              delta={previo ? aDelta(variacion(actual.ventas.length, previo.ventas.length)) : undefined}
            />
          </section>

          {actual.lineasSinCosto > 0 && (
            <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {actual.lineasSinCosto}{" "}
              {actual.lineasSinCosto === 1
                ? "línea de venta se registró"
                : "líneas de venta se registraron"}{" "}
              con costo 0, lo que infla la utilidad y el margen de esos productos.
            </p>
          )}

          {/* Productos destacados */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Destacado
              titulo="Más vendido"
              nombre={dest.masVendido ? nombreDe(dest.masVendido.id_producto) : null}
              metrica={dest.masVendido ? `${numero.format(dest.masVendido.unidades)} unidades` : ""}
              vacio="Sin ventas"
            />
            <Destacado
              titulo="Menos vendido"
              nombre={dest.menosVendido ? nombreDe(dest.menosVendido.id_producto) : null}
              metrica={dest.menosVendido ? `${numero.format(dest.menosVendido.unidades)} unidades` : ""}
              vacio="Se necesitan al menos 2 productos con ventas"
            />
            <Destacado
              titulo="Más rentable"
              nombre={dest.masRentable ? nombreDe(dest.masRentable.id_producto) : null}
              metrica={dest.masRentable ? `${dinero.format(dest.masRentable.utilidad)} de utilidad` : ""}
              vacio="Sin ventas"
            />
            <Destacado
              titulo="Mayor margen"
              nombre={dest.mayorMargen ? nombreDe(dest.mayorMargen.id_producto) : null}
              metrica={dest.mayorMargen ? `${dest.mayorMargen.margen.toFixed(1)}% de margen` : ""}
              vacio="Sin ventas"
            />
          </section>

          {/* Tendencia */}
          <Tarjeta
            titulo={`${nombreMedidaSerie} en el tiempo`}
            subtitulo={`Por ${calc.serie.length > 0 && calc.serie[0].id.length === 10 ? "día" : "mes"}, en ${nombrePeriodo[periodo]}.`}
            accion={
              <Segmentado
                opciones={[["ingresos", "Ingresos"], ["utilidad", "Utilidad"]] as const}
                valor={medidaSerie}
                onChange={setMedidaSerie}
              />
            }
          >
            <ColumnChart
              datos={columnas}
              formatoEje={(v) => dineroCompacto.format(v)}
              onTip={setTip}
            />
          </Tarjeta>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Tarjeta
              titulo="Ranking de productos"
              subtitulo="Los 10 primeros del periodo."
              accion={
                <div className="flex flex-wrap items-center gap-2">
                  <Segmentado
                    opciones={[["unidades", "Unidades"], ["utilidad", "Utilidad"], ["ingresos", "Ingresos"]] as const}
                    valor={medidaTop}
                    onChange={setMedidaTop}
                  />
                  <button
                    onClick={exportarRanking}
                    title="Descargar todos los productos del periodo"
                    className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800"
                  >
                    CSV
                  </button>
                </div>
              }
            >
              <BarList datos={barrasTop} onTip={setTip} />
            </Tarjeta>

            <Tarjeta
              titulo="Ventas por día de la semana"
              subtitulo="Número de ventas en cada día; sirve para planear surtido y personal."
            >
              <BarList datos={barrasSemana} onTip={setTip} />
            </Tarjeta>
          </section>

          {/* Capital sin movimiento */}
          <Tarjeta
            titulo="Productos sin ventas en el periodo"
            subtitulo={`${calc.sinMovimiento.length} ${calc.sinMovimiento.length === 1 ? "producto con existencias" : "productos con existencias"} no se vendieron en ${nombrePeriodo[periodo]}. Es dinero detenido en inventario.`}
          >
            {calc.sinMovimiento.length === 0 ? (
              <p className="m-0 py-4 text-center text-sm text-stone-400">
                Todos los productos con existencias tuvieron ventas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      <th className="py-2 pr-4">Producto</th>
                      <th className="px-4 py-2">Categoría</th>
                      <th className="px-4 py-2 text-right">Existencias</th>
                      <th className="py-2 pl-4 text-right">Valor detenido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.sinMovimiento.slice(0, 8).map(({ i, valor }) => (
                      <tr key={i.id_producto} className="border-b border-stone-100 last:border-0">
                        <td className="py-3 pr-4 font-medium text-stone-900">{i.nombre}</td>
                        <td className="px-4 py-3 text-stone-600">{i.categoria}</td>
                        <td className="px-4 py-3 text-right text-stone-900">
                          {numero.format(i.cantidad)} u.
                        </td>
                        <td className="py-3 pl-4 text-right font-semibold text-stone-900">
                          {dinero.format(valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {calc.sinMovimiento.length > 8 && (
                  <p className="mb-0 mt-3 text-xs text-stone-400">
                    y {calc.sinMovimiento.length - 8} más.
                  </p>
                )}
              </div>
            )}
          </Tarjeta>
        </div>
      )}

      <Tooltip t={tip} />
    </>
  );
};