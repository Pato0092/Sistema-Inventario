import { httpClient } from "./httpClient";

export interface ProductoDto {
  id_producto: number;
  codigo_barras: string;
  nombre: string;
  marca: string | null;
  presentacion: string | null;
  precio_venta: number;
  estado: boolean;
  id_categoria: number;
  fecha_caducidad: string | null;
}

export interface StockDto {
  id_producto: number;
  cantidad: number;
  stock_minimo: number;
}

export interface CategoriaDto {
  id_categoria: number;
  nombre: string;
  estado: boolean;
}

export interface DetalleVentaDto {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
}

export interface VentaDto {
  id_venta: number;
  id_usuario: number;
  nombre_usuario: string | null;
  total: number;
  fecha_hora: string;
  estado: string;
  detalles: DetalleVentaDto[];
}

export interface Pagina<T> {
  items: T[];
  total: number;
}

export interface LineaMovimientoDto {
  id_movimiento: number;
  fecha_hora: string;
  id_usuario: number;
  usuario: string | null;
  id_producto: number;
  producto: string | null;
  tipo: "ENTRADA" | "SALIDA";
  cantidad: number;
  motivo: string;
}

export interface RegistroActividadDto {
  id_bitacora: number;
  id_usuario: number | null;
  usuario: string | null;
  fecha_hora: string;
  accion: string;
  entidad: string;
  id_entidad: number | null;
  detalle: string | null;
}

export interface ProveedorDto {
  id_proveedor: number;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  estado: boolean;
}

export interface DatosProveedor {
  nombre: string;
  telefono: string | null;
  correo: string | null;
  estado: boolean;
}

export interface DetalleCompraDto {
  id_producto: number;
  cantidad: number;
  precio_proveedor: number;
}

export interface CompraDto {
  id_compra: number;
  id_proveedor: number;
  total: number;
  fecha_hora: string;
  estado: string;
  detalles: DetalleCompraDto[];
}

export type EstadoPedido = "EN_ESPERA" | "ENTREGADO" | "CANCELADO";

export interface DetallePedidoDto {
  id_producto: number;
  cantidad: number;
  precio_proveedor: number;
}

export interface PedidoDto {
  id_pedido: number;
  id_usuario: number;
  id_proveedor: number;
  fecha_hora: string;
  estado: EstadoPedido;
  id_compra: number | null;
  fecha_entrega: string | null;
  total: number;
  detalles: (DetallePedidoDto & { subtotal: number })[];
}

export interface UsuarioDto {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: "administrador" | "empleado";
  estado: boolean;
  permisos: string[];
}

export interface PermisoDto {
  clave: string;
  etiqueta: string;
  grupo: string;
}

export interface DatosNuevoUsuario {
  nombre: string;
  correo: string;
  password: string;
  rol: UsuarioDto["rol"];
  estado: boolean;
  permisos: string[];
}

export interface DatosEdicionUsuario {
  nombre: string;
  rol: UsuarioDto["rol"];
  estado: boolean;
  permisos: string[];
  password?: string | null;
}

export interface NuevoProducto {
  codigo_barras: string;
  nombre: string;
  marca: string | null;
  presentacion: string | null;
  precio_venta: number;
  estado: boolean;
  id_categoria: number;
  stock_minimo: number;
  cantidad: number;
  fecha_caducidad: string | null;
  motivo?: string | null;
}

export const inventarioApi = {
  productos: async () =>
    (await httpClient.get<ProductoDto[]>("/productos/")).data,
  stock: async () => (await httpClient.get<StockDto[]>("/inventario/")).data,
  categorias: async () =>
    (await httpClient.get<CategoriaDto[]>("/categorias/")).data,
  crearProducto: async (producto: NuevoProducto) =>
    (await httpClient.post("/productos/", producto)).data,
  actualizarProducto: async (id: number, producto: NuevoProducto) =>
    (await httpClient.put(`/productos/${id}`, producto)).data,
  ventas: async (params?: {
    desde?: string;
    hasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<Pagina<VentaDto>> => {
    const r = await httpClient.get<VentaDto[]>("/ventas/", { params });
    return { items: r.data, total: Number(r.headers["x-total-count"] ?? r.data.length) };
  },
  registrarVenta: async (lineas: { id_producto: number; cantidad: number }[]) =>
    (await httpClient.post<VentaDto>("/ventas/", { detalles: lineas })).data,
  movimientos: async (params?: {
    id_producto?: number;
    limit?: number;
    offset?: number;
  }): Promise<Pagina<LineaMovimientoDto>> => {
    const r = await httpClient.get<LineaMovimientoDto[]>("/movimientos/", { params });
    return { items: r.data, total: Number(r.headers["x-total-count"] ?? r.data.length) };
  },
  bitacora: async (params?: {
    id_usuario?: number;
    entidad?: string;
    desde?: string;
    hasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<Pagina<RegistroActividadDto>> => {
    const r = await httpClient.get<RegistroActividadDto[]>("/bitacora/", { params });
    return { items: r.data, total: Number(r.headers["x-total-count"] ?? r.data.length) };
  },
  cambiarPassword: async (actual: string, nueva: string) =>
    (await httpClient.post("/usuarios/me/password", { actual, nueva })).data,
  compras: async () => (await httpClient.get<CompraDto[]>("/compras/")).data,
  miPerfil: async () => (await httpClient.get<UsuarioDto>("/usuarios/me")).data,
  usuarios: async () =>
    (await httpClient.get<UsuarioDto[]>("/usuarios/")).data,
  catalogoPermisos: async () =>
    (await httpClient.get<PermisoDto[]>("/usuarios/permisos")).data,
  crearUsuario: async (datos: DatosNuevoUsuario) =>
    (await httpClient.post<UsuarioDto>("/usuarios/", datos)).data,
  actualizarUsuario: async (id: number, datos: DatosEdicionUsuario) =>
    (await httpClient.put<UsuarioDto>(`/usuarios/${id}`, datos)).data,
  pedidos: async () => (await httpClient.get<PedidoDto[]>("/pedidos/")).data,
  crearPedido: async (id_proveedor: number, detalles: DetallePedidoDto[]) =>
    (await httpClient.post<PedidoDto>("/pedidos/", { id_proveedor, detalles }))
      .data,
  actualizarPedido: async (id: number, detalles: DetallePedidoDto[]) =>
    (await httpClient.put<PedidoDto>(`/pedidos/${id}`, { detalles })).data,
  entregarPedido: async (id: number) =>
    (await httpClient.post<PedidoDto>(`/pedidos/${id}/entregar`)).data,
  cancelarPedido: async (id: number) =>
    (await httpClient.post<PedidoDto>(`/pedidos/${id}/cancelar`)).data,
  proveedores: async () =>
    (await httpClient.get<ProveedorDto[]>("/proveedores/")).data,
  crearProveedor: async (datos: DatosProveedor) =>
    (await httpClient.post<ProveedorDto>("/proveedores/", datos)).data,
  actualizarProveedor: async (id: number, datos: DatosProveedor) =>
    (await httpClient.put<ProveedorDto>(`/proveedores/${id}`, datos)).data,
  eliminarProducto: async (id: number) =>
    (await httpClient.delete(`/productos/${id}`)).data,
  actualizarCategoria: async (
    id: number,
    datos: { nombre: string; estado: boolean },
  ) => (await httpClient.put<CategoriaDto>(`/categorias/${id}`, datos)).data,
  crearCategoria: async (nombre: string) =>
    (await httpClient.post<CategoriaDto>("/categorias/", { nombre })).data,
};
