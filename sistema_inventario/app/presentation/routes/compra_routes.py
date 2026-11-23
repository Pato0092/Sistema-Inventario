from fastapi import APIRouter, Depends, status
from typing import List
from app.domain.entities.usuario import Usuario
from app.presentation.schemas.compra_schema import CompraCreate, CompraResponse
from app.application.services.compra_service import CompraService
from app.infrastructure.dependencies import get_compra_service
from app.presentation.guardias import get_usuario_actual, requiere_permisos, requiere_admin

router = APIRouter(prefix="/compras", tags=["compras"])

@router.post("/", response_model=CompraResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(requiere_admin)])
def registrar_compra(
    compra_in: CompraCreate,
    usuario_actual: Usuario = Depends(get_usuario_actual),
    servicio: CompraService = Depends(get_compra_service)
):
    return servicio.registrar_compra_lineas(
        usuario_actual.id_usuario,
        compra_in.id_proveedor,
        [(d.id_producto, d.cantidad, d.precio_proveedor) for d in compra_in.detalles],
    )

@router.get("/", response_model=List[CompraResponse], dependencies=[Depends(requiere_permisos("estadisticas.ver", "proveedores.ver", "pedidos.ver"))])
def listar_compras(
    servicio: CompraService = Depends(get_compra_service)
):
    return servicio.listar_compras()
