from sqlalchemy import Column, Integer, Numeric, DateTime, String, ForeignKey
from sqlalchemy.orm import relationship
from app.infrastructure.database import Base
from datetime import datetime

class CompraModel(Base):
    __tablename__ = "compras"
    id_compra = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, nullable=False)
    id_proveedor = Column(Integer, nullable=False)
    fecha_hora = Column(DateTime, default=datetime.now)
    total = Column(Numeric(10,2), nullable=False)
    estado = Column(String(50),)
    detalles = relationship("DetalleCompraModel", back_populates="compra", cascade="all, delete-orphan")

class DetalleCompraModel(Base):
    __tablename__ ="detalle_compra"
    id_detalle_compra = Column(Integer, primary_key=True, autoincrement=True)
    id_compra = Column(Integer, ForeignKey("compras.id_compra"), nullable=False)
    id_producto = Column(Integer, nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_proveedor = Column(Numeric(10,2) , nullable=False)
    compra = relationship("CompraModel", back_populates="detalles")
    
