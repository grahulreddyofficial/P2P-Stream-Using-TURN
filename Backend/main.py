from pydantic import BaseModel
from typing import Annotated
from fastapi import FastAPI, HTTPException, File, Form, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

import mysql
import mysql.connector

import time
import hmac
import hashlib
import base64

import uuid 
from pathlib import Path

app = FastAPI()

origins = [
    "https://p2p-stream-using-turn.vercel.app",
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

class SignalData(BaseModel):
    data: str

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

def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="Username",
        password="Your_Password",
        database="signaling_db",
        port="3306"
    )

@app.get("/turn-credentials")
def get_turn():
    return generate_turn_credentials("webuser")

@app.post("/push-offer/{ucode}")
def push_offer(ucode: str, body: SignalData):
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            "INSERT INTO signalling_db (ucode, offer) VALUES (%s, %s)",
            (ucode, body.data)
        )
        con.commit()
    finally:
        cursor.close()
        con.close()

    return {"db_push_status": "Offer pushed successfully"}

@app.get("/get-offer/{ucode}")
def get_offer(ucode: str):
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            "SELECT offer FROM signalling_db WHERE ucode = %s",
            (ucode,)
        )
        result = cursor.fetchone()
    finally:
        cursor.close()
        con.close()

    return {"offer": result[0] if result else None}


@app.post("/push-answer/{ucode}")
def push_answer(ucode: str, body: SignalData):
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            "INSERT INTO signalling_db (ucode, answer) VALUES (%s, %s)",
            (ucode, body.data)
        )
        con.commit()
    finally:
        cursor.close()
        con.close()

    return {"db_push_status": "Answer pushed successfully"}

@app.get("/get-answer/{ucode}")
def get_answer(ucode: str):
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            "SELECT answer FROM signalling_db WHERE ucode = %s",
            (ucode,)
        )
        result = cursor.fetchone()
    finally:
        cursor.close()
        con.close()

    return {"answer": result[0] if result else None}