import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calcularRangos,
  destacados,
  porDiaSemana,
  resumir,
  serieTemporal,
  variacion,
  type VentaHistorial,
} from "./estadisticasVentas.ts";

// 19 de noviembre de 2026, 15:00 (hora local).
const AHORA = new Date(2026, 10, 19, 15, 0);

const linea = (id: number, cantidad: number, precio: number, costo: number) => ({
  id_producto: id,
  cantidad,
  precio_unitario: precio,
  costo_unitario: costo,
});
const venta = (
  id: number,
  fecha: string,
  estado: string,
  detalles: ReturnType<typeof linea>[],
): VentaHistorial => ({ id_venta: id, fecha_hora: fecha, estado, detalles });

const VENTAS = [
  venta(1, "2026-11-10T10:00:00", "CONFIRMADA", [linea(1, 10, 20, 12), linea(2, 1, 100, 60)]),
  venta(2, "2026-10-02T11:00:00", "CONFIRMADA", [linea(1, 5, 20, 12), linea(3, 2, 50, 10)]),
  venta(3, "2026-07-01T09:00:00", "CONFIRMADA", [linea(2, 3, 100, 60)]),
  venta(4, "2026-03-01T09:00:00", "CONFIRMADA", [linea(2, 9, 100, 60)]), // fuera de 6 meses
  venta(5, "2026-11-11T09:00:00", "CANCELADA", [linea(1, 99, 20, 12)]), // no cuenta
];

test("6 meses: totales, ignorando lo cancelado y lo anterior al periodo", () => {
  const r = calcularRangos("6m", AHORA, "", "");
  const a = resumir(VENTAS, r.actual);
  assert.equal(a.ventas.length, 3);
  assert.equal(a.ingresos, 800);
  assert.equal(a.utilidad, 360);
  assert.equal(a.unidades, 21);
});

test("compara contra el periodo anterior de la misma duración", () => {
  const r = calcularRangos("6m", AHORA, "", "");
  const actual = resumir(VENTAS, r.actual);
  const previo = resumir(VENTAS, r.anterior!);
  assert.equal(previo.ingresos, 900);
  assert.equal(Math.round(variacion(actual.ingresos, previo.ingresos)!), -11);
  assert.equal(variacion(10, 0), null); // sin base no hay variación
});

test("destacados: más y menos vendido, más rentable y mayor margen", () => {
  const a = resumir(VENTAS, calcularRangos("6m", AHORA, "", "").actual);
  const d = destacados(a.productos);
  assert.equal(d.masVendido?.id_producto, 1); // 15 unidades
  assert.equal(d.menosVendido?.id_producto, 3); // 2 unidades
  assert.equal(d.masRentable?.id_producto, 2); // 160 de utilidad
  assert.equal(d.mayorMargen?.id_producto, 3);
  assert.equal(Math.round(d.mayorMargen!.margen), 80);
});

test("con un solo producto vendido no hay 'menos vendido'", () => {
  const una = [venta(1, "2026-11-10T10:00:00", "CONFIRMADA", [linea(1, 2, 10, 5)])];
  const d = destacados(resumir(una, calcularRangos("30d", AHORA, "", "").actual).productos);
  assert.equal(d.masVendido?.id_producto, 1);
  assert.equal(d.menosVendido, null);
});

test("sin ventas no hay destacados", () => {
  const d = destacados([]);
  assert.deepEqual(d, { masVendido: null, menosVendido: null, masRentable: null, mayorMargen: null });
});

test("la serie cubre todos los meses, también los vacíos", () => {
  const r = calcularRangos("6m", AHORA, "", "");
  const serie = serieTemporal(resumir(VENTAS, r.actual).ventas, r.actual.desde, r.actual.hasta);
  assert.equal(serie.length, 7);
  assert.deepEqual(
    serie.map((p) => p.ingresos),
    [0, 0, 300, 0, 0, 200, 300],
  );
});

test("30 días: serie diaria", () => {
  const r = calcularRangos("30d", AHORA, "", "");
  const filtradas = resumir(VENTAS, r.actual);
  assert.equal(filtradas.ventas.length, 1);
  const serie = serieTemporal(filtradas.ventas, r.actual.desde, r.actual.hasta);
  assert.equal(serie.length, 30);
  assert.equal(serie.reduce((a, p) => a + p.ventas, 0), 1);
});

test("todo el historial no tiene periodo anterior", () => {
  const r = calcularRangos("todo", AHORA, "", "");
  assert.equal(r.anterior, null);
  assert.equal(resumir(VENTAS, r.actual).ventas.length, 4);
});

test("rango personalizado: válido e inválido", () => {
  const ok = calcularRangos("custom", AHORA, "2026-10-01", "2026-10-31");
  assert.equal(resumir(VENTAS, ok.actual).ventas.length, 1);
  assert.equal(ok.aviso, null);
  const mal = calcularRangos("custom", AHORA, "2026-11-01", "2026-10-01");
  assert.match(mal.aviso!, /anterior a la final/);
});

test("ventas por día de la semana (lunes = primero)", () => {
  const a = resumir(VENTAS, calcularRangos("6m", AHORA, "", "").actual);
  const semana = porDiaSemana(a.ventas);
  assert.equal(semana[0].dia, "Lunes");
  // 10-nov-2026 martes, 02-oct-2026 viernes, 01-jul-2026 miércoles.
  assert.deepEqual(semana.map((d) => d.ventas), [0, 1, 1, 0, 1, 0, 0]);
});

test("cuenta las líneas vendidas sin costo, que inflan la utilidad", () => {
  const sinCosto = [venta(1, "2026-11-10T10:00:00", "CONFIRMADA", [linea(1, 1, 10, 0), linea(2, 1, 10, 4)])];
  assert.equal(resumir(sinCosto, calcularRangos("30d", AHORA, "", "").actual).lineasSinCosto, 1);
});
