from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.domain.entities.usuario import Usuario
from app.presentation.schemas.compra_schema import CompraCreate, CompraResponse
from app.application.services.compra_service import CompraService
from app.domain.entities.compra import Compra
from app.domain.entities.detalle_compra import DetalleCompra
from app.infrastructure.dependencies import get_compra_service, get_usuario_actual, requiere_permisos, requiere_admin

router = APIRouter(prefix="/compras", tags=["compras"])

@router.post("/", response_model=CompraResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(requiere_admin)])
def registrar_compra(
    compra_in: CompraCreate,
    usuario_actual: Usuario = Depends(get_usuario_actual),
    servicio: CompraService = Depends(get_compra_service)
):
    try:
        compra_dominio = Compra(id_proveedor=compra_in.id_proveedor, id_usuario=usuario_actual.id_usuario)
        
        for d in compra_in.detalles:
            detalle = DetalleCompra(
                id_producto=d.id_producto,
                cantidad=d.cantidad,
                precio_proveedor=d.precio_proveedor
            )
            compra_dominio.agregar_detalle(detalle)
        return servicio.registrar_compra(compra_dominio)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[CompraResponse], dependencies=[Depends(requiere_permisos("estadisticas.ver", "proveedores.ver", "pedidos.ver"))])
def listar_compras(
    servicio: CompraService = Depends(get_compra_service)
):
    try:
        return servicio.listar_compras()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))