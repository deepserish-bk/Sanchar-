let files = [];
let currentFileIndex = 0;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const summary = document.getElementById('summary');
const sendBtn = document.getElementById('send-btn');
const expirySelect = document.getElementById('expiry-select');
const passwordInput = document.getElementById('password-input');
const progressContainer = document.getElementById('progress-container');
const progressText = document.getElementById('progress-text');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');
const fileProgress = document.getElementById('file-progress');

// Click drop zone to open file picker
dropZone.addEventListener('click', (e) => {
  if (e.target === dropZone || 
      e.target.classList.contains('upload-icon') || 
      e.target.classList.contains('drop-text')) {
    fileInput.click();
  }
});

// Simple password hint
passwordInput.addEventListener('input', function() {
  const hint = document.getElementById('password-hint');
  const text = document.getElementById('strength-text');
  
  if (!hint || !text) return;
  
  if (this.value.length === 0) {
    hint.style.display = 'none';
    return;
  }
  
  hint.style.display = 'block';
  
  // Super simple logic
  if (this.value.length < 6) {
    text.textContent = 'Weak';
    text.style.color = '#e53e3e';
  } else if (this.value.length < 10) {
    text.textContent = 'Good';
    text.style.color = '#ecc94b';
  } else {
    text.textContent = 'Strong';
    text.style.color = '#38a169';
  }
});

// Handle file selection
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    files.push(...Array.from(fileInput.files));
    Array.from(fileInput.files).forEach(addFileToList);
    updateSummary();
    fileInput.value = '';
  }
});

// Format file size
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Update file summary
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
    <span class="file-icon">📄</span>
    <div class="file-info">
      <div class="file-name">${file.name}</div>
      <div class="file-size">${formatBytes(file.size)}</div>
    </div>
    <button class="remove-file" data-name="${file.name}">×</button>
  `;
  
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

// Drag & drop
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

// Progress bar
function showProgress() {
  progressContainer.style.display = 'block';
}

function hideProgress() {
  progressContainer.style.display = 'none';
}

function updateProgress(current, total, filename) {
  const percent = Math.round((current / total) * 100);
  progressText.textContent = `Encrypting: ${filename}`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  fileProgress.textContent = `File ${current} of ${total} • ${percent}%`;
}

// Success modal - black and white
function showSuccess(link, keyB64) {
  const modal = document.createElement('div');
  modal.id = 'success-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:2rem;max-width:500px;width:90%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
      <!-- Header - only place with color (logo gradient) -->
      <h2 style="background:linear-gradient(135deg,#E53E3E,#38A169);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:2rem;margin:0 0 1rem;">Success!</h2>

      <!-- Link section -->
      <div style="background:#f5f5f5;padding:1rem;border-radius:8px;margin:1rem 0;font-family:monospace;word-break:break-all;border:1px solid #ddd;color:#333;">
        <strong>Link:</strong><br>${link}
      </div>
      <button id="copy-link-btn" style="margin:0.5rem;padding:0.8rem 1.5rem;background:black;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:500;">Copy Link</button>

      <!-- Key section -->
      <div style="background:#f5f5f5;padding:1rem;border-radius:8px;margin:1rem 0;font-family:monospace;word-break:break-all;border:1px solid #ddd;color:#333;">
        <strong>Key:</strong><br>${keyB64}
      </div>
      <button id="copy-key-btn" style="margin:0.5rem;padding:0.8rem 1.5rem;background:black;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:500;">Copy Key</button>
      
      <!-- Email button -->
      <button id="email-btn" style="margin:1rem;padding:1rem 2rem;background:black;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:500;font-size:1.1rem;">
        📧 Send via Email
      </button>

      <!-- Copy both -->
      <button id="copy-both-btn" style="margin:0.5rem;padding:1rem 2rem;background:#333;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:500;">
        Copy Link + Key
      </button>

      <!-- WhatsApp -->
      <button id="whatsapp-btn" style="margin:0.5rem;padding:1rem 2rem;background:#333;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:500;">
        Send via WhatsApp
      </button>

      <!-- Close -->
      <button id="close-modal-btn" style="margin-top:1rem;padding:0.8rem 1.5rem;background:#666;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:500;">
        Close
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Copy link
  document.getElementById('copy-link-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(link).then(() => {
      const btn = document.getElementById('copy-link-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy Link', 2000);
    });
  });
  
  // Copy key
  document.getElementById('copy-key-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(keyB64).then(() => {
      const btn = document.getElementById('copy-key-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy Key', 2000);
    });
  });
  
  // Copy both
  document.getElementById('copy-both-btn').addEventListener('click', () => {
    const text = `Sanchar Secure File\nLink: ${link}\nKey: ${keyB64}`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copy-both-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy Link + Key', 2000);
    });
  });
  
  // WhatsApp
  document.getElementById('whatsapp-btn').addEventListener('click', () => {
    const text = `Sanchar Secure File\nLink: ${link}\nKey: ${keyB64}`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  });
  
  // Email button
  document.getElementById('email-btn').addEventListener('click', () => {
    modal.remove();
    setTimeout(() => {
      showEmailModal(link, keyB64);
    }, 300);
  });
  
  // Close
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  // Close on Escape
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.remove();
  });
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Email modal - black and white
function showEmailModal(link, keyB64) {
  const modal = document.createElement('div');
  modal.id = 'email-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:2rem;max-width:500px;width:90%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
      <h2 style="margin:0 0 1rem;color:#333;">Send via Email</h2>
      
      <p style="color:#666;margin-bottom:20px;">Enter email details:</p>
      
      <div style="margin-bottom:20px;">
        <input type="email" id="sender-email" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:6px;font-size:16px;" placeholder="your@email.com" />
        
        <input type="email" id="recipient-email" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:6px;font-size:16px;" placeholder="friend@email.com" />
        
        <textarea id="email-message" style="width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:6px;font-size:16px;min-height:80px;resize:vertical;" placeholder="Optional message..."></textarea>
      </div>
      
      <!-- Simple preview -->
      <div style="margin:20px 0;padding:15px;background:#f5f5f5;border-radius:8px;text-align:left;border:1px solid #ddd;">
        <div style="margin-bottom:10px;"><strong>Link:</strong><br><span style="font-family:monospace;font-size:12px;color:#333;">${link}</span></div>
        <div><strong>Key:</strong><br><span style="font-family:monospace;font-size:12px;color:#333;">${keyB64}</span></div>
      </div>
      
      <!-- Simple buttons -->
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin:20px 0;justify-content:center;">
        <button id="copy-all-btn" style="padding:12px 20px;background:black;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">
          Copy All
        </button>
        
        <button id="gmail-btn" style="padding:12px 20px;background:#333;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">
          Open Gmail
        </button>
        
        <button id="outlook-btn" style="padding:12px 20px;background:#333;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">
          Open Outlook
        </button>
      </div>
      
      <!-- Cancel -->
      <button id="cancel-email-btn" style="margin-top:10px;padding:12px 20px;background:#666;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">
        Cancel
      </button>
      
      <div id="email-status" style="margin-top:20px;"></div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus
  document.getElementById('sender-email').focus();
  
  // Copy All button
  document.getElementById('copy-all-btn').addEventListener('click', () => {
    const senderEmail = document.getElementById('sender-email').value.trim();
    const recipientEmail = document.getElementById('recipient-email').value.trim();
    const customMessage = document.getElementById('email-message').value.trim();
    
    const allDetails = `From: ${senderEmail || 'You'}
