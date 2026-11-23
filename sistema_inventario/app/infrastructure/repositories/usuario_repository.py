from sqlalchemy.orm import Session
from app.domain.entities.usuario import Usuario
from app.domain.permisos import ROL_ADMIN
from app.domain.repositories.usuario_repository import UsuarioRepository
from app.infrastructure.models.usuario_model import UsuarioModel
from app.infrastructure.models.permiso_model import PermisoModel, UsuarioPermisoModel

def permisos_de_usuario(session : Session, id_usuario : int) -> list[str]:
    filas = (
        session.query(PermisoModel.permiso)
        .join(UsuarioPermisoModel, UsuarioPermisoModel.id_permiso == PermisoModel.id_permiso)
        .filter(UsuarioPermisoModel.id_usuario == id_usuario)
        .all()
    )
    return sorted(f[0] for f in filas)

class UsuarioRepositoryPostgres(UsuarioRepository):
    def __init__(self, session : Session):
        self.session = session

    def _a_entidad(self, m : UsuarioModel) -> Usuario:
        return Usuario(
            id_usuario=m.id_usuario,
            nombre=m.nombre,
            correo=m.correo,
            password_hash=m.password_hash,
            rol=m.rol,
            estado=m.estado,
            fecha_creacion=m.fecha_creacion,
            permisos=permisos_de_usuario(self.session, m.id_usuario),
        )

    def guardar(self, usuario : Usuario) -> Usuario:
        usuario_model = UsuarioModel(
            nombre=usuario.nombre,
            correo=usuario.correo,
            password_hash=usuario.password_hash,
            rol=usuario.rol,
            estado=usuario.estado,
            fecha_creacion=usuario.fecha_creacion
        )
        self.session.add(usuario_model)
        self.session.flush()
        self.session.refresh(usuario_model)
        usuario.id_usuario = usuario_model.id_usuario
        return usuario

    def buscar_por_correo(self, correo : str) -> Usuario | None:
        model = self.session.query(UsuarioModel).filter(UsuarioModel.correo == correo).first()
        return self._a_entidad(model) if model else None

    def buscar_por_id(self, id_usuario : int) -> Usuario | None:
        model = self.session.query(UsuarioModel).filter(UsuarioModel.id_usuario == id_usuario).first()
        return self._a_entidad(model) if model else None

    def listar_todos(self) -> list[Usuario]:
        modelos = self.session.query(UsuarioModel).order_by(UsuarioModel.id_usuario).all()
        return [self._a_entidad(m) for m in modelos]

    def modificar(self, usuario : Usuario) -> Usuario:
        model = self.session.query(UsuarioModel).filter(UsuarioModel.id_usuario == usuario.id_usuario).first()
        if model:
            model.nombre = usuario.nombre
            model.password_hash = usuario.password_hash
            model.rol = usuario.rol
            model.estado = usuario.estado
            self.session.flush()
        return usuario

    def reemplazar_permisos(self, id_usuario : int, claves : list[str]) -> None:
        existentes = {
            p.permiso: p.id_permiso
            for p in self.session.query(PermisoModel).filter(PermisoModel.permiso.in_(claves)).all()
        } if claves else {}
        for clave in claves:
            if clave not in existentes:
                nuevo = PermisoModel(permiso=clave)
                self.session.add(nuevo)
                self.session.flush()
                existentes[clave] = nuevo.id_permiso
        self.session.query(UsuarioPermisoModel).filter(UsuarioPermisoModel.id_usuario == id_usuario).delete()
        for clave in claves:
            self.session.add(UsuarioPermisoModel(id_usuario=id_usuario, id_permiso=existentes[clave]))
        self.session.flush()

    def contar_administradores_activos(self) -> int:
        return (
            self.session.query(UsuarioModel)
            .filter(UsuarioModel.rol == ROL_ADMIN, UsuarioModel.estado.is_(True))
            .count()
        )