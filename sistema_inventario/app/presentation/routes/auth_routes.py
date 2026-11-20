from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from app.application.services.auth_service import (
    AuthService,
    CredencialesInvalidas,
    DemasiadosIntentos,
    UsuarioDesactivado,
)
from app.infrastructure.dependencies import get_auth_service

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/token")
def login_para_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth: AuthService = Depends(get_auth_service),
):
    origen = request.client.host if request.client else "desconocida"
    try:
        token = auth.iniciar_sesion(form_data.username, form_data.password, origen)
    except DemasiadosIntentos as e:
        minutos = max(1, round(e.segundos / 60))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos fallidos. Inténtalo de nuevo en {minutos} min.",
            headers={"Retry-After": str(e.segundos)},
        )
    except CredencialesInvalidas:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except UsuarioDesactivado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario está desactivado",
        )
    return {"access_token": token, "token_type": "bearer"}