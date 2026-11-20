from pydantic import BaseModel, EmailStr

class ProveedorCreate(BaseModel):
    nombre : str
    telefono : str | None = None
    correo : EmailStr | None = None
    estado : bool = True

class ProveedorUpdate(BaseModel):
    nombre : str
    telefono : str | None = None
    correo : EmailStr | None = None
    estado : bool

class ProveedorResponse(BaseModel):
    id_proveedor : int
    nombre : str
    telefono : str | None
    correo : str | None
    estado : bool

    class Config:
        from_attributes = True
