"""Pedidos a proveedores (tickets en espera).

Un pedido NO modifica el inventario; al marcarlo ENTREGADO la aplicación genera
una compra real. Es idempotente: estas tablas ya se habían creado con un
script SQL suelto (sql/pedidos.sql), por eso usa IF NOT EXISTS.

Revision ID: 0002
Revises: 0001
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS pedidos (
            id_pedido     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            id_usuario    INTEGER NOT NULL REFERENCES usuarios (id_usuario),
            id_proveedor  INTEGER NOT NULL REFERENCES proveedores (id_proveedor),
            fecha_hora    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            estado        VARCHAR(20) NOT NULL DEFAULT 'EN_ESPERA',
            id_compra     INTEGER REFERENCES compras (id_compra),
            fecha_entrega TIMESTAMP,
            CONSTRAINT pedidos_estado_check
                CHECK (estado IN ('EN_ESPERA', 'ENTREGADO', 'CANCELADO'))
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS detalle_pedido (
            id_detalle_pedido INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            id_pedido         INTEGER NOT NULL REFERENCES pedidos (id_pedido) ON DELETE CASCADE,
            id_producto       INTEGER NOT NULL REFERENCES producto (id_producto) ON DELETE RESTRICT,
            cantidad          INTEGER NOT NULL CHECK (cantidad > 0),
            precio_proveedor  NUMERIC(10, 2) NOT NULL CHECK (precio_proveedor > 0),
            UNIQUE (id_pedido, id_producto)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS detalle_pedido")
    op.execute("DROP TABLE IF EXISTS pedidos")
