let files = [];
let translations = {};

// Load translations (optional)
fetch('/static/i18n/translations.json')
  .then(r => r.json())
  .then(data => { translations = data; })
  .catch(() => console.log('Translations not loaded'));

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const summary = document.getElementById('summary');
const dropText = document.querySelector('.drop-text');
const sendBtn = document.getElementById('send-btn');
const expirySelect = document.getElementById('expiry-select');
const passwordInput = document.getElementById('password-input');

// SIMPLIFIED: Only handle click on drop zone itself
dropZone.addEventListener('click', (e) => {
  // Only open file picker if clicking directly on drop zone area (not buttons/inputs)
  if (e.target === dropZone || 
      e.target.classList.contains('upload-icon') || 
      e.target.classList.contains('drop-text')) {
    fileInput.click();
  }
});

// File input change handler
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    files.push(...Array.from(fileInput.files));
    Array.from(fileInput.files).forEach(addFileToList);
    updateSummary();
    fileInput.value = '';
  }
});

// Format bytes helper
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Update summary
function updateSummary() {
  if (!files.length) { 
    summary.textContent = ''; 
    return; 
  }
  const total = files.reduce((a, f) => a + f.size, 0);
  summary.textContent = `${files.length} file${files.length > 1 ? 's' : ''} ready • ${formatBytes(total)}`;
}

// Add file to list
function addFileToList(file) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.innerHTML = `
    <span class="file-icon">✓</span>
    <div class="file-info">
      <div class="file-name">${file.name}</div>
      <div class="file-size">${formatBytes(file.size)}</div>
    </div>
    <button class="remove-file" data-name="${file.name}">×</button>
  `;
  
  // Add remove functionality
  const removeBtn = div.querySelector('.remove-file');
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const fileName = removeBtn.getAttribute('data-name');
    files = files.filter(f => f.name !== fileName);
    div.remove();
    updateSummary();
  });
  
  fileList.appendChild(div);
}

// Drag & drop handlers
dropZone.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  
  if (e.dataTransfer.files.length > 0) {
    files.push(...Array.from(e.dataTransfer.files));
    Array.from(e.dataTransfer.files).forEach(addFileToList);
    updateSummary();
  }
});

// SUCCESS MODAL
function showSuccess(link, keyB64) {
  const modal = document.createElement('div');
  modal.id = 'success-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  modal.innerHTML = `
    <div style="background:rgba(255,255,255,0.15);backdrop-filter:blur(20px);border-radius:24px;padding:2rem;max-width:600px;width:90%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);">
      <h2 style="background:linear-gradient(135deg,#10b981,#059669);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:2.5rem;margin:0 0 1rem;">Success!</h2>

      <div style="background:rgba(255,255,255,0.1);padding:1rem;border-radius:16px;margin:1.5rem 0;font-family:monospace;word-break:break-all;border:2px dashed #6366f1;">
        <strong>Link:</strong><br>${link}
      </div>
      <button id="copy-link-btn" style="margin:0.5rem;padding:0.8rem 1.5rem;background:#6366f1;color:white;border:none;border-radius:12px;cursor:pointer;font-weight:bold;">Copy Link</button>

      <div style="background:rgba(255,255,255,0.1);padding:1rem;border-radius:16px;margin:1.5rem 0;font-family:monospace;word-break:break-all;border:2px dashed #ec4899;">
        <strong>Key:</strong><br>${keyB64}
      </div>
      <button id="copy-key-btn" style="margin:0.5rem;padding:0.8rem 1.5rem;background:#ec4899;color:white;border:none;border-radius:12px;cursor:pointer;font-weight:bold;">Copy Key</button>

      <button id="copy-both-btn" style="margin:1rem;padding:1rem 2rem;background:#f59e0b;color:white;border:none;border-radius:16px;cursor:pointer;font-weight:bold;font-size:1.1rem;">
        Copy Link + Key together
      </button>

      <button id="whatsapp-btn" style="margin:1rem;padding:1.2rem 3rem;background:#25d366;color:white;border:none;border-radius:16px;cursor:pointer;font-weight:bold;font-size:1.2rem;">
        Send via WhatsApp
      </button>

      <button id="close-modal-btn" style="margin-top:2rem;padding:1rem 2rem;background:#1e293b;color:white;border:none;border-radius:16px;cursor:pointer;font-size:1.1rem;font-weight:bold;">
        Close
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners to modal buttons
  document.getElementById('copy-link-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(link).then(() => {
      const btn = document.getElementById('copy-link-btn');
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = originalText, 2000);
    }).catch(err => {
      console.error('Copy failed:', err);
      alert('Failed to copy to clipboard');
    });
  });
  
  document.getElementById('copy-key-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(keyB64).then(() => {
      const btn = document.getElementById('copy-key-btn');
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = originalText, 2000);
    }).catch(err => {
      console.error('Copy failed:', err);
      alert('Failed to copy to clipboard');
    });
  });
  
  document.getElementById('copy-both-btn').addEventListener('click', () => {
    const text = `Sanchar Secure File\nLink: ${link}\nKey: ${keyB64}`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copy-both-btn');
      const originalText = btn.textContent;
      btn.textContent = 'Copied both!';
      setTimeout(() => btn.textContent = originalText, 2000);
    }).catch(err => {
      console.error('Copy failed:', err);
      alert('Failed to copy to clipboard');
    });
  });
  
  document.getElementById('whatsapp-btn').addEventListener('click', () => {
    const text = `Sanchar Secure File\nLink: ${link}\nKey: ${keyB64}\n\nEnd-to-end encrypted from Nepal to Italy`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  });
  
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    modal.remove();
  });
}

