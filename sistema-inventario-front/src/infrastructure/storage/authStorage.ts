import type { TokenStorage } from "../../domain/repositories/TokenStorage";

const TOKEN_KEY = "just_access_token";

export const authStorage: TokenStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};
