from datetime import date, datetime, time
from fastapi import APIRouter, Depends, Query, Response, status
from typing import List
from app.domain.entities.usuario import Usuario
from app.application.services.venta_service import VentaService
from app.infrastructure.dependencies import get_venta_service
from app.presentation.guardias import requiere_permisos
from app.presentation.schemas.venta_schema import VentaCreate, VentaResponse

router = APIRouter(prefix="/ventas", tags=["ventas"])

@router.post("/", response_model=VentaResponse, status_code=status.HTTP_201_CREATED)
def registrar_venta(
    venta_in: VentaCreate,
    usuario: Usuario = Depends(requiere_permisos("ventas.registrar")),
    servicio: VentaService = Depends(get_venta_service),
):
    return servicio.registrar_venta_lineas(
        usuario.id_usuario,
        [(d.id_producto, d.cantidad) for d in venta_in.detalles],
    )

@router.get("/", response_model=List[VentaResponse], dependencies=[Depends(requiere_permisos("ventas.ver", "estadisticas.ver"))])
def listar_ventas(
    response: Response,
    desde: date | None = None,
    hasta: date | None = None,
    limit: int | None = Query(None, ge=1, le=200),
    offset: int = Query(0, ge=0),
    servicio: VentaService = Depends(get_venta_service),
):
    ventas, total = servicio.listar_ventas(
        desde=datetime.combine(desde, time.min) if desde else None,
        hasta=datetime.combine(hasta, time.max) if hasta else None,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return ventas
