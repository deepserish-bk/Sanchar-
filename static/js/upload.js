let files = [];
let translations = {};
let currentLang = document.documentElement.lang || 'en';

fetch('/static/i18n/translations.json')
  .then(r => r.json())
  .then(data => { translations = data; updateTexts(); });

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const summary = document.getElementById('summary');
const dropText = document.querySelector('.drop-text');
const sendBtn = document.getElementById('send-btn');
const expirySelect = document.getElementById('expiry-select');
const passwordInput = document.getElementById('password-input');

// PREVENT file picker when clicking password, expiry, or encrypt button
passwordInput.addEventListener('click', e => e.stopPropagation());
passwordInput.addEventListener('focus', e => e.stopPropagation());
expirySelect.addEventListener('click', e => e.stopPropagation());
sendBtn.addEventListener('click', e => e.stopPropagation());

// Only the drop zone itself (not controls) opens file picker
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  files.push(...fileInput.files);
  [...fileInput.files].forEach(addFileToList);
  updateSummary();
  fileInput.value = '';
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateTexts() {
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.dataset.key;
    if (translations[currentLang]?.[key]) el.textContent = translations[currentLang][key];
  });
}

function updateSummary() {
  if (files.length === 0) { summary.textContent = ''; return; }
  const total = files.reduce((a, f) => a + f.size, 0);
  summary.textContent = files.length === 1 
    ? `1 file ready • ${formatBytes(total)}`
    : `${files.length} files ready • ${formatBytes(total)}`;
}

function addFileToList(file) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.innerHTML = `
    <span class="file-icon">Checkmark</span>
    <div class="file-info">
      <div class="file-name">${file.name}</div>
      <div class="file-size">${formatBytes(file.size)}</div>
    </div>
  `;
  fileList.appendChild(div);
}

// Drag & drop
['dragenter', 'dragover'].forEach(e => dropZone.addEventListener(e, ev => {
  ev.preventDefault();
  dropZone.classList.add('drag-over');
  dropText.textContent = translations[currentLang]?.drag_over || 'Release to drop!';
}));
['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, ev => {
  ev.preventDefault();
  dropZone.classList.remove('drag-over');
  dropText.textContent = translations[currentLang]?.drop_here || 'Drop files here or click to upload';
}));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  files.push(...e.dataTransfer.files);
  [...e.dataTransfer.files].forEach(addFileToList);
  updateSummary();
});

// Beautiful success modal
function showSuccess(link, keyB64, hasPassword = false) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem;';
  modal.innerHTML = `
    <div style="background:rgba(255,255,255,0.15);backdrop-filter:blur(20px);border-radius:24px;padding:2rem;max-width:600px;width:100%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);">
      <h2 style="background:linear-gradient(135deg,#10b981,#059669);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:2.5rem;margin:0 0 1rem;">Success!</h2>
      <p style="color:#e2e8f0;margin-bottom:1.5rem;">Share the link • Send the key separately</p>

      <div style="background:rgba(255,255,255,0.1);padding:1rem;border-radius:16px;margin:1rem 0;font-family:monospace;word-break:break-all;border:2px dashed #6366f1;">
        <strong>Link:</strong><br>${link}
      </div>
      <button onclick="navigator.clipboard.writeText('${link}');this.innerHTML='Copied!'" style="margin:0.5rem;padding:0.8rem 1.5rem;background:#6366f1;color:white;border:none;border-radius:12px;cursor:pointer;font-weight:bold;">Copy Link</button>

      <div style="background:rgba(255,255,255,0.1);padding:1rem;border-radius:16px;margin:1rem 0;font-family:monospace;word-break:break-all;border:2px dashed #ec4899;">
        <strong>Decryption Key:</strong><br>${keyB64}
      </div>
      <button onclick="navigator.clipboard.writeText('${keyB64}');this.innerHTML='Copied!'" style="margin:0.5rem;padding:0.8rem 1.5rem;background:#ec4899;color:white;border:none;border-radius:12px;cursor:pointer;font-weight:bold;">Copy Key</button>

      ${hasPassword ? '<p style="color:#fda4af;margin-top:1rem;font-weight:bold;">Password was set — you know it</p>' : ''}

      <button onclick="this.closest('div').parentNode.remove()" style="margin-top:2rem;padding:1rem 2rem;background:#1e293b;color:white;border:none;border-radius:16px;cursor:pointer;font-size:1.1rem;font-weight:bold;">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// Encryption (your working version)
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

sendBtn.addEventListener('click', async () => {
  if (files.length === 0) return alert('Add files first!');

  sendBtn.disabled = true;
  sendBtn.textContent = 'Encrypting...';

  const password = passwordInput.value.trim();
  let key, keyB64;

  if (password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    key = await deriveKey(password, salt);
  } else {
    key = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
  }
  const exported = await crypto.subtle.exportKey('raw', key);
  keyB64 = btoa(String.fromCharCode(...new Uint8Array(exported)));

  const formData = new FormData();
  formData.append('expiry', expirySelect.value);
  if (password) formData.append('has_password', 'true');

  for (const file of files) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, await file.arrayBuffer());
    const payload = btoa(String.fromCharCode(...new Uint8Array(encrypted))) + ':' + btoa(String.fromCharCode(...iv));
    const blob = new Blob([payload]);
    formData.append('files', blob, file.name + '.enc');
  }

  const res = await fetch('/upload', {method: 'POST', body: formData});
  const {share_id} = await res.json();
  const link = location.origin + '/download/' + share_id;

  showSuccess(link, keyB64, !!password);

  files = []; fileList.innerHTML = ''; updateSummary(); passwordInput.value = '';
  sendBtn.disabled = false;
  sendBtn.textContent = 'Encrypt & Generate Secure Link';
});
