import type { AuthRepository } from "../../domain/repositories/AuthRepository";
import type { TokenStorage } from "../../domain/repositories/TokenStorage";

export class LoginUseCase {
  private readonly authRepository: AuthRepository;
  private readonly tokenStorage: TokenStorage;

  constructor(authRepository: AuthRepository, tokenStorage: TokenStorage) {
    this.authRepository = authRepository;
    this.tokenStorage = tokenStorage;
  }

  async execute(correo: string, password: string): Promise<void> {
    const token = await this.authRepository.login(correo, password);
    if (!token) {
      throw new Error("Token no válido recibido del servidor");
    }
    this.tokenStorage.setToken(token);
  }
}
