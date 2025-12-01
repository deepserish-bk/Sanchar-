from fastapi import FastAPI, Request, File, UploadFile, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid, time, base64, os
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
async def upload(files: list[UploadFile] = File(...), expiry: str = Form("24h")):
    expiry_sec = {"1h":3600, "24h":86400, "7d":604800}.get(expiry, 86400)
    share_id = str(uuid.uuid4())
    data = [base64.b64encode(await f.read()).decode() for f in files]
    names = [f.filename for f in files]
    storage[share_id] = {"data": data, "names": names, "expiry": time.time() + expiry_sec}
    return {"share_id": share_id}

@app.get("/download/{share_id}", response_class=HTMLResponse)
async def download(request: Request, share_id: str):
    if share_id not in storage or time.time() > storage[share_id]["expiry"]:
        return "<h1>Link expired</h1>"
    return templates.TemplateResponse("download.html", {"request": request, "share_id": share_id})

@app.get("/data/{share_id}")
async def get_data(share_id: str):
    if share_id not in storage or time.time() > storage[share_id]["expiry"]:
        return {"error": "expired"}
    d = storage[share_id]
    return {"data": d["data"], "names": d["names"]}

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
