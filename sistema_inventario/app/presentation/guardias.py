from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.application.services.auth_service import AuthService, SesionInvalida, UsuarioDesactivado
from app.domain.entities.usuario import Usuario
from app.domain.permisos import ROL_ADMIN
from app.infrastructure.dependencies import get_auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def get_usuario_actual(
    token: str = Depends(oauth2_scheme),
    auth: AuthService = Depends(get_auth_service),
) -> Usuario:
    try:
        return auth.usuario_de_token(token)
    except SesionInvalida:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudieron validar las credenciales",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except UsuarioDesactivado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario está desactivado",
        )

def requiere_permisos(*claves: str):
    def verificador(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
        if usuario.rol == ROL_ADMIN or set(claves) & set(usuario.permisos):
            return usuario
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para realizar esta acción.",
        )
    return verificador

def requiere_admin(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
    if usuario.rol != ROL_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta acción es exclusiva de los administradores.",
        )
    return usuario
