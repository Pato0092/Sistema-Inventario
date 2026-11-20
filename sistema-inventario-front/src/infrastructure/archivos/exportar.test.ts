import assert from "node:assert/strict";
import { test } from "node:test";
import { construirCsv, escaparHtml } from "./exportar.ts";

type Fila = { nombre: string; cantidad: number | null; nota?: string };
const columnas = [
  { titulo: "Producto", valor: (f: Fila) => f.nombre },
  { titulo: "Cantidad", valor: (f: Fila) => f.cantidad },
  { titulo: "Nota", valor: (f: Fila) => f.nota },
];

test("el CSV lleva BOM para que Excel respete los acentos", () => {
  const csv = construirCsv(columnas, [{ nombre: "Frijol Querétaro", cantidad: 3 }]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes("Frijol Querétaro"));
});

test("encabezado y filas separados por saltos de línea de Windows", () => {
  const csv = construirCsv(columnas, [
    { nombre: "A", cantidad: 1 },
    { nombre: "B", cantidad: 2 },
  ]).replace("﻿", "");
  assert.deepEqual(csv.split("\r\n"), ["Producto,Cantidad,Nota", "A,1,", "B,2,"]);
});

test("escapa comas, comillas y saltos de línea", () => {
  const csv = construirCsv(columnas, [
    { nombre: 'Aceite "Premium", 1 L', cantidad: 5, nota: "línea1\nlínea2" },
  ]).replace("﻿", "");
  assert.equal(csv.split("\r\n")[1], '"Aceite ""Premium"", 1 L",5,"línea1\nlínea2"');
});

test("valores vacíos, nulos y cero se distinguen", () => {
  const csv = construirCsv(columnas, [{ nombre: "A", cantidad: null }, { nombre: "B", cantidad: 0 }]).replace("﻿", "");
  assert.deepEqual(csv.split("\r\n").slice(1), ["A,,", "B,0,"]);
});

test("escaparHtml neutraliza el marcado en lo que se imprime", () => {
  assert.equal(
    escaparHtml(`<img src=x onerror="alert('x')"> & más`),
    "&#60;img src=x onerror=&#34;alert(&#39;x&#39;)&#34;&#62; &#38; más",
  );
  assert.equal(escaparHtml(null), "");
});
