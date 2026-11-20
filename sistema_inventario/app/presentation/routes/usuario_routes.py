from fastapi import APIRouter, Depends, HTTPException, status
from app.application.services.bitacora_service import BitacoraService
from app.application.services.usuario_service import UsuarioService
from app.domain.entities.usuario import Usuario
from app.domain.permisos import CATALOGO
from app.infrastructure.dependencies import get_bitacora_service, get_usuario_actual, get_usuario_service, requiere_admin
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
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        usuario = servicio.crear_usuario(
            nombre=usuario_in.nombre,
            correo=usuario_in.correo,
            password=usuario_in.password,
            rol=usuario_in.rol,
            permisos=usuario_in.permisos,
            estado=usuario_in.estado,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    bitacora.registrar(admin.id_usuario, "crear", "usuario", usuario.id_usuario, f"{usuario.nombre} ({usuario.rol})")
    return _respuesta(usuario)

@router.put("/{id_usuario}", response_model=UsuarioResponse)
def actualizar_usuario(
    id_usuario: int,
    usuario_in: UsuarioUpdate,
    admin: Usuario = Depends(requiere_admin),
    servicio: UsuarioService = Depends(get_usuario_service),
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        usuario = servicio.actualizar_usuario(
            id_usuario=id_usuario,
            id_actor=admin.id_usuario,
            nombre=usuario_in.nombre,
            rol=usuario_in.rol,
            estado=usuario_in.estado,
            permisos=usuario_in.permisos,
            password=usuario_in.password,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    bitacora.registrar(
        admin.id_usuario, "editar", "usuario", id_usuario,
        f"{usuario.nombre} ({usuario.rol}, {'activo' if usuario.estado else 'inactivo'})"
        + (" · contraseña restablecida" if usuario_in.password else ""),
    )
    return _respuesta(usuario)

@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_mi_password(
    datos: CambioPassword,
    actual: Usuario = Depends(get_usuario_actual),
    servicio: UsuarioService = Depends(get_usuario_service),
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        servicio.cambiar_password(actual.id_usuario, datos.actual, datos.nueva)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    bitacora.registrar(actual.id_usuario, "cambiar contraseña", "usuario", actual.id_usuario, actual.nombre)