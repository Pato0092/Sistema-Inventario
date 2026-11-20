from pydantic import BaseModel

class CategoriaCreate(BaseModel):
    nombre : str

class CategoriaUpdate(BaseModel):
    nombre : str
    estado : bool

class CategoriaResponse(BaseModel):
    id_categoria : int
    nombre : str
    estado : bool
    class Config:
        
        from_attributes = True
    