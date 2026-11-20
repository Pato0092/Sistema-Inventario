from sqlalchemy import Column, Integer, String, Boolean
from app.infrastructure.database import Base

class ProveedorModel(Base):
    __tablename__ = "proveedores"
    id_proveedor = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    telefono = Column(String(20), nullable=True)
    correo = Column(String(150), nullable=True)
    estado = Column(Boolean, nullable=False, default=True)
