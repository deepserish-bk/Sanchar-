# Sanchar - Secure File Sharing 🔒

Simple, private, end-to-end encrypted file sharing that expires automatically.

## Features
- **End-to-End Encryption**: Files encrypted in browser before upload
- **Automatic Expiry**: Links expire after chosen time (1h, 24h, 7d)
- **No Server Access**: Server never sees your unencrypted files
- **Drag & Drop**: Easy file upload interface
- **Mobile Friendly**: Works on all modern browsers
- **Download Statistics**: Track your shared files

## Quick Start

### 1. Setup Environment
# Clone the repository
```bash
git clone https://github.com/yourusername/Sanchar-
cd Sanchar-

# Create virtual environment (if not exists)
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

### 2. Run the Application
# Start the server
python main.py

# Or with uvicorn directly
uvicorn main:app --reload
```
### 3. Open in Browser
http://localhost:8000

## Project Structure
```bash
Sanchar/
├── main.py              # Main FastAPI application
├── static/              # CSS, JavaScript files
├── templates/           # HTML templates
├── screenshots/         # Application screenshots
└── requirements.txt     # Python dependencies
```
## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

Made with ❤️ DEEPSERISH B K
