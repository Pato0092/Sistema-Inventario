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

export interface ParametrosVentas {
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}

export interface LineaVenta {
  id_producto: number;
  cantidad: number;
}

export interface ParametrosMovimientos {
  id_producto?: number;
  limit?: number;
  offset?: number;
}

export interface ParametrosBitacora {
  id_usuario?: number;
  entidad?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}
