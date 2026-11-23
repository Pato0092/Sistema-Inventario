import { useCallback, useEffect, useState } from "react";
import { mensajeError } from "../mensajeError";
import type { CategoriaDto, NuevoProducto } from "../../domain/modelos";
import { container } from "../../infrastructure/container";

export interface ItemInventario {
  id_producto: number;
  codigo_barras: string;
  nombre: string;
  marca: string | null;
  presentacion: string | null;
  precio_venta: number;
  estado: boolean;
  id_categoria: number;
  categoria: string;
  cantidad: number;
  stock_minimo: number;
  fecha_caducidad: string | null;
}

export function useInventario() {
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productos, stock, categorias] = await Promise.all([
        container.inventario.productos(),
        container.inventario.stock(),
        container.inventario.categorias(),
      ]);
      setCategorias(categorias);
      const stockPorProducto = new Map(stock.map((s) => [s.id_producto, s]));
      const nombreCategoria = new Map(
        categorias.map((c) => [c.id_categoria, c.nombre]),
      );
      setItems(
        productos.map((p) => ({
          ...p,
          precio_venta: Number(p.precio_venta),
          categoria: nombreCategoria.get(p.id_categoria) ?? "Sin categoría",
          cantidad: stockPorProducto.get(p.id_producto)?.cantidad ?? 0,
          stock_minimo: stockPorProducto.get(p.id_producto)?.stock_minimo ?? 0,
        })),
      );
    } catch {
      setError("No se pudo cargar el inventario desde el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearProducto = async (
    producto: NuevoProducto,
    nuevaCategoria?: string,
  ) => {
    try {
      let id_categoria = producto.id_categoria;
      if (nuevaCategoria) {
        id_categoria = (await container.inventario.crearCategoria(nuevaCategoria))
          .id_categoria;
      }
      await container.inventario.crearProducto({ ...producto, id_categoria });
    } catch (err) {
      throw new Error(mensajeError(err));
    }
    await cargar();
  };

  const editarProducto = async (
    id: number,
    producto: NuevoProducto,
    nuevaCategoria?: string,
  ) => {
    try {
      let id_categoria = producto.id_categoria;
      if (nuevaCategoria) {
        id_categoria = (await container.inventario.crearCategoria(nuevaCategoria))
          .id_categoria;
      }
      await container.inventario.actualizarProducto(id, { ...producto, id_categoria });
    } catch (err) {
      throw new Error(mensajeError(err));
    }
    await cargar();
  };

  const alternarEstado = async (item: ItemInventario) => {
    try {
      await container.inventario.actualizarProducto(item.id_producto, {
        codigo_barras: item.codigo_barras,
        nombre: item.nombre,
        marca: item.marca,
        presentacion: item.presentacion,
        precio_venta: item.precio_venta,
        estado: !item.estado,
        id_categoria: item.id_categoria,
        stock_minimo: item.stock_minimo,
        cantidad: item.cantidad,
        fecha_caducidad: item.fecha_caducidad,
      });
    } catch (err) {
      throw new Error(mensajeError(err));
    }
    await cargar();
  };

  const eliminarProducto = async (id: number) => {
    try {
      await container.inventario.eliminarProducto(id);
    } catch (err) {
      throw new Error(mensajeError(err));
    }
    await cargar();
  };

  return {
    items,
    categorias,
    loading,
    error,
    recargar: cargar,
    crearProducto,
    editarProducto,
    alternarEstado,
    eliminarProducto,
  };
}
