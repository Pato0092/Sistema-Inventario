class Proveedor:
    def __init__(self, nombre : str, telefono : str | None = None, correo : str | None = None, id_proveedor : int | None = None, estado : bool = True):
        self.id_proveedor = id_proveedor
        self.nombre = nombre
        self.telefono = telefono
        self.correo = correo
        self.estado = estado
