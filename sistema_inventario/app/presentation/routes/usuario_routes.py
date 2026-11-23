from fastapi import APIRouter, Depends, status
from app.application.services.usuario_service import UsuarioService
from app.domain.entities.usuario import Usuario
from app.domain.permisos import CATALOGO
from app.infrastructure.dependencies import get_usuario_service
from app.presentation.guardias import get_usuario_actual, requiere_admin
from app.presentation.schemas.usuario_schema import (
    CambioPassword,
    PermisoResponse,
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)

router = APIRouter(prefix="/usuarios", tags=["Gestión de Usuarios"])

def _respuesta(usuario: Usuario) -> UsuarioResponse:
    return UsuarioResponse(
        id_usuario=usuario.id_usuario,
        nombre=usuario.nombre,
        correo=usuario.correo,
        rol=usuario.rol,
        estado=usuario.estado,
        permisos=UsuarioService.permisos_efectivos(usuario),
    )

@router.get("/me", response_model=UsuarioResponse)
def mi_perfil(
    actual: Usuario = Depends(get_usuario_actual),
):
    return _respuesta(actual)

@router.get("/permisos", response_model=list[PermisoResponse], dependencies=[Depends(requiere_admin)])
def catalogo_de_permisos():
    return [PermisoResponse(clave=c, etiqueta=e, grupo=g) for c, e, g in CATALOGO]

@router.get("/", response_model=list[UsuarioResponse], dependencies=[Depends(requiere_admin)])
def listar_usuarios(servicio: UsuarioService = Depends(get_usuario_service)):
    return [_respuesta(u) for u in servicio.listar_usuarios()]

@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    usuario_in: UsuarioCreate,
    admin: Usuario = Depends(requiere_admin),
    servicio: UsuarioService = Depends(get_usuario_service),
):
    usuario = servicio.crear_usuario(
        nombre=usuario_in.nombre,
        correo=usuario_in.correo,
        password=usuario_in.password,
        rol=usuario_in.rol,
        permisos=usuario_in.permisos,
        estado=usuario_in.estado,
        id_actor=admin.id_usuario,
    )
    return _respuesta(usuario)

@router.put("/{id_usuario}", response_model=UsuarioResponse)
def actualizar_usuario(
    id_usuario: int,
    usuario_in: UsuarioUpdate,
    admin: Usuario = Depends(requiere_admin),
    servicio: UsuarioService = Depends(get_usuario_service),
):
    usuario = servicio.actualizar_usuario(
        id_usuario=id_usuario,
        id_actor=admin.id_usuario,
        nombre=usuario_in.nombre,
        rol=usuario_in.rol,
        estado=usuario_in.estado,
        permisos=usuario_in.permisos,
        password=usuario_in.password,
    )
    return _respuesta(usuario)

@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_mi_password(
    datos: CambioPassword,
    actual: Usuario = Depends(get_usuario_actual),
    servicio: UsuarioService = Depends(get_usuario_service),
):
    servicio.cambiar_password(actual.id_usuario, datos.actual, datos.nueva)
