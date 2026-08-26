import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Synthetic Test Web App")

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")

def get_template(name: str) -> str:
    path = os.path.join(TEMPLATES_DIR, name)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/", response_class=HTMLResponse)
@app.get("/login", response_class=HTMLResponse)
async def login_page():
    return HTMLResponse(content=get_template("login.html"))

@app.get("/profile", response_class=HTMLResponse)
async def profile_page():
    return HTMLResponse(content=get_template("profile.html"))

@app.get("/banking", response_class=HTMLResponse)
async def banking_page():
    return HTMLResponse(content=get_template("banking.html"))
