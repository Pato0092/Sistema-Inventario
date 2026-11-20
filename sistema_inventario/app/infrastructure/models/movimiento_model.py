from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.infrastructure.database import Base

class MovimientoManualModel(Base):
    __tablename__ = "movimientos_manuales"
    id_movimiento = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, nullable=False)
    fecha_hora = Column(DateTime, nullable=False, default=datetime.now)
    detalles = relationship("DetalleMovimientoModel", back_populates="movimiento", cascade="all, delete-orphan")

class DetalleMovimientoModel(Base):
    __tablename__ = "detalle_movimiento"
    id_detalle_movimiento = Column(Integer, primary_key=True, autoincrement=True)
    id_movimiento = Column(Integer, ForeignKey("movimientos_manuales.id_movimiento"), nullable=False)
    id_producto = Column(Integer, nullable=False)
    cantidad = Column(Integer, nullable=False)
    motivo = Column(String, nullable=False)
    tipo = Column(String, nullable=False)
    movimiento = relationship("MovimientoManualModel", back_populates="detalles")
