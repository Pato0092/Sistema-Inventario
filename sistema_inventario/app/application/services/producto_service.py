from app.domain.errores import ErrorDeNegocio
from app.application.services.bitacora_service import BitacoraService
from app.application.services.movimiento_service import MovimientoService
from app.domain.entities.movimiento import ResultadoAjuste
from app.domain.repositories.producto_repository import ProductoRepository
from app.domain.entities.producto import Producto
from app.domain.repositories.inventario_repository import InventarioRepository
from app.domain.entities.inventario import Inventario
from app.domain.unidad_trabajo import UnidadTrabajo

class ProductoService:
    def __init__(
        self,
        repositorio : ProductoRepository,
        inventario_repo : InventarioRepository,
        movimiento_service : MovimientoService,
        unidad : UnidadTrabajo,
        bitacora : BitacoraService,
    ):
        self.repositorio = repositorio
        self.inventario_repo = inventario_repo
        self.movimiento_service = movimiento_service
        self.unidad = unidad
        self.bitacora = bitacora

    def obtener_todos(self) -> list[Producto]:
        return self.repositorio.listar_todos()

    def obtener_por_id(self, id_producto : int) -> Producto | None:
        return self.repositorio.buscar_por_id(id_producto)

    def crear_producto(self, producto : Producto, stock_minimo : int = 0, cantidad : int = 0, id_usuario : int | None = None) -> None:
        with self.unidad:
            existente = self.repositorio.buscar_por_codigo_barras(producto.codigo_barras)
            if existente:
                raise ErrorDeNegocio(f"El producto con código {producto.codigo_barras} ya existe.")
            producto.validar()
            if stock_minimo < 0:
                raise ErrorDeNegocio("El stock mínimo no puede ser negativo.")
            if cantidad < 0:
                raise ErrorDeNegocio("La cantidad disponible no puede ser negativa.")
            self.repositorio.guardar_producto(producto)
            if cantidad > 0 and id_usuario is not None:
                self.inventario_repo.guardar(Inventario(id_producto=producto.id_producto, cantidad=0, stock_minimo=stock_minimo))
                self.movimiento_service.registrar_ajuste(id_usuario, producto.id_producto, cantidad, "Inventario inicial")
            else:
                self.inventario_repo.guardar(Inventario(id_producto=producto.id_producto, cantidad=cantidad, stock_minimo=stock_minimo))
        self.bitacora.registrar(
            id_usuario, "crear", "producto", producto.id_producto,
            f"{producto.nombre} ({producto.codigo_barras})",
        )

    def modificar_producto(
        self,
        producto : Producto,
        stock_minimo : int | None = None,
        cantidad : int | None = None,
        id_usuario : int | None = None,
        motivo : str | None = None,
    ) -> ResultadoAjuste | None:
        ajuste = None
        with self.unidad:
            anterior = self.repositorio.buscar_por_id(producto.id_producto)
            if not anterior:
                raise ErrorDeNegocio("Producto no encontrado.")
            producto.validar()
            if stock_minimo is not None and stock_minimo < 0:
                raise ErrorDeNegocio("El stock mínimo no puede ser negativo.")
            if cantidad is not None and cantidad < 0:
                raise ErrorDeNegocio("La cantidad disponible no puede ser negativa.")
            con_mismo_codigo = self.repositorio.buscar_por_codigo_barras(producto.codigo_barras)
            if con_mismo_codigo and con_mismo_codigo.id_producto != producto.id_producto:
                raise ErrorDeNegocio(f"El producto con código {producto.codigo_barras} ya existe.")

            inventario = self.inventario_repo.obtener_por_producto(producto.id_producto)
            cantidad_actual = inventario.cantidad if inventario else 0
            cambia_cantidad = cantidad is not None and cantidad != cantidad_actual
            if cambia_cantidad and not (motivo or "").strip():
                raise ErrorDeNegocio("Indica el motivo del ajuste de inventario.")

            self.repositorio.modificar_producto(producto)
            if stock_minimo is not None:
                if inventario is None:
                    inventario = Inventario(id_producto=producto.id_producto, cantidad=0)
                inventario.stock_minimo = stock_minimo
                self.inventario_repo.guardar(inventario)
            if cambia_cantidad:
                ajuste = self.movimiento_service.registrar_ajuste(id_usuario or 0, producto.id_producto, cantidad, motivo)
        accion = "editar"
        if anterior.estado != producto.estado:
            accion = "activar" if producto.estado else "desactivar"
        self.bitacora.registrar(id_usuario, accion, "producto", producto.id_producto, producto.nombre)
        if ajuste and ajuste.diferencia != 0:
            self.bitacora.registrar(
                id_usuario, "ajustar", "inventario", producto.id_producto,
                f"{producto.nombre}: {ajuste.anterior} → {ajuste.nueva} u. ({(motivo or '').strip()})",
            )
        return ajuste

    def desactivar_producto(self, id_producto : int) -> None:
        with self.unidad:
            producto = self.repositorio.buscar_por_id(id_producto)
            if not producto:
                raise ErrorDeNegocio("Producto no encontrado.")
            producto.estado = False
            self.repositorio.modificar_producto(producto)

    def eliminar_producto(self, id_producto : int, id_usuario : int | None = None) -> None:
        with self.unidad:
            existente = self.repositorio.buscar_por_id(id_producto)
            if not existente:
                raise ErrorDeNegocio("Producto no encontrado.")
            self.repositorio.eliminar_producto(id_producto)
        self.bitacora.registrar(id_usuario, "eliminar", "producto", id_producto, existente.nombre)
