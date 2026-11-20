"""Pruebas del instalador que no necesitan una base de datos."""
import os

import pytest

import instalar


@pytest.fixture(autouse=True)
def entorno_aislado(monkeypatch):
    # preparar_env() escribe en os.environ: se trabaja sobre una copia.
    monkeypatch.setattr(os, "environ", os.environ.copy())


BASE = {
    "DB_HOST": "localhost", "DB_PORT": "5432", "DB_USER": "postgres",
    "DB_PASSWORD": "secreta con espacios", "DB_NAME": "mi_inventario",
}


def test_el_env_se_escribe_y_se_lee_igual(tmp_path):
    ruta = tmp_path / ".env"
    instalar.escribir_env(ruta, dict(BASE, SECRET_KEY="k" * 40))
    assert instalar.leer_env(ruta) == dict(BASE, SECRET_KEY="k" * 40)


def test_si_falta_la_clave_secreta_se_genera_una_fuerte(tmp_path):
    ruta = tmp_path / ".env"
    instalar.escribir_env(ruta, BASE)
    instalar.preparar_env(ruta)
    guardado = instalar.leer_env(ruta)
    assert len(guardado["SECRET_KEY"]) >= 32
    assert {k: guardado[k] for k in BASE} == BASE  # lo demás no se toca
    assert os.environ["SECRET_KEY"] == guardado["SECRET_KEY"]
    assert os.environ["DB_NAME"] == "mi_inventario"


def test_una_clave_secreta_valida_no_se_cambia(tmp_path):
    ruta = tmp_path / ".env"
    instalar.escribir_env(ruta, dict(BASE, SECRET_KEY="s" * 50))
    instalar.preparar_env(ruta)
    assert instalar.leer_env(ruta)["SECRET_KEY"] == "s" * 50


def test_cada_instalacion_genera_su_propia_clave(tmp_path):
    claves = set()
    for i in range(3):
        ruta = tmp_path / f"env{i}"
        instalar.escribir_env(ruta, BASE)
        instalar.preparar_env(ruta)
        claves.add(instalar.leer_env(ruta)["SECRET_KEY"])
    assert len(claves) == 3


@pytest.mark.parametrize("nombre", ['x"; DROP DATABASE postgres;--', "con espacio", "1empieza_con_numero", "", "a" * 64])
def test_un_nombre_de_base_peligroso_se_rechaza(tmp_path, nombre):
    ruta = tmp_path / ".env"
    instalar.escribir_env(ruta, dict(BASE, DB_NAME=nombre or "x"))
    texto = ruta.read_text(encoding="utf-8").replace("DB_NAME=x", f"DB_NAME={nombre}") if not nombre else None
    if texto is not None:
        ruta.write_text(texto, encoding="utf-8")
    with pytest.raises(instalar.ErrorInstalacion):
        instalar.preparar_env(ruta)


def test_si_faltan_datos_se_dice_cuales(tmp_path):
    ruta = tmp_path / ".env"
    instalar.escribir_env(ruta, {"DB_HOST": "localhost", "DB_PORT": "5432"})
    with pytest.raises(instalar.ErrorInstalacion, match="DB_NAME.*DB_USER|DB_USER.*DB_NAME"):
        instalar.preparar_env(ruta)


def test_un_correo_invalido_se_rechaza_antes_de_tocar_la_base():
    with pytest.raises(instalar.ErrorInstalacion, match="correo"):
        instalar.crear_administrador("Ana", "no-es-un-correo", "clave-larga-123")
