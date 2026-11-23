from app.domain.errores import ErrorDeNegocio
from datetime import datetime
from sqlalchemy.orm import Session
from app.domain.entities.pedido import Pedido, DetallePedido, EN_ESPERA
from app.domain.repositories.pedido_repository import PedidoRepository
from app.infrastructure.models.pedido_model import PedidoModel, DetallePedidoModel

def _a_entidad(m : PedidoModel) -> Pedido:
    pedido = Pedido(
        id_pedido=m.id_pedido,
        id_usuario=m.id_usuario,
        id_proveedor=m.id_proveedor,
        fecha_hora=m.fecha_hora,
        estado=m.estado,
        id_compra=m.id_compra,
        fecha_entrega=m.fecha_entrega,
    )
    for d in m.detalles:
        pedido.detalles.append(DetallePedido(d.id_producto, d.cantidad, float(d.precio_proveedor)))
    return pedido

def _modelos_detalle(detalles : list[DetallePedido]) -> list[DetallePedidoModel]:
    return [
        DetallePedidoModel(
            id_producto=d.id_producto,
            cantidad=d.cantidad,
            precio_proveedor=round(d.precio_proveedor, 2),
        )
        for d in detalles
    ]

class PedidoRepositoryPostgres(PedidoRepository):
    def __init__(self, session : Session):
        self.session = session

    def guardar(self, pedido : Pedido) -> Pedido:
        modelo = PedidoModel(
            id_usuario=pedido.id_usuario,
            id_proveedor=pedido.id_proveedor,
            fecha_hora=pedido.fecha_hora,
            estado=pedido.estado,
        )
        modelo.detalles = _modelos_detalle(pedido.detalles)
        self.session.add(modelo)
        self.session.flush()
        self.session.refresh(modelo)
        return _a_entidad(modelo)

    def buscar_por_id(self, id_pedido : int) -> Pedido | None:
        modelo = self.session.query(PedidoModel).filter(PedidoModel.id_pedido == id_pedido).first()
        return _a_entidad(modelo) if modelo else None

    def obtener_todos(self) -> list[Pedido]:
        modelos = self.session.query(PedidoModel).order_by(PedidoModel.id_pedido.desc()).all()
        return [_a_entidad(m) for m in modelos]

    def reemplazar_detalles(self, id_pedido : int, detalles : list[DetallePedido]) -> None:
        modelo = (
            self.session.query(PedidoModel)
            .filter(PedidoModel.id_pedido == id_pedido)
            .with_for_update()
            .first()
        )
        if modelo is None:
            raise ErrorDeNegocio("Pedido no encontrado.")
        if modelo.estado != EN_ESPERA:
            raise ErrorDeNegocio("Solo se pueden editar pedidos en espera.")
        modelo.detalles.clear()
        self.session.flush()
        modelo.detalles.extend(_modelos_detalle(detalles))
        self.session.flush()

    def transicionar(self, id_pedido : int, desde : str, hacia : str) -> bool:
        filas = (
            self.session.query(PedidoModel)
            .filter(PedidoModel.id_pedido == id_pedido, PedidoModel.estado == desde)
            .update({PedidoModel.estado: hacia}, synchronize_session=False)
        )
        self.session.flush()
        return filas > 0

    def asociar_compra(self, id_pedido : int, id_compra : int, fecha_entrega : datetime) -> None:
        self.session.query(PedidoModel).filter(PedidoModel.id_pedido == id_pedido).update(
            {PedidoModel.id_compra: id_compra, PedidoModel.fecha_entrega: fecha_entrega},
            synchronize_session=False,
        )
        self.session.flush()
