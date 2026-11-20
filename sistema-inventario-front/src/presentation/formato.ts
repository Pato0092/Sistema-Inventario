export const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export const numero = new Intl.NumberFormat("es-MX");

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const fechaDeSoloDia = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
};

export const fechaDia = (iso: string) =>
  fechaDeSoloDia(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const diasHasta = (iso: string, hoy = new Date()) => {
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round(
    (fechaDeSoloDia(iso).getTime() - inicioHoy.getTime()) / 86_400_000,
  );
};
