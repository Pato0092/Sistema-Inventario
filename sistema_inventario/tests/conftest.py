import os

# Las pruebas unitarias no se conectan a ninguna base, pero importar la app
# exige una clave de firma. Si no hay .env, se usa una de prueba.
os.environ.setdefault("SECRET_KEY", "clave-solo-para-pruebas-" + "x" * 32)
