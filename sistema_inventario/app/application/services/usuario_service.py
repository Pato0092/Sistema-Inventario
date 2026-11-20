from app.domain.entities.usuario import Usuario
from app.domain.permisos import CLAVES, ROL_ADMIN, ROLES, normalizar
from app.domain.repositories.usuario_repository import UsuarioRepository
from app.domain.seguridad import PasswordHasher

MIN_PASSWORD = 8
MAX_PASSWORD = 72  # límite de bcrypt

class UsuarioService:
    def __init__(self, usuario_repo : UsuarioRepository, hasher : PasswordHasher):
        self.usuario_repo = usuario_repo
        self.hasher = hasher

    @staticmethod
    def permisos_efectivos(usuario : Usuario) -> list[str]:
        return list(CLAVES) if usuario.rol == ROL_ADMIN else list(usuario.permisos)

    @staticmethod
    def _validar_nombre(nombre : str) -> str:
        nombre = nombre.strip()
        if not nombre:
            raise ValueError("El nombre no puede estar vacío.")
        if len(nombre) > 100:
            raise ValueError("El nombre no puede superar los 100 caracteres.")
        return nombre

    @staticmethod
    def _validar_rol(rol : str) -> str:
        if rol not in ROLES:
            raise ValueError("El rol debe ser 'administrador' o 'empleado'.")
        return rol

    @staticmethod
    def _validar_password(password : str) -> str:
        if len(password) < MIN_PASSWORD:
            raise ValueError(f"La contraseña debe tener al menos {MIN_PASSWORD} caracteres.")
        if len(password) > MAX_PASSWORD:
            raise ValueError(f"La contraseña no puede superar los {MAX_PASSWORD} caracteres.")
        return password

    def crear_usuario(self, nombre : str, correo : str, password : str, rol : str, permisos : list[str] | None = None, estado : bool = True) -> Usuario:
        nombre = self._validar_nombre(nombre)
        rol = self._validar_rol(rol)
        self._validar_password(password)
        correo = correo.strip()
        if self.usuario_repo.buscar_por_correo(correo):
            raise ValueError("El correo electrónico ya se encuentra registrado.")
        claves = [] if rol == ROL_ADMIN else normalizar(permisos or [])
        nuevo = Usuario(
            nombre=nombre,
            correo=correo,
            password_hash=self.hasher.hashear(password),
            rol=rol,
            estado=estado,
        )
        guardado = self.usuario_repo.guardar(nuevo)
        self.usuario_repo.reemplazar_permisos(guardado.id_usuario, claves)
        guardado.permisos = claves
        return guardado

    def actualizar_usuario(
        self,
        id_usuario : int,
        id_actor : int,
        nombre : str,
        rol : str,
        estado : bool,
        permisos : list[str],
        password : str | None = None,
    ) -> Usuario:
        usuario = self.usuario_repo.buscar_por_id(id_usuario)
        if not usuario:
            raise ValueError("Usuario no encontrado.")
        nombre = self._validar_nombre(nombre)
        rol = self._validar_rol(rol)
        claves = [] if rol == ROL_ADMIN else normalizar(permisos)

        deja_de_ser_admin_activo = (
            usuario.rol == ROL_ADMIN and usuario.estado and (rol != ROL_ADMIN or not estado)
        )
        if deja_de_ser_admin_activo:
            if id_usuario == id_actor:
                raise ValueError("No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.")
            if self.usuario_repo.contar_administradores_activos() <= 1:
                raise ValueError("Debe quedar al menos un administrador activo.")

        usuario.nombre = nombre
        usuario.rol = rol
        usuario.estado = estado
        if password:
            usuario.password_hash = self.hasher.hashear(self._validar_password(password))
        self.usuario_repo.modificar(usuario)
        self.usuario_repo.reemplazar_permisos(id_usuario, claves)
        usuario.permisos = claves
        return usuario

    def cambiar_password(self, id_usuario : int, actual : str, nueva : str) -> None:
        usuario = self.usuario_repo.buscar_por_id(id_usuario)
        if not usuario:
            raise ValueError("Usuario no encontrado.")
        if not self.hasher.verificar(actual, usuario.password_hash):
            raise ValueError("La contraseña actual no es correcta.")
        self._validar_password(nueva)
        if nueva == actual:
            raise ValueError("La nueva contraseña debe ser distinta de la actual.")
        usuario.password_hash = self.hasher.hashear(nueva)
        self.usuario_repo.modificar(usuario)

    def obtener_por_id(self, id_usuario : int) -> Usuario | None:
        return self.usuario_repo.buscar_por_id(id_usuario)

    def listar_usuarios(self) -> list[Usuario]:
        return self.usuario_repo.listar_todos()
