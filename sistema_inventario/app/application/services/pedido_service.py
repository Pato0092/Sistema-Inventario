from datetime import datetime
from app.domain.errores import ErrorDeNegocio
from app.application.services.bitacora_service import BitacoraService
from app.application.services.compra_service import CompraService
from app.domain.entities.compra import Compra
from app.domain.entities.detalle_compra import DetalleCompra
from app.domain.entities.pedido import Pedido, DetallePedido, EN_ESPERA, ENTREGADO, CANCELADO
from app.domain.repositories.pedido_repository import PedidoRepository
from app.domain.repositories.producto_repository import ProductoRepository
from app.domain.repositories.proveedor_repository import ProveedorRepository
from app.domain.unidad_trabajo import UnidadTrabajo


class PedidoService:
    def __init__(
        self,
        pedido_repo : PedidoRepository,
        proveedor_repo : ProveedorRepository,
        producto_repo : ProductoRepository,
        compra_service : CompraService,
        unidad : UnidadTrabajo,
        bitacora : BitacoraService,
    ):
        self.pedido_repo = pedido_repo
        self.proveedor_repo = proveedor_repo
        self.producto_repo = producto_repo
        self.compra_service = compra_service
        self.unidad = unidad
        self.bitacora = bitacora

    @staticmethod
    def _resumen(pedido : Pedido) -> str:
        return f"{len(pedido.detalles)} producto(s) · total {pedido.total:.2f}"

    def _armar_detalles(self, lineas : list[tuple[int, int, float]]) -> list[DetallePedido]:
        if not lineas:
            raise ErrorDeNegocio("El pedido debe incluir al menos un producto.")
        armado = Pedido(id_usuario=0, id_proveedor=0)
        for id_producto, cantidad, precio in lineas:
            producto = self.producto_repo.buscar_por_id(id_producto)
            if not producto:
                raise ErrorDeNegocio(f"No existe el producto con ID {id_producto}.")
            if not producto.estado:
                raise ErrorDeNegocio(f"El producto '{producto.nombre}' está inactivo.")
            armado.agregar_detalle(DetallePedido(id_producto, cantidad, precio))
        return armado.detalles

    def _obtener(self, id_pedido : int) -> Pedido:
        pedido = self.pedido_repo.buscar_por_id(id_pedido)
        if not pedido:
            raise ErrorDeNegocio("Pedido no encontrado.")
        return pedido

    def crear_pedido(self, id_usuario : int, id_proveedor : int, lineas : list[tuple[int, int, float]]) -> Pedido:
        with self.unidad:
            proveedor = self.proveedor_repo.buscar_por_id(id_proveedor)
            if not proveedor:
                raise ErrorDeNegocio("Proveedor no existente.")
            if not proveedor.estado:
                raise ErrorDeNegocio(f"El proveedor '{proveedor.nombre}' está inactivo.")
            pedido = Pedido(id_usuario=id_usuario, id_proveedor=id_proveedor)
            pedido.detalles = self._armar_detalles(lineas)
            pedido = self.pedido_repo.guardar(pedido)
        self.bitacora.registrar(id_usuario, "crear", "pedido", pedido.id_pedido, self._resumen(pedido))
        return pedido

    def actualizar_pedido(self, id_pedido : int, lineas : list[tuple[int, int, float]], id_usuario : int | None = None) -> Pedido:
        with self.unidad:
            pedido = self._obtener(id_pedido)
            if pedido.estado != EN_ESPERA:
                raise ErrorDeNegocio("Solo se pueden editar pedidos en espera.")
            self.pedido_repo.reemplazar_detalles(id_pedido, self._armar_detalles(lineas))
            pedido = self._obtener(id_pedido)
        self.bitacora.registrar(id_usuario, "editar", "pedido", id_pedido, self._resumen(pedido))
        return pedido

    def marcar_entregado(self, id_pedido : int, id_usuario : int) -> Pedido:
        with self.unidad:
            pedido = self._obtener(id_pedido)
            if pedido.estado != EN_ESPERA:
                raise ErrorDeNegocio("Solo se pueden marcar como entregados los pedidos en espera.")
            if not self.pedido_repo.transicionar(id_pedido, EN_ESPERA, ENTREGADO):
                raise ErrorDeNegocio("El pedido ya no está en espera.")
            compra = Compra(id_usuario=id_usuario, id_proveedor=pedido.id_proveedor)
            for d in pedido.detalles:
                compra.agregar_detalle(DetalleCompra(d.id_producto, d.cantidad, d.precio_proveedor))
            compra = self.compra_service.registrar_compra(compra)
            self.pedido_repo.asociar_compra(id_pedido, compra.id_compra, datetime.now())
            pedido = self._obtener(id_pedido)
        self.bitacora.registrar(id_usuario, "entregar", "pedido", id_pedido, f"{self._resumen(pedido)} · compra #{pedido.id_compra}")
        return pedido

    def cancelar_pedido(self, id_pedido : int, id_usuario : int | None = None) -> Pedido:
        with self.unidad:
            self._obtener(id_pedido)
            if not self.pedido_repo.transicionar(id_pedido, EN_ESPERA, CANCELADO):
                raise ErrorDeNegocio("Solo se pueden cancelar los pedidos en espera.")
            pedido = self._obtener(id_pedido)
        self.bitacora.registrar(id_usuario, "cancelar", "pedido", id_pedido, self._resumen(pedido))
        return pedido

    def listar_pedidos(self) -> list[Pedido]:
        return self.pedido_repo.obtener_todos()
