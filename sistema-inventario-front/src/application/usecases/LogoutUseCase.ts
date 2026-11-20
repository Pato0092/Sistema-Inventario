import type { TokenStorage } from "../../domain/repositories/TokenStorage";

export class LogoutUseCase {
  private readonly tokenStorage: TokenStorage;

  constructor(tokenStorage: TokenStorage) {
    this.tokenStorage = tokenStorage;
  }

  execute(): void {
    this.tokenStorage.clearToken();
  }
}
