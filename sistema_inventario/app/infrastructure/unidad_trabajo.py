from sqlalchemy.orm import Session
from app.domain.unidad_trabajo import UnidadTrabajo


class UnidadTrabajoSqlAlchemy(UnidadTrabajo):
    def __init__(self, session : Session):
        super().__init__()
        self.session = session

    def confirmar(self) -> None:
        self.session.commit()

    def revertir(self) -> None:
        self.session.rollback()
