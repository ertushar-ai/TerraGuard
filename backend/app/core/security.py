from datetime import datetime, timedelta, timezone
import jwt
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY

ALGORITHM = "HS256"

try:
    from pwdlib import PasswordHash
    password_hash = PasswordHash.recommended()
    def hash_password(password: str) -> str:
        return password_hash.hash(password)
    def verify_password(password: str, hashed: str) -> bool:
        try:
            return password_hash.verify(password, hashed)
        except Exception:
            return False
except ImportError:
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
        def hash_password(password: str) -> str:
            return pwd_context.hash(password)
        def verify_password(password: str, hashed: str) -> bool:
            return pwd_context.verify(password, hashed)
    except ImportError:
        import hashlib, hmac
        def hash_password(password: str) -> str:
            return "pbkdf2$" + hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'terraguard_salt', 100000).hex()
        def verify_password(password: str, hashed: str) -> bool:
            if not hashed.startswith("pbkdf2$"):
                return False
            expected = hash_password(password)
            return hmac.compare_digest(expected, hashed)

def create_access_token(user_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expires, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> int:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload.get("sub")
    if user_id is None:
        raise ValueError("Invalid token")
    return int(user_id)
