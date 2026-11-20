import type { TokenStorage } from "../../domain/repositories/TokenStorage";

export class IsAuthenticatedUseCase {
  private readonly tokenStorage: TokenStorage;

  constructor(tokenStorage: TokenStorage) {
    this.tokenStorage = tokenStorage;
  }

  execute(): boolean {
    return !!this.tokenStorage.getToken();
  }
}
