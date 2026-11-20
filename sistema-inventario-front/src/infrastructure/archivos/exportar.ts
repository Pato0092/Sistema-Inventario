export type Celda = string | number | boolean | null | undefined;

export interface ColumnaCsv<T> {
  titulo: string;
  valor: (fila: T) => Celda;
}

const escaparCsv = (v: Celda): string => {
  const texto = v === null || v === undefined ? "" : String(v);
  return /[",\n\r;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

export function construirCsv<T>(columnas: ColumnaCsv<T>[], filas: T[]): string {
  const encabezado = columnas.map((c) => escaparCsv(c.titulo)).join(",");
  const cuerpo = filas.map((f) => columnas.map((c) => escaparCsv(c.valor(f))).join(","));
  return "\uFEFF" + [encabezado, ...cuerpo].join("\r\n");
}

export function descargarCsv<T>(nombre: string, columnas: ColumnaCsv<T>[], filas: T[]): void {
  const blob = new Blob([construirCsv(columnas, filas)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre.endsWith(".csv") ? nombre : `${nombre}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export const escaparHtml = (v: Celda): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function imprimirDocumento(titulo: string, cuerpoHtml: string): void {
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(marco);
  const doc = marco.contentDocument;
  if (!doc || !marco.contentWindow) {
    marco.remove();
    return;
  }
  doc.open();
  doc.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escaparHtml(titulo)}</title>
<style>
  body{font-family:system-ui,sans-serif;color:#1c1b1a;margin:32px;font-size:13px}
  h1{font-size:20px;margin:0 0 4px} .meta{color:#75716a;margin:0 0 20px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#75716a;border-bottom:1px solid #1c1b1a;padding:6px 8px}
  td{padding:7px 8px;border-bottom:1px solid #e6e0d2} .der{text-align:right} .tot{font-size:16px;font-weight:700;text-align:right;margin-top:16px}
</style></head><body>${cuerpoHtml}</body></html>`);
  doc.close();
  const limpiar = () => setTimeout(() => marco.remove(), 500);
  marco.contentWindow.addEventListener("afterprint", limpiar);
  setTimeout(() => {
    marco.contentWindow?.focus();
    marco.contentWindow?.print();
  }, 150);
}
