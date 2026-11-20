import assert from "node:assert/strict";
import { test } from "node:test";
import { diasHasta, fechaDeSoloDia } from "./formato.ts";

const HOY = new Date(2026, 10, 19, 23, 30); // 19-nov-2026, casi medianoche

test("una fecha de solo día no se corre por la zona horaria", () => {
  const f = fechaDeSoloDia("2026-11-19");
  assert.deepEqual([f.getFullYear(), f.getMonth(), f.getDate()], [2026, 10, 19]);
});

test("días que faltan para caducar", () => {
  assert.equal(diasHasta("2026-11-19", HOY), 0); // hoy, aunque sea tarde
  assert.equal(diasHasta("2026-11-20", HOY), 1);
  assert.equal(diasHasta("2026-12-19", HOY), 30);
  assert.equal(diasHasta("2026-11-18", HOY), -1); // ya venció
});

test("cruza cambios de mes y de año", () => {
  assert.equal(diasHasta("2027-01-01", HOY), 43);
});
