from datetime import datetime
from sqlalchemy.orm import Session
from app.domain.entities.registro_actividad import RegistroActividad
from app.domain.repositories.bitacora_repository import BitacoraRepository
from app.infrastructure.models.bitacora_model import BitacoraModel
from app.infrastructure.models.usuario_model import UsuarioModel

class BitacoraRepositoryPostgres(BitacoraRepository):
    def __init__(self, session : Session):
        self.session = session

    def registrar(self, registro : RegistroActividad) -> None:
        self.session.add(BitacoraModel(
            id_usuario=registro.id_usuario,
            fecha_hora=registro.fecha_hora or datetime.now(),
            accion=registro.accion,
            entidad=registro.entidad,
            id_entidad=registro.id_entidad,
            detalle=(registro.detalle or None) and registro.detalle[:500],
        ))
        self.session.commit()

    def listar(self, id_usuario, entidad, desde, hasta, limit, offset):
        q = self.session.query(BitacoraModel, UsuarioModel.nombre).outerjoin(
            UsuarioModel, UsuarioModel.id_usuario == BitacoraModel.id_usuario
        )
        if id_usuario is not None:
            q = q.filter(BitacoraModel.id_usuario == id_usuario)
        if entidad:
            q = q.filter(BitacoraModel.entidad == entidad)
        if desde:
            q = q.filter(BitacoraModel.fecha_hora >= desde)
        if hasta:
            q = q.filter(BitacoraModel.fecha_hora <= hasta)
        total = q.count()
        filas = q.order_by(BitacoraModel.id_bitacora.desc()).limit(limit).offset(offset).all()
        return [
            RegistroActividad(
                id_bitacora=b.id_bitacora,
                id_usuario=b.id_usuario,
                usuario=nombre,
                fecha_hora=b.fecha_hora,
                accion=b.accion,
                entidad=b.entidad,
                id_entidad=b.id_entidad,
                detalle=b.detalle,
            )
            for b, nombre in filas
        ], total
