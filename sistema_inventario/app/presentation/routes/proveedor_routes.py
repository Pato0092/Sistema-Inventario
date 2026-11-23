from fastapi import APIRouter, Depends
from app.domain.entities.usuario import Usuario
from app.application.services.proveedor_service import ProveedorService
from app.infrastructure.dependencies import get_proveedor_service
from app.presentation.guardias import requiere_permisos
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
):
    return servicio.crear_proveedor(
        proveedor_in.nombre, proveedor_in.telefono, proveedor_in.correo, proveedor_in.estado, usuario.id_usuario,
    )

@router.put("/{id_proveedor}", response_model=ProveedorResponse)
def actualizar_proveedor(
    id_proveedor: int,
    proveedor_in: ProveedorUpdate,
    usuario: Usuario = Depends(requiere_permisos("proveedores.editar")),
    servicio: ProveedorService = Depends(get_proveedor_service),
):
    return servicio.actualizar_proveedor(
        id_proveedor, proveedor_in.nombre, proveedor_in.telefono, proveedor_in.correo, proveedor_in.estado, usuario.id_usuario,
    )
