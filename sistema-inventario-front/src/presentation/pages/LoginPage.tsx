import React, { useState } from "react";

interface LoginPageProps {
  login: (correo: string, password: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white py-3 pl-10 pr-10 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15";

export const LoginPage: React.FC<LoginPageProps> = ({ login, loading, error }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="fixed inset-0 overflow-auto bg-papel text-left text-stone-800">
      <div className="relative flex min-h-full flex-col">
        <main className="grid flex-1 place-items-center px-6 py-10">
          <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8">
            <h1 className="m-0 text-center text-3xl font-medium tracking-tight text-stone-900">
              Bienvenido
            </h1>
            <p className="mb-7 mt-2 text-center text-sm text-stone-500">
              Ingresa para gestionar el inventario de tu tienda.
            </p>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                <svg {...svgProps} width={16} height={16}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-email"
                  className="text-sm font-medium text-stone-700"
                >
                  Correo electrónico
                </label>
                <div className="group relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-stone-400 transition group-focus-within:text-brand-700">
                    <svg {...svgProps}>
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-10 6L2 7" />
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    className={inputClass}
                    type="email"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="admin@inventario.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-stone-700"
                >
                  Contraseña
                </label>
                <div className="group relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-stone-400 transition group-focus-within:text-brand-700">
                    <svg {...svgProps}>
                      <rect width="18" height="11" x="3" y="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    className={inputClass}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute right-1.5 grid size-8 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:text-brand-800"
                  >
                    <svg {...svgProps}>
                      {showPassword ? (
                        <>
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
                          <path d="m2 2 20 20" />
                        </>
                      ) : (
                        <>
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 active:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                )}
                {loading ? "Iniciando sesión..." : "Entrar al sistema"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};
