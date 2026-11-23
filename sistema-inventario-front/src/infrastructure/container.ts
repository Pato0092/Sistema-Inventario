import { LoginUseCase } from "../application/usecases/LoginUseCase";
import { LogoutUseCase } from "../application/usecases/LogoutUseCase";
import { IsAuthenticatedUseCase } from "../application/usecases/IsAuthenticatedUseCase";
import { inventarioApi } from "./api/inventarioApi";
import { AuthRepositoryHttp } from "./repositories/AuthRepositoryHttp";
import { authStorage } from "./storage/authStorage";

const authRepository = new AuthRepositoryHttp();

export const container = {
  inventario: inventarioApi,
  loginUseCase: new LoginUseCase(authRepository, authStorage),
  logoutUseCase: new LogoutUseCase(authStorage),
  isAuthenticatedUseCase: new IsAuthenticatedUseCase(authStorage),
};
