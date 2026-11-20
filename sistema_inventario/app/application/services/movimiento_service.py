from app.domain.entities.inventario import Inventario
from app.domain.entities.movimiento import ENTRADA, SALIDA, LineaMovimiento, ResultadoAjuste
from app.domain.repositories.inventario_repository import InventarioRepository
from app.domain.repositories.movimiento_repository import MovimientoRepository

MAX_MOTIVO = 200
MAX_PAGINA = 200

class MovimientoService:
    def __init__(self, inventario_repo : InventarioRepository, movimiento_repo : MovimientoRepository):
        self.inventario_repo = inventario_repo
        self.movimiento_repo = movimiento_repo

    @staticmethod
    def _motivo(motivo : str | None) -> str:
        motivo = (motivo or "").strip()
        if not motivo:
            raise ValueError("Indica el motivo del ajuste de inventario.")
        if len(motivo) > MAX_MOTIVO:
            raise ValueError(f"El motivo no puede superar los {MAX_MOTIVO} caracteres.")
        return motivo

    def registrar_ajuste(self, id_usuario : int, id_producto : int, nueva_cantidad : int, motivo : str | None) -> ResultadoAjuste:
        if nueva_cantidad < 0:
            raise ValueError("La cantidad disponible no puede ser negativa.")
        inventario = self.inventario_repo.obtener_por_producto(id_producto)
        if inventario is None:
            inventario = Inventario(id_producto=id_producto, cantidad=0)
        anterior = inventario.cantidad
        resultado = ResultadoAjuste(id_producto=id_producto, anterior=anterior, nueva=nueva_cantidad)
        if resultado.diferencia == 0:
            return resultado
        motivo = self._motivo(motivo)
        inventario.cantidad = nueva_cantidad
        self.inventario_repo.guardar(inventario)
        self.movimiento_repo.registrar(
            id_usuario, id_producto,
            ENTRADA if resultado.diferencia > 0 else SALIDA,
            abs(resultado.diferencia), motivo,
        )
        return resultado

    def registrar_diferencia(self, id_usuario : int, id_producto : int, diferencia : int, motivo : str | None) -> ResultadoAjuste:
        inventario = self.inventario_repo.obtener_por_producto(id_producto)
        if inventario is None:
            raise ValueError(f"No se encontró inventario para el producto con ID {id_producto}.")
        return self.registrar_ajuste(id_usuario, id_producto, inventario.cantidad + diferencia, motivo)

    def _mover(self, signo : int, id_usuario : int, id_producto : int, cantidad : int, motivo : str | None, motivo_por_defecto : str) -> ResultadoAjuste:
        if cantidad <= 0:
            raise ValueError("La cantidad debe ser mayor a cero.")
        return self.registrar_diferencia(id_usuario, id_producto, signo * cantidad, motivo or motivo_por_defecto)

    def registrar_entrada(self, id_usuario : int, id_producto : int, cantidad : int, motivo : str | None = None) -> ResultadoAjuste:
        return self._mover(1, id_usuario, id_producto, cantidad, motivo, "Entrada manual")

    def registrar_salida(self, id_usuario : int, id_producto : int, cantidad : int, motivo : str | None = None) -> ResultadoAjuste:
        return self._mover(-1, id_usuario, id_producto, cantidad, motivo, "Salida manual")

    def listar(self, id_producto : int | None = None, limit : int = 50, offset : int = 0) -> tuple[list[LineaMovimiento], int]:
        limit = max(1, min(limit, MAX_PAGINA))
        return self.movimiento_repo.listar(id_producto, limit, max(0, offset))
