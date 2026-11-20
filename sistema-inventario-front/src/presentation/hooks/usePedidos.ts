import { useCallback, useEffect, useState } from "react";
import {
  inventarioApi,
  type DetallePedidoDto,
  type PedidoDto,
} from "../../infrastructure/api/inventarioApi";
import { mensajeError } from "../../infrastructure/api/mensajeError";

export function usePedidos() {
  const [items, setItems] = useState<PedidoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await inventarioApi.pedidos());
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
      ejecutar(() => inventarioApi.crearPedido(idProveedor, detalles)),
    actualizarPedido: (id: number, detalles: DetallePedidoDto[]) =>
      ejecutar(() => inventarioApi.actualizarPedido(id, detalles)),
    entregarPedido: (id: number) =>
      ejecutar(() => inventarioApi.entregarPedido(id)),
    cancelarPedido: (id: number) =>
      ejecutar(() => inventarioApi.cancelarPedido(id)),
  };
}
