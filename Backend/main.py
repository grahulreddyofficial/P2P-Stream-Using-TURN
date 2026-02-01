from pydantic import BaseModel
from typing import Annotated
from fastapi import FastAPI, HTTPException, File, Form, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

import time
import hmac
import hashlib
import base64

import uuid 
from pathlib import Path

app = FastAPI()

origins = [
    "https://p2p-stream-using-turn.vercel.app/",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # List of allowed origins
    allow_credentials=True,         # Allow cookies to be included in cross-origin requests
    allow_methods=["*"],            # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],            # Allow all headers
)

TURN_SECRET = "SUPER_LONG_RANDOM_SECRET_KEY"
TURN_URL = "turn:turn.yoursite.com:3478?transport=udp"

def generate_turn_credentials(user_id: str):
    expiry = int(time.time()) + 3600  # 1 hour
    username = f"{expiry}:{user_id}"

    hmac_key = hmac.new(
        TURN_SECRET.encode(),
        username.encode(),
        hashlib.sha1
    ).digest()

    password = base64.b64encode(hmac_key).decode()

    return {
        "urls": [TURN_URL],
        "username": username,
        "credential": password
    }

@app.get("/turn-credentials")
def get_turn():
    return generate_turn_credentials("webuser")