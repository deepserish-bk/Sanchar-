from fastapi import FastAPI, Request, Form, File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import uuid
import time
import base64
from typing import List

app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# In-memory storage
storage = {}

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    expiry: str = Form("24h"),
    has_password: str = Form(None)
):
    expiry_seconds = {"1h": 3600, "24h": 86400, "7d": 604800}.get(expiry, 86400)
    share_id = str(uuid.uuid4())

    encrypted_blobs = []
    filenames = []

    for file in files:
        content = await file.read()
        encrypted_blobs.append(base64.b64encode(content).decode())
        filenames.append(file.filename)

    storage[share_id] = {
        "data": encrypted_blobs,
        "filenames": filenames,
        "expiry": time.time() + expiry_seconds
    }

    # Clean expired
    expired = [k for k, v in storage.items() if time.time() > v["expiry"]]
    for k in expired:
        del storage[k]

    return JSONResponse({"share_id": share_id})

@app.get("/download/{share_id}", response_class=HTMLResponse)
async def download_page(request: Request, share_id: str):
    if share_id not in storage or time.time() > storage[share_id]["expiry"]:
        return templates.TemplateResponse("error.html", {"request": request, "message": "Link expired or invalid"})
    return templates.TemplateResponse("download.html", {"request": request, "share_id": share_id})

@app.get("/data/{share_id}")
async def get_data(share_id: str):
    if share_id not in storage or time.time() > storage[share_id]["expiry"]:
        return JSONResponse({"error": "Link expired"}, status_code=404)
    data = storage[share_id]
    return JSONResponse({"data": data["data"], "filenames": data["filenames"]})
