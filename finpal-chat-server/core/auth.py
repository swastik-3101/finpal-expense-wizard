from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from core.config import settings
 
bearer_scheme = HTTPBearer()
 
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    """
    Validates the same JWT your Express app issues.
    Returns the user_id string from the token payload.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        # Express typically puts userId inside payload.user.id
        user_id: str = (
            payload.get("user", {}).get("id")   # { user: { id: '...' } }
            or payload.get("id")                 # flat { id: '...' }
            or payload.get("sub")                # standard JWT sub
        )
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        return user_id
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
 