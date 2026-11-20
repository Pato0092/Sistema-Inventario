import { useState } from "react";
import { container } from "../../infrastructure/container";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    container.isAuthenticatedUseCase.execute(),
  );

  const login = async (correo: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await container.loginUseCase.execute(correo, password);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    container.logoutUseCase.execute();
    setIsAuthenticated(false);
  };

  return { login, logout, loading, error, isAuthenticated };
}
