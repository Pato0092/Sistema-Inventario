export class InvalidCredentialsError extends Error {
  constructor() {
    super("Correo o contraseña incorrectos.");
  }
}

export class InactiveUserError extends Error {
  constructor() {
    super("Tu usuario está desactivado. Contacta al administrador.");
  }
}

export class ServerUnavailableError extends Error {
  constructor() {
    super("No se pudo conectar con el servidor. Intenta de nuevo más tarde.");
  }
}
