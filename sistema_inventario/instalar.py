"""Instalador del Sistema de Inventario.

Deja una copia nueva lista para usar, con SU PROPIA base de datos (nada se
comparte con otras instalaciones):

    python instalar.py

Qué hace, en orden:
  1. Crea el archivo .env (credenciales de tu PostgreSQL + una clave secreta
     generada al azar), si todavía no existe.
  2. Crea la base de datos, si no existe.
  3. Crea todas las tablas (migraciones de Alembic).
  4. Crea el primer administrador.

Es seguro volver a ejecutarlo: no borra ni duplica nada.
"""
from __future__ import annotations

import argparse
import getpass
import os
import re
import secrets
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
NOMBRE_BASE_VALIDO = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,62}$")
CORREO_VALIDO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ErrorInstalacion(Exception):
    """Un problema que se le puede explicar a la persona que instala."""


# ---------------------------------------------------------------- entrada
def preguntar(texto: str, defecto: str | None = None, secreto: bool = False) -> str:
    sufijo = f" [{defecto}]" if defecto and not secreto else ""
    while True:
        leer = getpass.getpass if secreto else input
        respuesta = leer(f"{texto}{sufijo}: ").strip()
        if respuesta:
            return respuesta
        if defecto is not None:
            return defecto


# ------------------------------------------------------------------- .env
def leer_env(ruta: Path) -> dict[str, str]:
    valores: dict[str, str] = {}
    if ruta.exists():
        for linea in ruta.read_text(encoding="utf-8").splitlines():
            if "=" in linea and not linea.lstrip().startswith("#"):
                clave, _, valor = linea.partition("=")
                valores[clave.strip()] = valor.strip()
    return valores


def escribir_env(ruta: Path, valores: dict[str, str]) -> None:
    orden = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "SECRET_KEY"]
    lineas = [f"{k}={valores[k]}" for k in orden if k in valores]
    lineas += [f"{k}={v}" for k, v in valores.items() if k not in orden]
    ruta.write_text("\n".join(lineas) + "\n", encoding="utf-8")


def preparar_env(ruta: Path) -> None:
    """Crea o completa el .env y lo carga en el entorno del proceso."""
    valores = leer_env(ruta)
    if not valores:
        print("\nVamos a conectar con tu PostgreSQL (el que instalaste en esta computadora).")
        valores = {
            "DB_HOST": preguntar("Servidor", "localhost"),
            "DB_PORT": preguntar("Puerto", "5432"),
            "DB_USER": preguntar("Usuario de PostgreSQL", "postgres"),
            "DB_PASSWORD": preguntar("Contraseña de ese usuario", secreto=True),
            "DB_NAME": preguntar("Nombre para TU base de datos", "inventario"),
        }
    faltantes = [k for k in ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD") if not valores.get(k)]
    if faltantes:
        raise ErrorInstalacion(f"Al archivo {ruta.name} le faltan: {', '.join(faltantes)}.")
    if not NOMBRE_BASE_VALIDO.match(valores["DB_NAME"]):
        raise ErrorInstalacion("El nombre de la base solo puede tener letras, números y guion bajo.")
    if len(valores.get("SECRET_KEY", "")) < 32:
        valores["SECRET_KEY"] = secrets.token_urlsafe(64)
    escribir_env(ruta, valores)
    # La configuración de la app se lee del entorno: se fija ANTES de importarla.
    for clave, valor in valores.items():
        os.environ[clave] = valor


# --------------------------------------------------------------- PostgreSQL
def crear_base_si_falta() -> bool:
    """Devuelve True si la creó, False si ya existía."""
    import psycopg

    nombre = os.environ["DB_NAME"]
    datos = dict(
        host=os.environ["DB_HOST"], port=os.environ["DB_PORT"],
        user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"],
    )
    try:
        with psycopg.connect(dbname="postgres", autocommit=True, connect_timeout=8, **datos) as conn:
            existe = conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (nombre,)).fetchone()
            if existe:
                return False
            conn.execute(f'CREATE DATABASE "{nombre}"')  # el nombre ya se validó con una expresión estricta
            return True
    except psycopg.errors.InsufficientPrivilege:
        raise ErrorInstalacion(
            f"El usuario '{datos['user']}' no tiene permiso para crear bases de datos. "
            f"Crea la base '{nombre}' desde pgAdmin y vuelve a ejecutar este instalador."
        )
    except psycopg.OperationalError as e:
        raise ErrorInstalacion(
            "No se pudo conectar a PostgreSQL. Revisa que esté encendido y que el usuario, "
            f"la contraseña, el servidor y el puerto sean correctos.\nDetalle: {str(e).strip()}"
        )


