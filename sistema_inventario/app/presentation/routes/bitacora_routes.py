from datetime import date, datetime, time
from fastapi import APIRouter, Depends, Query, Response
from app.application.services.bitacora_service import BitacoraService
from app.infrastructure.dependencies import get_bitacora_service
from app.presentation.guardias import requiere_admin
from app.presentation.schemas.bitacora_schema import RegistroActividadResponse

router = APIRouter(prefix="/bitacora", tags=["Bitácora de actividad"], dependencies=[Depends(requiere_admin)])

@router.get("/", response_model=list[RegistroActividadResponse])
def listar_actividad(
    response: Response,
    id_usuario: int | None = None,
    entidad: str | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    servicio: BitacoraService = Depends(get_bitacora_service),
):
    registros, total = servicio.listar(
        id_usuario=id_usuario,
        entidad=entidad,
        desde=datetime.combine(desde, time.min) if desde else None,
        hasta=datetime.combine(hasta, time.max) if hasta else None,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return registros