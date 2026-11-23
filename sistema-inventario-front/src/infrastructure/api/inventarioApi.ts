import type { InventarioRepository } from "../../domain/repositories/InventarioRepository";
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
} from "../../domain/modelos";
import { httpClient } from "./httpClient";

export const inventarioApi: InventarioRepository = {
  productos: async () =>
    (await httpClient.get<ProductoDto[]>("/productos/")).data,
  stock: async () => (await httpClient.get<StockDto[]>("/inventario/")).data,
  categorias: async () =>
    (await httpClient.get<CategoriaDto[]>("/categorias/")).data,
  crearProducto: async (producto: NuevoProducto) =>
    (await httpClient.post("/productos/", producto)).data,
  actualizarProducto: async (id: number, producto: NuevoProducto) =>
    (await httpClient.put(`/productos/${id}`, producto)).data,
  ventas: async (params?: ParametrosVentas): Promise<Pagina<VentaDto>> => {
    const r = await httpClient.get<VentaDto[]>("/ventas/", { params });
    return { items: r.data, total: Number(r.headers["x-total-count"] ?? r.data.length) };
  },
  registrarVenta: async (lineas: LineaVenta[]) =>
    (await httpClient.post<VentaDto>("/ventas/", { detalles: lineas })).data,
  movimientos: async (params?: ParametrosMovimientos): Promise<Pagina<LineaMovimientoDto>> => {
    const r = await httpClient.get<LineaMovimientoDto[]>("/movimientos/", { params });
    return { items: r.data, total: Number(r.headers["x-total-count"] ?? r.data.length) };
  },
  bitacora: async (params?: ParametrosBitacora): Promise<Pagina<RegistroActividadDto>> => {
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
