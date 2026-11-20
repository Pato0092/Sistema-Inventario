export interface LineaVenta {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
}

export interface VentaHistorial {
  id_venta: number;
  fecha_hora: string;
  estado: string;
  detalles: LineaVenta[];
}

export type Periodo = "30d" | "3m" | "6m" | "12m" | "todo" | "custom";

export interface Rango {
  desde: Date | null; 
  hasta: Date;
}

export interface RangosCalculados {
  actual: Rango;
  anterior: Rango | null;
  aviso: string | null;
}

const inicioDelDia = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const finDelDia = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const parseFecha = (valor: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

export function calcularRangos(
  periodo: Periodo,
  ahora: Date,
  desdeTxt: string,
  hastaTxt: string,
): RangosCalculados {
  const hoyFin = finDelDia(ahora);
  let desde: Date | null = null;
  let hasta = hoyFin;
  let aviso: string | null = null;

  if (periodo === "30d") {
    desde = inicioDelDia(new Date(ahora.getTime() - 29 * 86_400_000));
  } else if (periodo === "3m" || periodo === "6m" || periodo === "12m") {
    const meses = periodo === "3m" ? 3 : periodo === "6m" ? 6 : 12;
    desde = inicioDelDia(
      new Date(ahora.getFullYear(), ahora.getMonth() - meses, ahora.getDate()),
    );
  } else if (periodo === "custom") {
    const d = parseFecha(desdeTxt);
    const h = parseFecha(hastaTxt);
    if (d && h && d <= h) {
      desde = inicioDelDia(d);
      hasta = finDelDia(h);
    } else if (d && h) {
      aviso = "La fecha inicial debe ser anterior a la final.";
    }
  }

  const anterior =
    desde === null
      ? null
      : {
          desde: new Date(desde.getTime() - (hasta.getTime() - desde.getTime()) - 1),
          hasta: new Date(desde.getTime() - 1),
        };
  return { actual: { desde, hasta }, anterior, aviso };
}

const enRango = (iso: string, r: Rango) => {
  const t = new Date(iso).getTime();
  return (r.desde === null || t >= r.desde.getTime()) && t <= r.hasta.getTime();
};

export interface TotalesProducto {
  id_producto: number;
  unidades: number;
  ingresos: number;
  utilidad: number;
}

export interface Resumen {
  ventas: VentaHistorial[];
  ingresos: number;
  utilidad: number;
  unidades: number;
  productos: TotalesProducto[];
  lineasSinCosto: number;
}

export function resumir(historial: VentaHistorial[], rango: Rango): Resumen {
  const ventas = historial.filter(
    (v) => v.estado === "CONFIRMADA" && enRango(v.fecha_hora, rango),
  );
  const porProducto = new Map<number, TotalesProducto>();
  let ingresos = 0;
  let utilidad = 0;
  let unidades = 0;
  let lineasSinCosto = 0;
  for (const v of ventas) {
    for (const d of v.detalles) {
      const ing = d.cantidad * d.precio_unitario;
      const uti = d.cantidad * (d.precio_unitario - d.costo_unitario);
      ingresos += ing;
      utilidad += uti;
      unidades += d.cantidad;
      if (!(d.costo_unitario > 0)) lineasSinCosto++;
      const t = porProducto.get(d.id_producto) ?? {
        id_producto: d.id_producto,
        unidades: 0,
        ingresos: 0,
        utilidad: 0,
      };
      t.unidades += d.cantidad;
      t.ingresos += ing;
      t.utilidad += uti;
      porProducto.set(d.id_producto, t);
    }
  }
  return {
    ventas,
    ingresos,
    utilidad,
    unidades,
    productos: [...porProducto.values()],
    lineasSinCosto,
  };
}

export const variacion = (actual: number, previo: number): number | null =>
  previo > 0 ? ((actual - previo) / previo) * 100 : null;

export interface Destacados {
  masVendido: TotalesProducto | null;
  menosVendido: TotalesProducto | null;
  masRentable: TotalesProducto | null;
  mayorMargen: (TotalesProducto & { margen: number }) | null;
}

export function destacados(productos: TotalesProducto[]): Destacados {
  if (productos.length === 0) {
    return { masVendido: null, menosVendido: null, masRentable: null, mayorMargen: null };
  }
  const porUnidades = [...productos].sort(
    (a, b) => b.unidades - a.unidades || b.ingresos - a.ingresos,
  );
  const conMargen = productos
    .filter((p) => p.ingresos > 0)
    .map((p) => ({ ...p, margen: (p.utilidad / p.ingresos) * 100 }))
    .sort((a, b) => b.margen - a.margen);
  return {
    masVendido: porUnidades[0],
    menosVendido: productos.length > 1 ? porUnidades[porUnidades.length - 1] : null,
    masRentable: [...productos].sort((a, b) => b.utilidad - a.utilidad)[0],
    mayorMargen: conMargen[0] ?? null,
  };
}

export interface PuntoSerie {
  id: string;
  etiqueta: string;
  ingresos: number;
  utilidad: number;
  ventas: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function serieTemporal(
  ventas: VentaHistorial[],
  desde: Date | null,
  hasta: Date,
): PuntoSerie[] {
  if (ventas.length === 0 && desde === null) return [];
  const primeraVenta = ventas.reduce(
    (min, v) => Math.min(min, new Date(v.fecha_hora).getTime()),
    Infinity,
  );
  const inicio = inicioDelDia(desde ?? new Date(primeraVenta));
  const diario = (hasta.getTime() - inicio.getTime()) / 86_400_000 <= 45;

  const puntos = new Map<string, PuntoSerie>();
  const clave = (d: Date) =>
    diario
      ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      : `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const etiqueta = (d: Date) =>
    diario
      ? d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })
      : d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });

  const cursor = diario
    ? new Date(inicio)
    : new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  while (cursor <= hasta) {
    puntos.set(clave(cursor), {
      id: clave(cursor),
      etiqueta: etiqueta(cursor),
      ingresos: 0,
      utilidad: 0,
      ventas: 0,
    });
    if (diario) cursor.setDate(cursor.getDate() + 1);
    else cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const v of ventas) {
    const p = puntos.get(clave(new Date(v.fecha_hora)));
    if (!p) continue;
    p.ventas += 1;
    for (const d of v.detalles) {
      p.ingresos += d.cantidad * d.precio_unitario;
      p.utilidad += d.cantidad * (d.precio_unitario - d.costo_unitario);
    }
  }
  return [...puntos.values()];
}

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function porDiaSemana(ventas: VentaHistorial[]) {
  const filas = DIAS.map((dia) => ({ dia, ventas: 0, ingresos: 0 }));
  for (const v of ventas) {
    const idx = (new Date(v.fecha_hora).getDay() + 6) % 7; // lunes = 0
    filas[idx].ventas += 1;
    for (const d of v.detalles) filas[idx].ingresos += d.cantidad * d.precio_unitario;
  }
  return filas;
}