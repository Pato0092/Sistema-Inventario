from sqlalchemy import Column, Integer, String, ForeignKey
from app.infrastructure.database import Base

class PermisoModel(Base):
    __tablename__ = "permisos"
    id_permiso = Column(Integer, primary_key=True, autoincrement=True)
    permiso = Column(String(100), nullable=False, unique=True)

class UsuarioPermisoModel(Base):
    __tablename__ = "usuario_permisos"
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), primary_key=True)
    id_permiso = Column(Integer, ForeignKey("permisos.id_permiso", ondelete="CASCADE"), primary_key=True)
