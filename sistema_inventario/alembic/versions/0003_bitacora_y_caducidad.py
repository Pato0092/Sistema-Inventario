"""Bitácora de actividad y fecha de caducidad de los productos.

- bitacora: quién hizo qué y cuándo (altas, cambios, ventas, pedidos...).
- producto.fecha_caducidad: próxima fecha de caducidad de las existencias
  (columna opcional; los productos actuales quedan sin fecha).

Revision ID: 0003
Revises: 0002
"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS bitacora (
            id_bitacora INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            id_usuario  INTEGER REFERENCES usuarios (id_usuario) ON DELETE SET NULL,
            fecha_hora  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            accion      VARCHAR(50) NOT NULL,
            entidad     VARCHAR(50) NOT NULL,
            id_entidad  INTEGER,
            detalle     VARCHAR(500)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_bitacora_fecha ON bitacora (fecha_hora DESC)")
    op.execute("ALTER TABLE producto ADD COLUMN IF NOT EXISTS fecha_caducidad DATE")


def downgrade() -> None:
    op.execute("ALTER TABLE producto DROP COLUMN IF EXISTS fecha_caducidad")
    op.execute("DROP TABLE IF EXISTS bitacora")
