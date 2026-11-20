"""Implementaciones concretas de los puertos de seguridad (bcrypt y JWT)."""
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.domain.seguridad import PasswordHasher, TokenProvider

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError(
        "Falta SECRET_KEY en el archivo .env (mínimo 32 caracteres). "
        "Genera una con: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

class BcryptPasswordHasher(PasswordHasher):
    def __init__(self):
        self._contexto = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def hashear(self, password : str) -> str:
        return self._contexto.hash(password)

    def verificar(self, password : str, password_hash : str) -> bool:
        return self._contexto.verify(password, password_hash)

class JwtTokenProvider(TokenProvider):
    def crear(self, correo : str) -> str:
        expira = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        return jwt.encode({"sub": correo, "exp": expira}, SECRET_KEY, algorithm=ALGORITHM)

    def correo_de(self, token : str) -> str | None:
        try:
            return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]).get("sub")
        except JWTError:
            return None
