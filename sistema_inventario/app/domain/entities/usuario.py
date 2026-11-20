from datetime import datetime

class Usuario:
    def __init__(self, id_usuario : int | None = None, nombre : str = "", correo : str = "", password_hash : str = "", rol : str = "empleado", estado : bool = True, fecha_creacion : datetime | None = None, permisos : list[str] | None = None):
        self.id_usuario = id_usuario
        self.nombre = nombre
        self.correo = correo
        self.password_hash = password_hash
        self.rol = rol
        self.estado = estado
        self.fecha_creacion = fecha_creacion or datetime.now()
        self.permisos : list[str] = permisos or []
