from datetime import datetime
from sqlalchemy.orm import Session
from app.domain.entities.movimiento import LineaMovimiento
from app.domain.repositories.movimiento_repository import MovimientoRepository
from app.infrastructure.models.movimiento_model import MovimientoManualModel, DetalleMovimientoModel
from app.infrastructure.models.producto_model import ProductoModel
from app.infrastructure.models.usuario_model import UsuarioModel

class MovimientoRepositoryPostgres(MovimientoRepository):
    def __init__(self, session : Session):
        self.session = session

    def registrar(self, id_usuario : int, id_producto : int, tipo : str, cantidad : int, motivo : str) -> None:
        movimiento = MovimientoManualModel(id_usuario=id_usuario, fecha_hora=datetime.now())
        movimiento.detalles = [
            DetalleMovimientoModel(id_producto=id_producto, cantidad=cantidad, motivo=motivo, tipo=tipo)
        ]
        self.session.add(movimiento)
        self.session.flush()

    def listar(self, id_producto : int | None, limit : int, offset : int):
        q = (
            self.session.query(DetalleMovimientoModel, MovimientoManualModel, ProductoModel.nombre, UsuarioModel.nombre)
            .join(MovimientoManualModel, MovimientoManualModel.id_movimiento == DetalleMovimientoModel.id_movimiento)
            .outerjoin(ProductoModel, ProductoModel.id_producto == DetalleMovimientoModel.id_producto)
            .outerjoin(UsuarioModel, UsuarioModel.id_usuario == MovimientoManualModel.id_usuario)
        )
        if id_producto is not None:
            q = q.filter(DetalleMovimientoModel.id_producto == id_producto)
        total = q.count()
        filas = (
            q.order_by(MovimientoManualModel.fecha_hora.desc(), DetalleMovimientoModel.id_detalle_movimiento.desc())
            .limit(limit).offset(offset).all()
        )
        return [
            LineaMovimiento(
                id_movimiento=m.id_movimiento,
                fecha_hora=m.fecha_hora,
                id_usuario=m.id_usuario,
                usuario=usuario,
                id_producto=d.id_producto,
                producto=producto,
                tipo=d.tipo,
                cantidad=d.cantidad,
                motivo=d.motivo,
            )
            for d, m, producto, usuario in filas
        ], total