To: ${recipientEmail || 'Friend'}
Message: ${customMessage || 'No message'}

Link: ${link}
Key: ${keyB64}`;
    
    navigator.clipboard.writeText(allDetails).then(() => {
      showEmailStatus('Copied to clipboard');
    });
  });
  
  // Gmail
  document.getElementById('gmail-btn').addEventListener('click', () => {
    const recipientEmail = document.getElementById('recipient-email').value.trim();
    const customMessage = document.getElementById('email-message').value.trim();
    
    const emailSubject = 'Sanchar Secure File';
    const emailBody = `${customMessage ? customMessage + '\\n\\n' : ''}Link: ${link}\\nKey: ${keyB64}`;
    
    window.open(`https://mail.google.com/mail/?view=cm&to=${recipientEmail}&su=${emailSubject}&body=${emailBody}`, '_blank');
  });
  
  // Outlook
  document.getElementById('outlook-btn').addEventListener('click', () => {
    const recipientEmail = document.getElementById('recipient-email').value.trim();
    const customMessage = document.getElementById('email-message').value.trim();
    
    const emailSubject = 'Sanchar Secure File';
    const emailBody = `${customMessage ? customMessage + '\\n\\n' : ''}Link: ${link}\\nKey: ${keyB64}`;
    
    window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${recipientEmail}&subject=${emailSubject}&body=${emailBody}`, '_blank');
  });
  
  // Cancel
  document.getElementById('cancel-email-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  // Status helper
  function showEmailStatus(message) {
    const statusDiv = document.getElementById('email-status');
    statusDiv.innerHTML = `<p style="color:#333;margin:0;">${message}</p>`;
    setTimeout(() => statusDiv.innerHTML = '', 2000);
  }
  
  // Close handlers
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Encryption functions (unchanged)
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

// Main encryption
sendBtn.addEventListener('click', handleEncryptClick);

async function handleEncryptClick() {
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
    showProgress();
    updateProgress(0, files.length, 'Starting...');
    
    if (password) {
      salt = crypto.getRandomValues(new Uint8Array(16));
      key = await deriveKey(password, salt);
      const exported = await crypto.subtle.exportKey('raw', key);
      keyB64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    } else {
      key = await crypto.subtle.generateKey(
        {name: 'AES-GCM', length: 256}, 
        true, 
        ['encrypt', 'decrypt']
      );
      const exported = await crypto.subtle.exportKey('raw', key);
      keyB64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    }

    const formData = new FormData();
    formData.append('expiry', expirySelect.value);
    formData.append('has_password', password ? 'true' : 'false');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      currentFileIndex = i + 1;
      
      updateProgress(currentFileIndex, files.length, file.name);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const fileData = await file.arrayBuffer();
      
      const encrypted = await crypto.subtle.encrypt(
        {name: 'AES-GCM', iv}, 
        key, 
        fileData
      );
      
      const encryptedB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
      const ivB64 = btoa(String.fromCharCode(...iv));
      
      let payload = encryptedB64 + ':' + ivB64;
      if (password && salt) {
        const saltB64 = btoa(String.fromCharCode(...salt));
        payload += ':' + saltB64;
      }
      
      const blob = new Blob([payload], {type: 'text/plain'});
      formData.append('files', blob, file.name + '.enc');
    }

    const res = await fetch('/upload', {
      method: 'POST', 
      body: formData
    });
    
    if (!res.ok) throw new Error('Server error');
    
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    
    const share_id = result.share_id;
    const link = window.location.origin + '/download/' + share_id;
    
    hideProgress();
    showSuccess(link, keyB64);

    // Reset
    files = []; 
    fileList.innerHTML = ''; 
    updateSummary(); 
    passwordInput.value = '';
    
  } catch (error) {
    alert('Error: ' + error.message);
    hideProgress();
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = originalBtnText;
  }
}

console.log('upload.js loaded');