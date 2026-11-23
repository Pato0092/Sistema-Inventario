import { useCallback, useEffect, useState } from "react";
import type { DatosProveedor } from "../../domain/modelos";
import { container } from "../../infrastructure/container";
import { mensajeError } from "../mensajeError";

export interface ProductoDeProveedor {
  id_producto: number;
  ultimo_precio: number;
  ultima_cantidad: number;
  ultima_fecha: string;
  veces: number;
}

export interface ItemProveedor {
  id_proveedor: number;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  estado: boolean;
  num_compras: number;
  total_comprado: number;
  catalogo: ProductoDeProveedor[];
}

export function useProveedores() {
  const [items, setItems] = useState<ItemProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [proveedores, compras] = await Promise.all([
        container.inventario.proveedores(),
        container.inventario.compras(),
      ]);
      const resumen = new Map<number, { n: number; total: number }>();
      const catalogos = new Map<number, Map<number, ProductoDeProveedor>>();
      const confirmadas = compras
        .filter((c) => c.estado === "CONFIRMADA")
        .sort(
          (a, b) =>
            new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
        );
      for (const c of confirmadas) {
        const r = resumen.get(c.id_proveedor) ?? { n: 0, total: 0 };
        r.n += 1;
        r.total += Number(c.total);
        resumen.set(c.id_proveedor, r);

        const cat =
          catalogos.get(c.id_proveedor) ??
          new Map<number, ProductoDeProveedor>();
        for (const d of c.detalles) {
          cat.set(d.id_producto, {
            id_producto: d.id_producto,
            ultimo_precio: Number(d.precio_proveedor),
            ultima_cantidad: d.cantidad,
            ultima_fecha: c.fecha_hora,
            veces: (cat.get(d.id_producto)?.veces ?? 0) + 1,
          });
        }
        catalogos.set(c.id_proveedor, cat);
      }
      setItems(
        proveedores.map((p) => ({
          ...p,
          num_compras: resumen.get(p.id_proveedor)?.n ?? 0,
          total_comprado: resumen.get(p.id_proveedor)?.total ?? 0,
          catalogo: [...(catalogos.get(p.id_proveedor)?.values() ?? [])],
        })),
      );
    } catch {
      setError("No se pudieron cargar los proveedores desde el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearProveedor = async (datos: DatosProveedor) => {
    try {
      await container.inventario.crearProveedor(datos);
    } catch (err) {
      throw new Error(mensajeError(err));
    }
    await cargar();
  };

  const actualizarProveedor = async (id: number, datos: DatosProveedor) => {
    try {
      await container.inventario.actualizarProveedor(id, datos);
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
    crearProveedor,
    actualizarProveedor,
  };
}
