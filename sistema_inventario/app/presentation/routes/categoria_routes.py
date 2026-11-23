from fastapi import APIRouter, Depends
from typing import List
from app.domain.entities.usuario import Usuario
from app.application.services.categoria_service import CategoriaService
from app.domain.permisos import PERMISOS_VER
from app.infrastructure.dependencies import get_categoria_service
from app.presentation.guardias import requiere_permisos
from app.presentation.schemas.categoria_schema import CategoriaCreate, CategoriaUpdate, CategoriaResponse

router = APIRouter(prefix="/categorias", tags=["Categorias"])

@router.post("/", response_model=CategoriaResponse)
def crear_categoria(
    categoria_in: CategoriaCreate,
    usuario: Usuario = Depends(requiere_permisos("categorias.editar", "inventario.editar")),
    servicio: CategoriaService = Depends(get_categoria_service),
):
    return servicio.crear_categoria(nombre=categoria_in.nombre, id_usuario=usuario.id_usuario)

@router.get("/", response_model=List[CategoriaResponse], dependencies=[Depends(requiere_permisos(*PERMISOS_VER))])
def listar_categorias(
    servicio: CategoriaService = Depends(get_categoria_service)
):
    return servicio.obtener_todos()

@router.put("/{id_categoria}", response_model=CategoriaResponse)
def actualizar_categoria(
    id_categoria: int,
    categoria_in: CategoriaUpdate,
    usuario: Usuario = Depends(requiere_permisos("categorias.editar")),
    servicio: CategoriaService = Depends(get_categoria_service),
):
    return servicio.actualizar_categoria(id_categoria, categoria_in.nombre, categoria_in.estado, usuario.id_usuario)
