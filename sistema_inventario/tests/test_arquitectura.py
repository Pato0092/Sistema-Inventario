"""Verifica la regla de dependencias de Clean Architecture leyendo los `import` del código.

    presentation ─┐
    infrastructure ┼──►  application  ──►  domain
                   └─────────────────────►

Las capas internas no conocen a las externas:
  * domain         -> solo la biblioteca estándar y domain.
  * application    -> domain y application. Ningún framework.
  * infrastructure -> domain (implementa sus interfaces). Solo `dependencies.py`,
                      la RAÍZ DE COMPOSICIÓN, puede importar application y todo lo demás
                      porque es quien conecta las piezas.
  * presentation   -> domain, application, presentation y los proveedores de
                      `infrastructure.dependencies`. Nunca modelos, repositorios,
                      base de datos ni seguridad directamente.
"""
import ast
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "app"

# Bibliotecas que atan el código a una tecnología concreta.
FRAMEWORKS = {
    "fastapi", "starlette", "sqlalchemy", "pydantic", "jose", "passlib",
    "psycopg", "dotenv", "alembic", "uvicorn", "bcrypt",
}
COMPOSICION = "app.infrastructure.dependencies"


def archivos(capa: str) -> list[Path]:
    return sorted((APP / capa).rglob("*.py"))


def importaciones(archivo: Path) -> set[str]:
    arbol = ast.parse(archivo.read_text(encoding="utf-8"))
    modulos: set[str] = set()
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Import):
            modulos.update(a.name for a in nodo.names)
        elif isinstance(nodo, ast.ImportFrom) and nodo.level == 0 and nodo.module:
            modulos.add(nodo.module)
    return modulos


def violaciones(capa: str, permitidos_internos: tuple[str, ...], frameworks_prohibidos: bool, excepciones=()) -> list[str]:
    malas = []
    for f in archivos(capa):
        if f.name in excepciones:
            continue
        for modulo in sorted(importaciones(f)):
            raiz = modulo.split(".")[0]
            if modulo == "app" or modulo.startswith("app."):
                if not any(modulo == p or modulo.startswith(p + ".") for p in permitidos_internos):
                    malas.append(f"{f.relative_to(APP.parent)} importa {modulo}")
            elif frameworks_prohibidos and raiz in FRAMEWORKS:
                malas.append(f"{f.relative_to(APP.parent)} importa el framework {modulo}")
    return malas


def test_la_prueba_revisa_codigo_de_verdad():
    assert len(archivos("domain")) >= 15
    assert len(archivos("application")) >= 8
    assert len(archivos("infrastructure")) >= 15
    assert len(archivos("presentation")) >= 15


def test_domain_no_depende_de_nada_externo():
    assert violaciones("domain", ("app.domain",), frameworks_prohibidos=True) == []


def test_application_solo_conoce_domain_y_no_usa_frameworks():
    assert violaciones("application", ("app.domain", "app.application"), frameworks_prohibidos=True) == []


def test_infrastructure_solo_implementa_domain_salvo_la_raiz_de_composicion():
    assert violaciones(
        "infrastructure", ("app.domain", "app.infrastructure"), frameworks_prohibidos=False,
        excepciones=("dependencies.py",),
    ) == []


def test_presentation_solo_usa_application_domain_y_la_raiz_de_composicion():
    assert violaciones(
        "presentation", ("app.domain", "app.application", "app.presentation", COMPOSICION),
        frameworks_prohibidos=False,
    ) == []


def test_ninguna_ruta_toca_la_base_de_datos():
    for f in archivos("presentation"):
        texto = f.read_text(encoding="utf-8")
        assert "Session" not in texto and ".query(" not in texto, f"{f.name} accede a la base de datos"
