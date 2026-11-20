import type { Sesion } from "./context/SesionContext";

export type Pagina =
  | "inventario"
  | "movimientos"
  | "ventas"
  | "categorias"
  | "proveedores"
  | "pedidos"
  | "estadisticas"
  | "usuarios"
  | "actividad";

export interface ItemNavegacion {
  id: Pagina;
  label: string;
  icon: string;
  requiere: string;
}

export const NAVEGACION: ItemNavegacion[] = [
  {
    id: "inventario",
    label: "Inventario",
    icon: "M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8",
    requiere: "inventario.ver",
  },
  {
    id: "movimientos",
    label: "Movimientos",
    icon: "M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4",
    requiere: "inventario.ver",
  },
  {
    id: "ventas",
    label: "Ventas",
    icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.3 4.3A1 1 0 0 0 5.6 19H19M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
    requiere: "ventas.ver",
  },
  {
    id: "categorias",
    label: "Categorías",
    icon: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
    requiere: "categorias.ver",
  },
  {
    id: "proveedores",
    label: "Proveedores",
    icon: "M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    requiere: "proveedores.ver",
  },
  {
    id: "pedidos",
    label: "Pedidos",
    icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6M9 12h6M9 16h4",
    requiere: "pedidos.ver",
  },
  {
    id: "estadisticas",
    label: "Estadísticas",
    icon: "M3 3v18h18M7 14l4-4 4 4 5-6",
    requiere: "estadisticas.ver",
  },
  {
    id: "usuarios",
    label: "Usuarios",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
    requiere: "admin",
  },
  {
    id: "actividad",
    label: "Actividad",
    icon: "M22 12h-4l-3 9L9 3l-3 9H2",
    requiere: "admin",
  },
];

export function seccionesPermitidas(sesion: Sesion): ItemNavegacion[] {
  return NAVEGACION.filter((i) =>
    i.requiere === "admin" ? sesion.esAdmin : sesion.tiene(i.requiere),
  );
}