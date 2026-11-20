from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.infrastructure.database import Base

class UsuarioModel(Base):
    __tablename__ = "usuarios"
    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    correo = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), nullable=False, default="empleado")
    estado = Column(Boolean, nullable=False, default=True)
    fecha_creacion = Column(DateTime, default=datetime.now, nullable=False)

    