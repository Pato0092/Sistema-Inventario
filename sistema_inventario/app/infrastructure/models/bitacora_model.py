from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.infrastructure.database import Base

class BitacoraModel(Base):
    __tablename__ = "bitacora"
    id_bitacora = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, nullable=True)
    fecha_hora = Column(DateTime, nullable=False, default=datetime.now)
    accion = Column(String(50), nullable=False)
    entidad = Column(String(50), nullable=False)
    id_entidad = Column(Integer, nullable=True)
    detalle = Column(String(500), nullable=True)
