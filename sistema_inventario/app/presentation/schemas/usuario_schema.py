from pydantic import BaseModel, EmailStr

class UsuarioCreate(BaseModel):
    nombre : str
    correo : EmailStr
    password : str
    rol : str = "empleado"
    estado : bool = True
    permisos : list[str] = []

class UsuarioUpdate(BaseModel):
    nombre : str
    rol : str
    estado : bool
    permisos : list[str] = []
    password : str | None = None

class UsuarioResponse(BaseModel):
    id_usuario : int
    nombre : str
    correo : str
    rol : str
    estado : bool
    permisos : list[str]

class PermisoResponse(BaseModel):
    clave : str
    etiqueta : str
    grupo : str

class CambioPassword(BaseModel):
    actual : str
    nueva : str