def migrar() -> None:
    from alembic import command
    from alembic.config import Config

    command.upgrade(Config(str(RAIZ / "alembic.ini")), "head")


# ------------------------------------------------------------ administrador
def hay_administradores() -> bool:
    from app.infrastructure.database import SessionLocal
    from app.infrastructure.models.usuario_model import UsuarioModel

    with SessionLocal() as sesion:
        return sesion.query(UsuarioModel).filter(UsuarioModel.rol == "administrador").count() > 0


def crear_administrador(nombre: str, correo: str, password: str) -> None:
    from app.infrastructure.database import SessionLocal
    from app.infrastructure.dependencies import get_usuario_service

    if not CORREO_VALIDO.match(correo):
        raise ErrorInstalacion("Ese correo no parece válido.")
    with SessionLocal() as sesion:
        try:
            get_usuario_service(sesion).crear_usuario(nombre, correo, password, "administrador")
        except ValueError as e:
            raise ErrorInstalacion(str(e))


def pedir_administrador(args: argparse.Namespace) -> None:
    if args.admin_correo and args.admin_password:
        crear_administrador(args.admin_nombre or "Administrador", args.admin_correo, args.admin_password)
        return
    print("\nCrea tu cuenta de administrador (con ella entrarás al sistema):")
    nombre = preguntar("Tu nombre", "Administrador")
    while True:
        correo = preguntar("Tu correo (será tu usuario)")
        password = getpass.getpass("Contraseña (mínimo 8 caracteres): ")
        if password != getpass.getpass("Repite la contraseña: "):
            print("  Las contraseñas no coinciden. Inténtalo de nuevo.\n")
            continue
        try:
            crear_administrador(nombre, correo, password)
            return
        except ErrorInstalacion as e:
            print(f"  {e}\n")


# ------------------------------------------------------------------- main
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Instala el Sistema de Inventario con tu propia base de datos.")
    parser.add_argument("--env", type=Path, default=RAIZ / ".env", help="archivo de configuración (por defecto .env)")
    parser.add_argument("--nuevo-admin", action="store_true", help="crear otro administrador aunque ya exista alguno")
    parser.add_argument("--sin-admin", action="store_true", help="no crear administrador")
    parser.add_argument("--admin-nombre")
    parser.add_argument("--admin-correo")
    parser.add_argument("--admin-password", help="solo para automatizar; en uso normal se pide sin mostrarla")
    args = parser.parse_args(argv)

    os.chdir(RAIZ)
    sys.path.insert(0, str(RAIZ))
    try:
        print("== Sistema de Inventario: instalación ==")
        preparar_env(args.env)
        print(f"\n[1/3] Base de datos '{os.environ['DB_NAME']}'...", end=" ", flush=True)
        print("creada." if crear_base_si_falta() else "ya existía.")
        print("[2/3] Tablas (migraciones)...", end=" ", flush=True)
        migrar()
        print("listas.")
        print("[3/3] Administrador...")
        if args.sin_admin:
            print("  Omitido (--sin-admin).")
        elif hay_administradores() and not args.nuevo_admin:
            print("  Ya existe un administrador; no se crea otro. (Usa --nuevo-admin si necesitas otro.)")
        else:
            pedir_administrador(args)
            print("  Administrador creado.")
    except ErrorInstalacion as e:
        print(f"\nNo se pudo completar la instalación:\n  {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nInstalación cancelada.", file=sys.stderr)
        return 130

    print(
        "\nListo. Para usar el sistema abre DOS terminales:\n"
        "  1) En sistema_inventario:        venv\\Scripts\\activate   y luego   uvicorn app.main:app\n"
        "  2) En sistema-inventario-front:  npm install   y luego   npm run dev\n"
        "Después entra a http://localhost:5173 con el correo y la contraseña que acabas de crear."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
