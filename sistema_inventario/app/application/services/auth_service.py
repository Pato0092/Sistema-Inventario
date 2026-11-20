from app.domain.entities.usuario import Usuario
from app.domain.repositories.usuario_repository import UsuarioRepository
from app.domain.seguridad import LimitadorIntentos, PasswordHasher, TokenProvider


class CredencialesInvalidas(Exception):
    """Correo o contraseña incorrectos."""


class UsuarioDesactivado(Exception):
    """La cuenta existe pero fue desactivada."""


class SesionInvalida(Exception):
    """El token no es válido, venció o su usuario ya no existe."""


class DemasiadosIntentos(Exception):
    def __init__(self, segundos : int):
        super().__init__(f"Demasiados intentos fallidos. Espera {segundos} s.")
        self.segundos = segundos


class AuthService:
    def __init__(
        self,
        usuario_repo : UsuarioRepository,
        hasher : PasswordHasher,
        tokens : TokenProvider,
        limitador : LimitadorIntentos,
    ):
        self.usuario_repo = usuario_repo
        self.hasher = hasher
        self.tokens = tokens
        self.limitador = limitador

    def iniciar_sesion(self, correo : str, password : str, origen : str) -> str:
        clave = f"{origen}|{correo.strip().lower()}"
        espera = self.limitador.segundos_restantes(clave)
        if espera:
            raise DemasiadosIntentos(espera)
        usuario = self.usuario_repo.buscar_por_correo(correo)
        if not usuario or not self.hasher.verificar(password, usuario.password_hash):
            self.limitador.registrar_fallo(clave)
            raise CredencialesInvalidas()
        if not usuario.estado:
            raise UsuarioDesactivado()
        self.limitador.registrar_exito(clave)
        return self.tokens.crear(usuario.correo)

    def usuario_de_token(self, token : str) -> Usuario:
        correo = self.tokens.correo_de(token)
        if not correo:
            raise SesionInvalida()
        usuario = self.usuario_repo.buscar_por_correo(correo)
        if usuario is None:
            raise SesionInvalida()
        if not usuario.estado:
            raise UsuarioDesactivado()
        return usuario