// Derive key from password
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', 
    enc.encode(password), 
    'PBKDF2', 
    false, 
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    { 
      name: 'PBKDF2', 
      salt, 
      iterations: 200000, 
      hash: 'SHA-256' 
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Main encryption function
sendBtn.addEventListener('click', handleEncryptClick);

async function handleEncryptClick() {
  console.log('Encrypt button clicked');
  
  if (files.length === 0) {
    alert('Please add files first!');
    return;
  }
  
  const originalBtnText = sendBtn.textContent;
  sendBtn.disabled = true;
  sendBtn.textContent = 'Encrypting...';

  const password = passwordInput.value.trim();
  let key, keyB64, salt = null;

  try {
    console.log('Starting encryption process...');
    
    if (password) {
      // For password-protected files
      console.log('Using password protection');
      salt = crypto.getRandomValues(new Uint8Array(16));
      key = await deriveKey(password, salt);
      const exported = await crypto.subtle.exportKey('raw', key);
      keyB64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    } else {
      // For non-password files
      console.log('Using random key');
      key = await crypto.subtle.generateKey(
        {name: 'AES-GCM', length: 256}, 
        true, 
        ['encrypt', 'decrypt']
      );
      const exported = await crypto.subtle.exportKey('raw', key);
      keyB64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    }

    console.log('Key generated:', keyB64.substring(0, 20) + '...');
    
    const formData = new FormData();
    formData.append('expiry', expirySelect.value);
    formData.append('has_password', password ? 'true' : 'false');

    // Encrypt each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Encrypting file ${i + 1}/${files.length}:`, file.name);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const fileData = await file.arrayBuffer();
      
      // Encrypt the file
      const encrypted = await crypto.subtle.encrypt(
        {name: 'AES-GCM', iv}, 
        key, 
        fileData
      );
      
      // Convert to base64 strings
      const encryptedB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
      const ivB64 = btoa(String.fromCharCode(...iv));
      
      // Build payload: encrypted:iv:salt (salt only if password used)
      let payload = encryptedB64 + ':' + ivB64;
      if (password && salt) {
        const saltB64 = btoa(String.fromCharCode(...salt));
        payload += ':' + saltB64;
      }
      
      // IMPORTANT: Create a text blob with the payload string
      const blob = new Blob([payload], {type: 'text/plain'});
      formData.append('files', blob, file.name + '.enc');
    }

    console.log('Sending files to server...');
    // Send to server
    const res = await fetch('/upload', {
      method: 'POST', 
      body: formData
    });
    
    console.log('Server response status:', res.status);
    
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }
    
    const result = await res.json();
    console.log('Server response:', result);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    const share_id = result.share_id;
    const link = window.location.origin + '/download/' + share_id;
    
    console.log('Success! Link:', link);
    console.log('Key:', keyB64);
    
    // Show success modal
    showSuccess(link, keyB64);

    // Reset form
    files = []; 
    fileList.innerHTML = ''; 
    updateSummary(); 
    passwordInput.value = '';
    
  } catch (error) {
    console.error('Upload error:', error);
    alert('Error: ' + error.message);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = originalBtnText;
  }
}

console.log('upload.js loaded successfully');