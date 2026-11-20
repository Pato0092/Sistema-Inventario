export interface AuthRepository {
  login(correo: string, password: string): Promise<string>;
}
