from fastapi import FastAPI, Request, File, UploadFile, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid, time, os, base64
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

load_dotenv()

app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")
storage = {}

class EmailData(BaseModel):
    email: str
    key: str

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/upload")
async def upload(files: list[UploadFile] = File(...), expiry: str = Form("24h"), has_password: str = Form("false")):
    expiry_sec = {"1h":3600, "24h":86400, "7d":604800}.get(expiry, 86400)
    share_id = str(uuid.uuid4())
    
    data = []
    names = []
    
    for f in files:
        content = await f.read()
        # Store encrypted data as base64 string
        content_b64 = base64.b64encode(content).decode('utf-8')
        data.append(content_b64)
        names.append(f.filename.replace('.enc', ''))
    
    storage[share_id] = {
        "data": data,
        "names": names,
        "expiry": time.time() + expiry_sec,
        "has_password": has_password == "true"
    }
    
    print(f"Uploaded: {share_id}, files: {len(data)}, has_password: {has_password == 'true'}")
    return {"share_id": share_id}

@app.get("/download/{share_id}", response_class=HTMLResponse)
async def download(request: Request, share_id: str):
    if share_id not in storage:
        return HTMLResponse("<h1>Link not found</h1>")
    
    if time.time() > storage[share_id]["expiry"]:
        return HTMLResponse("<h1>Link expired</h1>")
    
    return templates.TemplateResponse("download.html", {
        "request": request,
        "share_id": share_id,
        "has_password": storage[share_id]["has_password"]
    })

@app.get("/data/{share_id}")
async def get_data(share_id: str):
    if share_id not in storage:
        return JSONResponse({"error": "not_found"}, status_code=404)
    
    if time.time() > storage[share_id]["expiry"]:
        return JSONResponse({"error": "expired"}, status_code=410)
    
    d = storage[share_id]
    return {
        "data": d["data"], 
        "filenames": d["names"], 
        "has_password": d["has_password"]
    }

@app.post("/send-key-email")
async def send_email(data: EmailData):
    message = Mail(
        from_email=os.getenv("FROM_EMAIL", "sanchar@yourdomain.com"),
        to_emails=data.email,
        subject="Your Sanchar Key",
        html_content=f"<strong>Key:</strong><br><code style='font-size:1.2em;background:#f0f0f0;padding:1em;display:block;'>{data.key}</code>"
    )
    try:
        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        sg.send(message)
        return {"status": "sent"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

@app.get("/debug/{share_id}")
async def debug(share_id: str):
    if share_id in storage:
        d = storage[share_id]
        sample = d["data"][0][:100] if d["data"] else "No data"
        return {
            "exists": True,
            "files_count": len(d["data"]),
            "filenames": d["names"],
            "sample_data": sample,
            "has_password": d["has_password"],
            "expired": time.time() > d["expiry"],
            "expiry_time": d["expiry"],
            "current_time": time.time()
        }
    return {"exists": False}