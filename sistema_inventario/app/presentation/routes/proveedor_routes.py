from fastapi import APIRouter, Depends, HTTPException
from app.domain.entities.usuario import Usuario
from app.application.services.bitacora_service import BitacoraService
from app.application.services.proveedor_service import ProveedorService
from app.infrastructure.dependencies import get_bitacora_service, get_proveedor_service, requiere_permisos
from app.presentation.schemas.proveedor_schema import ProveedorCreate, ProveedorUpdate, ProveedorResponse

router = APIRouter(prefix="/proveedores", tags=["Proveedores"])

@router.get("/", response_model=list[ProveedorResponse], dependencies=[Depends(requiere_permisos("proveedores.ver", "pedidos.ver"))])
def listar_proveedores(
    servicio: ProveedorService = Depends(get_proveedor_service)
):
    return servicio.obtener_todos()

@router.post("/", response_model=ProveedorResponse, status_code=201)
def crear_proveedor(
    proveedor_in: ProveedorCreate,
    usuario: Usuario = Depends(requiere_permisos("proveedores.editar")),
    servicio: ProveedorService = Depends(get_proveedor_service),
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        nuevo = servicio.crear_proveedor(proveedor_in.nombre, proveedor_in.telefono, proveedor_in.correo, proveedor_in.estado)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    bitacora.registrar(usuario.id_usuario, "crear", "proveedor", nuevo.id_proveedor, nuevo.nombre)
    return nuevo

@router.put("/{id_proveedor}", response_model=ProveedorResponse)
def actualizar_proveedor(
    id_proveedor: int,
    proveedor_in: ProveedorUpdate,
    usuario: Usuario = Depends(requiere_permisos("proveedores.editar")),
    servicio: ProveedorService = Depends(get_proveedor_service),
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        anterior = servicio.obtener_por_id(id_proveedor)
        proveedor = servicio.actualizar_proveedor(id_proveedor, proveedor_in.nombre, proveedor_in.telefono, proveedor_in.correo, proveedor_in.estado)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    accion = "editar"
    if anterior and anterior.estado != proveedor.estado:
        accion = "activar" if proveedor.estado else "desactivar"
    bitacora.registrar(usuario.id_usuario, accion, "proveedor", id_proveedor, proveedor.nombre)
    return proveedor