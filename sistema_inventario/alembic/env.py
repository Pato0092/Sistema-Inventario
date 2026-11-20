"""Configuración de Alembic.

La URL de la base sale del mismo .env que usa la aplicación (nunca del
alembic.ini). Las migraciones se escriben a mano en `versions/`: el esquema
original ya existía antes de usar Alembic.
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.infrastructure.database import DATABASE_URL

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None  # migraciones manuales, sin autogenerate


def run_migrations_offline() -> None:
    context.configure(url=DATABASE_URL, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
