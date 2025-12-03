
Sanchar - Private File Sharing

A simple web app to share files securely. Files get encrypted in your browser before uploading. Only people with the secret key can decrypt them.

What It Does

Upload files → Encrypts them in your browser → Get a shareable link
Share link + key → Friend opens link → Enters key → Downloads decrypted files
Server never sees your actual files, only encrypted data
How to Run It

Make sure you have Python installed
Install the needed packages:
bash
pip install fastapi uvicorn
Run the server:
bash
uvicorn main:app --reload
Open browser: http://localhost:8000
Features

Drag & drop files to upload
Choose how long links last (1 hour, 24 hours, 7 days)
Optional password protection
Copy links/keys easily
Share via WhatsApp or email
See download statistics
Preview images/text before downloading
Works on phone browsers too
Tech Stuff

Backend: FastAPI (Python)
Frontend: Plain HTML/JavaScript
Encryption: Browser's built-in Web Crypto API
No databases: Files stored in memory (disappear when server restarts)
Files in the Project

main.py - The Python server code
templates/ - HTML pages (upload & download)
static/ - CSS and JavaScript files
requirements.txt - List of Python packages needed
Note

This is meant for personal use/testing. Files don't get saved permanently - they disappear when you stop the server.

Made with love from Nepal to Italy ❤️
