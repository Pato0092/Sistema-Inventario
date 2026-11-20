from app.application.services.movimiento_service import MovimientoService
from app.domain.entities.movimiento import ResultadoAjuste
from app.domain.repositories.producto_repository import ProductoRepository
from app.domain.entities.producto import Producto
from app.domain.repositories.inventario_repository import InventarioRepository
from app.domain.entities.inventario import Inventario

class ProductoService:
    def __init__(
        self,
        repositorio : ProductoRepository,
        inventario_repo : InventarioRepository,
        movimiento_service : MovimientoService | None = None,
    ):
        self.repositorio = repositorio
        self.inventario_repo = inventario_repo
        self.movimiento_service = movimiento_service

    def obtener_todos(self) -> list[Producto]:
        return self.repositorio.listar_todos()

    def obtener_por_id(self, id_producto : int) -> Producto | None:
        return self.repositorio.buscar_por_id(id_producto)

    def crear_producto(self, producto : Producto, stock_minimo : int = 0, cantidad : int = 0, id_usuario : int | None = None) -> None:
        existente = self.repositorio.buscar_por_codigo_barras(producto.codigo_barras)
        if existente:
            raise ValueError(f"El producto con código {producto.codigo_barras} ya existe.")
        if producto.precio_venta <= 0:
            raise ValueError(f"El precio de venta debe ser mayor a 0.")
        if stock_minimo < 0:
            raise ValueError("El stock mínimo no puede ser negativo.")
        if cantidad < 0:
            raise ValueError("La cantidad disponible no puede ser negativa.")
        self.repositorio.guardar_producto(producto)
        if cantidad > 0 and self.movimiento_service and id_usuario is not None:
            self.inventario_repo.guardar(Inventario(id_producto=producto.id_producto, cantidad=0, stock_minimo=stock_minimo))
            self.movimiento_service.registrar_ajuste(id_usuario, producto.id_producto, cantidad, "Inventario inicial")
        else:
            self.inventario_repo.guardar(Inventario(id_producto=producto.id_producto, cantidad=cantidad, stock_minimo=stock_minimo))

    def modificar_producto(
        self,
        producto : Producto,
        stock_minimo : int | None = None,
        cantidad : int | None = None,
        id_usuario : int | None = None,
        motivo : str | None = None,
    ) -> ResultadoAjuste | None:
        if not self.repositorio.buscar_por_id(producto.id_producto):
            raise ValueError("Producto no encontrado.")
        if producto.precio_venta <= 0:
            raise ValueError("El precio de venta debe ser mayor a 0.")
        if stock_minimo is not None and stock_minimo < 0:
            raise ValueError("El stock mínimo no puede ser negativo.")
        if cantidad is not None and cantidad < 0:
            raise ValueError("La cantidad disponible no puede ser negativa.")
        con_mismo_codigo = self.repositorio.buscar_por_codigo_barras(producto.codigo_barras)
        if con_mismo_codigo and con_mismo_codigo.id_producto != producto.id_producto:
            raise ValueError(f"El producto con código {producto.codigo_barras} ya existe.")

        inventario = self.inventario_repo.obtener_por_producto(producto.id_producto)
        cantidad_actual = inventario.cantidad if inventario else 0
        cambia_cantidad = cantidad is not None and cantidad != cantidad_actual
        if cambia_cantidad and not (motivo or "").strip():
            raise ValueError("Indica el motivo del ajuste de inventario.")
        if cambia_cantidad and self.movimiento_service is None:
            raise ValueError("No se puede ajustar la cantidad sin registrar el movimiento.")

        self.repositorio.modificar_producto(producto)
        if stock_minimo is not None:
            if inventario is None:
                inventario = Inventario(id_producto=producto.id_producto, cantidad=0)
            inventario.stock_minimo = stock_minimo
            self.inventario_repo.guardar(inventario)
        if cambia_cantidad:
            return self.movimiento_service.registrar_ajuste(id_usuario or 0, producto.id_producto, cantidad, motivo)
        return None

    def desactivar_producto(self, id_producto : int) -> None:
        producto = self.repositorio.buscar_por_id(id_producto)
        if not producto:
            raise ValueError("Producto no encontrado.")
        producto.estado = False
        self.repositorio.modificar_producto(producto)

    def eliminar_producto(self, id_producto : int) -> None:
        if not self.repositorio.buscar_por_id(id_producto):
            raise ValueError("Producto no encontrado.")
        self.repositorio.eliminar_producto(id_producto)
