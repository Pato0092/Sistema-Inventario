import type {
  ProductoDto,
  StockDto,
  CategoriaDto,
  VentaDto,
  Pagina,
  LineaMovimientoDto,
  RegistroActividadDto,
  ProveedorDto,
  DatosProveedor,
  CompraDto,
  DetallePedidoDto,
  PedidoDto,
  UsuarioDto,
  PermisoDto,
  DatosNuevoUsuario,
  DatosEdicionUsuario,
  NuevoProducto,
  ParametrosVentas,
  LineaVenta,
  ParametrosMovimientos,
  ParametrosBitacora,
} from "../modelos";

export interface InventarioRepository {
  productos: () => Promise<ProductoDto[]>;
  stock: () => Promise<StockDto[]>;
  categorias: () => Promise<CategoriaDto[]>;
  crearProducto: (producto: NuevoProducto) => Promise<unknown>;
  actualizarProducto: (id: number, producto: NuevoProducto) => Promise<unknown>;
  ventas: (params?: ParametrosVentas) => Promise<Pagina<VentaDto>>;
  registrarVenta: (lineas: LineaVenta[]) => Promise<VentaDto>;
  movimientos: (params?: ParametrosMovimientos) => Promise<Pagina<LineaMovimientoDto>>;
  bitacora: (params?: ParametrosBitacora) => Promise<Pagina<RegistroActividadDto>>;
  cambiarPassword: (actual: string, nueva: string) => Promise<unknown>;
  compras: () => Promise<CompraDto[]>;
  miPerfil: () => Promise<UsuarioDto>;
  usuarios: () => Promise<UsuarioDto[]>;
  catalogoPermisos: () => Promise<PermisoDto[]>;
  crearUsuario: (datos: DatosNuevoUsuario) => Promise<UsuarioDto>;
  actualizarUsuario: (id: number, datos: DatosEdicionUsuario) => Promise<UsuarioDto>;
  pedidos: () => Promise<PedidoDto[]>;
  crearPedido: (id_proveedor: number, detalles: DetallePedidoDto[]) => Promise<PedidoDto>;
  actualizarPedido: (id: number, detalles: DetallePedidoDto[]) => Promise<PedidoDto>;
  entregarPedido: (id: number) => Promise<PedidoDto>;
  cancelarPedido: (id: number) => Promise<PedidoDto>;
  proveedores: () => Promise<ProveedorDto[]>;
  crearProveedor: (datos: DatosProveedor) => Promise<ProveedorDto>;
  actualizarProveedor: (id: number, datos: DatosProveedor) => Promise<ProveedorDto>;
  eliminarProducto: (id: number) => Promise<unknown>;
  actualizarCategoria: (id: number, datos: { nombre: string; estado: boolean }) => Promise<CategoriaDto>;
  crearCategoria: (nombre: string) => Promise<CategoriaDto>;
}
