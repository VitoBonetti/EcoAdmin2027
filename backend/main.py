from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import traceback
import os
import time
from jose import jwt
from routers import users, company, costs, customers, entries, suppliers
from middleware.auth import get_current_user
from database import get_db

app = FastAPI(
    title="Eco Admin API",
    description="Eco Admin API",
    version="1.0",
    swagger_ui_parameters={"defaultModelsExpandDepth": -1}
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the static directory so Jinja2 templates can find the CSS files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Global Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    path = request.url.path
    error_msg = str(exc)
    print("".join(traceback.format_exception(type(exc), exc, exc.__traceback__)))
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Check the backend logs."}
    )


# Register the routes
app.include_router(users.router)
app.include_router(company.router)
app.include_router(costs.router)
app.include_router(customers.router)
app.include_router(entries.router)
app.include_router(suppliers.router)


@app.get("/api/health", include_in_schema=False)
def health_check():
    return {"status": "online", "system": "Isha"}