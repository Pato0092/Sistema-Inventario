import { isAxiosError } from "axios";
import type { AuthRepository } from "../../domain/repositories/AuthRepository";
import {
  InactiveUserError,
  InvalidCredentialsError,
  ServerUnavailableError,
} from "../../domain/errors/AuthErrors";
import { httpClient } from "../api/httpClient";

export class AuthRepositoryHttp implements AuthRepository {
  async login(correo: string, password: string): Promise<string> {
    const formData = new URLSearchParams();
    formData.append("username", correo);
    formData.append("password", password);

    try {
      const response = await httpClient.post<{ access_token: string }>(
        "/auth/token",
        formData,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      return response.data.access_token;
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) throw new InvalidCredentialsError();
        if (status === 403) throw new InactiveUserError();
      }
      throw new ServerUnavailableError();
    }
  }
}
