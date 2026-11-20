from fastapi import APIRouter, Depends, Query, Response
from app.application.services.movimiento_service import MovimientoService
from app.infrastructure.dependencies import get_movimiento_service, requiere_permisos
from app.presentation.schemas.movimiento_schema import LineaMovimientoResponse

router = APIRouter(prefix="/movimientos", tags=["Movimientos de inventario"])

@router.get("/", response_model=list[LineaMovimientoResponse], dependencies=[Depends(requiere_permisos("inventario.ver"))])
def listar_movimientos(
    response: Response,
    id_producto: int | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    servicio: MovimientoService = Depends(get_movimiento_service),
):
    lineas, total = servicio.listar(id_producto, limit, offset)
    response.headers["X-Total-Count"] = str(total)
    return lineas
