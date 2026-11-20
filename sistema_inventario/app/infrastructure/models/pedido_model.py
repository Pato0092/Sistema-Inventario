from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.infrastructure.database import Base

class PedidoModel(Base):
    __tablename__ = "pedidos"
    id_pedido = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, nullable=False)
    id_proveedor = Column(Integer, nullable=False)
    fecha_hora = Column(DateTime, nullable=False, default=datetime.now)
    estado = Column(String(20), nullable=False, default="EN_ESPERA")
    id_compra = Column(Integer, nullable=True)
    fecha_entrega = Column(DateTime, nullable=True)
    detalles = relationship("DetallePedidoModel", back_populates="pedido", cascade="all, delete-orphan")

class DetallePedidoModel(Base):
    __tablename__ = "detalle_pedido"
    id_detalle_pedido = Column(Integer, primary_key=True, autoincrement=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    id_producto = Column(Integer, nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_proveedor = Column(Numeric(10, 2), nullable=False)
    pedido = relationship("PedidoModel", back_populates="detalles")
