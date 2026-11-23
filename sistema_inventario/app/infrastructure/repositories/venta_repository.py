from datetime import datetime
from sqlalchemy.orm import Session
from app.domain.entities.venta import Venta
from app.domain.entities.detalle_venta import DetalleVenta
from app.domain.repositories.venta_repository import VentaRepository
from app.infrastructure.models.venta_model import VentaModel, DetalleVentaModel
from app.infrastructure.models.usuario_model import UsuarioModel

class VentaRepositoryPostgres(VentaRepository):
    def __init__(self, session : Session):
        self.session = session

    def guardar_venta(self, venta : Venta) -> Venta:
        venta_model = VentaModel(
            id_usuario=venta.id_usuario,
            fecha_hora=venta.fecha_hora,
            total=venta.total,
            estado=venta.estado  
        )
        self.session.add(venta_model)
        self.session.flush()
        for detalle in venta.detalles:
            detalle_model = DetalleVentaModel(
                id_venta=venta_model.id_venta,
                id_producto=detalle.id_producto,
                cantidad=detalle.cantidad,
                precio_unitario=detalle.precio_unitario,
                costo_unitario=detalle.costo_unitario 
            )
            self.session.add(detalle_model)     
        self.session.flush()
        venta.id_venta = venta_model.id_venta
        return venta

    def listar(self, desde : datetime | None, hasta : datetime | None, limit : int | None, offset : int):
        q = self.session.query(VentaModel, UsuarioModel.nombre).outerjoin(
            UsuarioModel, UsuarioModel.id_usuario == VentaModel.id_usuario
        )
        if desde:
            q = q.filter(VentaModel.fecha_hora >= desde)
        if hasta:
            q = q.filter(VentaModel.fecha_hora <= hasta)
        total = q.count()
        q = q.order_by(VentaModel.id_venta.desc())
        if limit is not None:
            q = q.limit(limit).offset(offset)
        ventas = []
        for v_db, nombre in q.all():
            venta = Venta(
                id_venta=v_db.id_venta,
                id_usuario=v_db.id_usuario,
                fecha_hora=v_db.fecha_hora,
                estado=v_db.estado
            )
            venta.total = v_db.total
            venta.nombre_usuario = nombre
            for d_db in v_db.detalles:
                venta.detalles.append(DetalleVenta(
                    id_producto=d_db.id_producto,
                    cantidad=d_db.cantidad,
                    precio_unitario=d_db.precio_unitario,
                    costo_unitario=d_db.costo_unitario
                ))
            ventas.append(venta)
        return ventas, total
