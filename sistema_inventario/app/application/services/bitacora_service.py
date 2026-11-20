from datetime import datetime
from app.domain.entities.registro_actividad import RegistroActividad
from app.domain.repositories.bitacora_repository import BitacoraRepository

MAX_PAGINA = 200

class BitacoraService:
    def __init__(self, repositorio : BitacoraRepository):
        self.repositorio = repositorio

    def registrar(self, id_usuario : int | None, accion : str, entidad : str, id_entidad : int | None = None, detalle : str | None = None) -> None:
        try:
            self.repositorio.registrar(RegistroActividad(
                accion=accion, entidad=entidad, id_usuario=id_usuario,
                id_entidad=id_entidad, detalle=detalle,
            ))
        except Exception:
            session = getattr(self.repositorio, "session", None)
            if session is not None:
                session.rollback()

    def listar(
        self,
        id_usuario : int | None = None,
        entidad : str | None = None,
        desde : datetime | None = None,
        hasta : datetime | None = None,
        limit : int = 50,
        offset : int = 0,
    ) -> tuple[list[RegistroActividad], int]:
        limit = max(1, min(limit, MAX_PAGINA))
        return self.repositorio.listar(id_usuario, entidad, desde, hasta, limit, max(0, offset))
