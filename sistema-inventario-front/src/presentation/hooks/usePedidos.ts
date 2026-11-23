import { useCallback, useEffect, useState } from "react";
import type { DetallePedidoDto, PedidoDto } from "../../domain/modelos";
import { container } from "../../infrastructure/container";
import { mensajeError } from "../mensajeError";

export function usePedidos() {
  const [items, setItems] = useState<PedidoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await container.inventario.pedidos());
    } catch {
      setError("No se pudieron cargar los pedidos desde el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ejecutar = async (accion: () => Promise<unknown>) => {
    try {
      await accion();
    } catch (err) {
      throw new Error(mensajeError(err));
    }
    await cargar();
  };

  return {
    items,
    loading,
    error,
    recargar: cargar,
    crearPedido: (idProveedor: number, detalles: DetallePedidoDto[]) =>
      ejecutar(() => container.inventario.crearPedido(idProveedor, detalles)),
    actualizarPedido: (id: number, detalles: DetallePedidoDto[]) =>
      ejecutar(() => container.inventario.actualizarPedido(id, detalles)),
    entregarPedido: (id: number) =>
      ejecutar(() => container.inventario.entregarPedido(id)),
    cancelarPedido: (id: number) =>
      ejecutar(() => container.inventario.cancelarPedido(id)),
  };
}
