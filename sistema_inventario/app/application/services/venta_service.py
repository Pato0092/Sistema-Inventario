from datetime import datetime
from app.domain.entities.venta import Venta
from app.domain.entities.detalle_venta import DetalleVenta
from app.domain.repositories.venta_repository import VentaRepository
from app.domain.repositories.inventario_repository import InventarioRepository
from app.domain.repositories.producto_repository import ProductoRepository
from app.domain.repositories.compra_repository import CompraRepository

MAX_PAGINA = 200

class VentaService:
    def __init__(
        self,
        venta_repo : VentaRepository,
        inventario_repo : InventarioRepository,
        producto_repo : ProductoRepository | None = None,
        compra_repo : CompraRepository | None = None,
    ):
        self.venta_repo = venta_repo
        self.inventario_repo = inventario_repo
        self.producto_repo = producto_repo
        self.compra_repo = compra_repo

    def registrar_venta_lineas(self, id_usuario : int, lineas : list[tuple[int, int]]) -> Venta:
        if not lineas:
            raise ValueError("La venta debe incluir al menos un producto.")
        costos = self.compra_repo.ultimo_costo_por_producto([i for i, _ in lineas])
        venta = Venta(id_usuario=id_usuario)
        for id_producto, cantidad in lineas:
            producto = self.producto_repo.buscar_por_id(id_producto)
            if not producto:
                raise ValueError(f"No existe el producto con ID {id_producto}.")
            if not producto.estado:
                raise ValueError(f"El producto '{producto.nombre}' está inactivo y no se puede vender.")
            venta.agregar_detalle(DetalleVenta(
                id_producto=id_producto,
                cantidad=cantidad,
                precio_unitario=float(producto.precio_venta),
                costo_unitario=costos.get(id_producto, 0.0),
            ))
        return self.registrar_venta(venta)

    def registrar_venta(self, venta : Venta) -> Venta:
        if not venta.detalles:
            raise ValueError("La venta debe incluir al menos un producto.")
        for detalle in venta.detalles:
            inventario = self.inventario_repo.obtener_por_producto(detalle.id_producto)
            if not inventario:
                raise ValueError(f"No existe un registro de inventario para el producto ID {detalle.id_producto}.")
            if inventario.cantidad < detalle.cantidad:
                raise ValueError(f"Stock insuficiente para el producto ID {detalle.id_producto}. Disponible: {inventario.cantidad}, Solicitado: {detalle.cantidad}.")
        for detalle in venta.detalles:
            inventario = self.inventario_repo.obtener_por_producto(detalle.id_producto)
            inventario.cantidad -= detalle.cantidad
            self.inventario_repo.guardar(inventario)
        return self.venta_repo.guardar_venta(venta)

    def listar_ventas(
        self,
        desde : datetime | None = None,
        hasta : datetime | None = None,
        limit : int | None = None,
        offset : int = 0,
    ) -> tuple[list[Venta], int]:
        if limit is not None:
            limit = max(1, min(limit, MAX_PAGINA))
        return self.venta_repo.listar(desde, hasta, limit, max(0, offset))
