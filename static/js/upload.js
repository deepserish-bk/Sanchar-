let files = [];
let translations = {};
let currentFileIndex = 0;
let currentLink = '';
let currentKey = '';

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
const progressContainer = document.getElementById('progress-container');
const progressText = document.getElementById('progress-text');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');
const fileProgress = document.getElementById('file-progress');

// SIMPLIFIED: Only handle click on drop zone itself
dropZone.addEventListener('click', (e) => {
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
    <span class="file-icon">📄</span>
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

// Progress Bar Functions
function showProgress() {
  progressContainer.style.display = 'block';
  progressContainer.style.animation = 'fadeIn 0.3s ease';
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

// Show Email Modal
// Show Email Modal with Sender & Receiver Fields
function showEmailModal(link, keyB64) {
  const modal = document.createElement('div');
  modal.id = 'email-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  modal.innerHTML = `
    <div class="email-modal-content">
      <h2 style="background:linear-gradient(135deg,#10b981,#059669);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:2rem;margin:0 0 1rem;">Send via Email</h2>
      
      <p style="color:#666;margin-bottom:20px;">Enter email details to generate a ready-to-send email:</p>
      
      <div style="margin-bottom:20px;">
        <div style="margin-bottom:15px;">
          <label style="display:block;margin-bottom:5px;color:#666;font-weight:500;">Your Email (Sender):</label>
          <input type="email" id="sender-email" class="email-input" placeholder="you@example.com" />
        </div>
        
        <div style="margin-bottom:15px;">
          <label style="display:block;margin-bottom:5px;color:#666;font-weight:500;">Recipient Email:</label>
          <input type="email" id="recipient-email" class="email-input" placeholder="friend@example.com" />
        </div>
        
        <div style="margin-bottom:15px;">
          <label style="display:block;margin-bottom:5px;color:#666;font-weight:500;">Optional Message:</label>
          <textarea id="email-message" class="email-input" placeholder="Hi, here are the secure files I promised..." rows="3" style="resize:vertical;"></textarea>
        </div>
      </div>
      
      <div style="margin:20px 0;padding:15px;background:#f8f9fa;border-radius:10px;text-align:left;">
        <div style="margin-bottom:10px;"><strong>Secure Link:</strong><br><span style="font-family:monospace;font-size:12px;word-break:break-all;">${link}</span></div>
        <div><strong>Decryption Key:</strong><br><span style="font-family:monospace;font-size:12px;word-break:break-all;">${keyB64}</span></div>
      </div>
      
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin:20px 0;justify-content:center;">
        <button id="generate-email-btn" class="email-btn" style="background:#ea580c;">
          📧 Generate Email
        </button>
        
        <button id="copy-all-btn" class="email-btn" style="background:#6366f1;">
          📋 Copy All Details
        </button>
        
        <button id="gmail-btn" class="email-btn" style="background:#dc2626;">
          📨 Open Gmail
        </button>
        
        <button id="outlook-btn" class="email-btn" style="background:#0072c6;">
          📧 Open Outlook
        </button>
      </div>
      
      <div id="generated-email" style="display:none;margin-top:20px;padding:15px;background:#f0f9ff;border-radius:10px;border:1px solid #bae6fd;text-align:left;">
        <div style="margin-bottom:10px;font-weight:bold;color:#0369a1;">Ready to send email:</div>
        <div style="font-family:monospace;font-size:12px;white-space:pre-wrap;word-break:break-all;" id="email-content"></div>
        <button id="copy-email-btn" style="margin-top:10px;padding:8px 15px;background:#0ea5e9;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">
          Copy Email Text
        </button>
      </div>
      
      <button id="cancel-email-btn" class="email-btn secondary" style="margin-top:20px;">
        Cancel
      </button>
      
      <div id="email-status" style="margin-top:20px;"></div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus on sender email
  document.getElementById('sender-email').focus();
  
  // Generate Email Button
  document.getElementById('generate-email-btn').addEventListener('click', () => {
    const senderEmail = document.getElementById('sender-email').value.trim();
    const recipientEmail = document.getElementById('recipient-email').value.trim();
    const customMessage = document.getElementById('email-message').value.trim();
    
    if (!senderEmail || !recipientEmail) {
      showStatus('Please enter both sender and recipient emails', 'error');
      return;
    }
    
    if (!isValidEmail(senderEmail) || !isValidEmail(recipientEmail)) {
      showStatus('Please enter valid email addresses', 'error');
      return;
    }
    
    // Generate email content
    const emailContent = generateEmailContent(senderEmail, recipientEmail, customMessage, link, keyB64);
    
    // Display generated email
    document.getElementById('email-content').textContent = emailContent;
    document.getElementById('generated-email').style.display = 'block';
    
    // Scroll to generated email
    document.getElementById('generated-email').scrollIntoView({ behavior: 'smooth' });
    
    showStatus('Email generated successfully!', 'success');
  });
  
  // Copy All Details Button
  document.getElementById('copy-all-btn').addEventListener('click', () => {
    const senderEmail = document.getElementById('sender-email').value.trim();
    const recipientEmail = document.getElementById('recipient-email').value.trim();
    const customMessage = document.getElementById('email-message').value.trim();
    
    const allDetails = `
Sender: ${senderEmail || 'Not specified'}
Recipient: ${recipientEmail || 'Not specified'}
Message: ${customMessage || 'No additional message'}
Link: ${link}
Key: ${keyB64}
    `.trim();
    
    navigator.clipboard.writeText(allDetails).then(() => {
      showStatus('All details copied to clipboard!', 'success');
    }).catch(err => {
      console.error('Copy failed:', err);
      showStatus('Failed to copy to clipboard', 'error');
    });
  });
  
  // Copy Email Button
  document.getElementById('copy-email-btn').addEventListener('click', () => {
    const emailText = document.getElementById('email-content').textContent;
    navigator.clipboard.writeText(emailText).then(() => {
      showStatus('Email text copied to clipboard!', 'success');
    }).catch(err => {
      console.error('Copy failed:', err);
      showStatus('Failed to copy email', 'error');
    });
  });
  
  // Gmail Button
  document.getElementById('gmail-btn').addEventListener('click', () => {
    const senderEmail = document.getElementById('sender-email').value.trim();
    const recipientEmail = document.getElementById('recipient-email').value.trim();
    const customMessage = document.getElementById('email-message').value.trim();
    
    const emailSubject = encodeURIComponent('Sanchar Secure File Sharing');
    const emailBody = encodeURIComponent(generateEmailBody(senderEmail, recipientEmail, customMessage, link, keyB64));
    
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${emailSubject}&body=${emailBody}`;
    window.open(gmailUrl, '_blank');
  });
  
  // Outlook Button
  document.getElementById('outlook-btn').addEventListener('click', () => {
    const recipientEmail = document.getElementById('recipient-email').value.trim();
    const customMessage = document.getElementById('email-message').value.trim();
    
    const emailSubject = encodeURIComponent('Sanchar Secure File Sharing');
    const emailBody = encodeURIComponent(generateEmailBody('', recipientEmail, customMessage, link, keyB64));
    
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(recipientEmail)}&subject=${emailSubject}&body=${emailBody}`;
    window.open(outlookUrl, '_blank');
  });
  
  // Cancel Button
  document.getElementById('cancel-email-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  // Helper functions
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  function showStatus(message, type) {
    const statusDiv = document.getElementById('email-status');
    statusDiv.innerHTML = `<p style="color:${type === 'success' ? '#059669' : '#dc2626'};">${message}</p>`;
    
    setTimeout(() => {
      statusDiv.innerHTML = '';
    }, 3000);
  }
  
  function generateEmailBody(senderEmail, recipientEmail, customMessage, link, keyB64) {
    return `
Dear Recipient,

${customMessage ? customMessage + '\n\n' : ''}Here are your secure files shared via Sanchar:

🔗 Secure Link: ${link}
🔑 Decryption Key: ${keyB64}

Instructions:
1. Open the link above
2. Paste the decryption key when prompted
3. Download your files

Important:
- This link expires in 24 hours
- Keep the decryption key secure
- Files are end-to-end encrypted

Sent via Sanchar - Secure File Sharing
From: ${senderEmail || 'Sanchar User'}
    `.trim();
  }
  
  function generateEmailContent(senderEmail, recipientEmail, customMessage, link, keyB64) {
    return `
To: ${recipientEmail}
From: ${senderEmail}
Subject: Sanchar Secure File Sharing

Dear Recipient,

${customMessage ? customMessage + '\n\n' : ''}Here are your secure files shared via Sanchar:

🔗 Secure Link: ${link}
🔑 Decryption Key: ${keyB64}

Instructions:
1. Open the link above
2. Paste the decryption key when prompted
3. Download your files

Important:
- This link expires in 24 hours
- Keep the decryption key secure
- Files are end-to-end encrypted
- The server never sees your unencrypted files

Best regards,
${senderEmail}

---
Sent via Sanchar - End-to-end encrypted file sharing
Made with love from Nepal to Italy 🇳🇵 → 🇮🇹
    `.trim();
  }
  
  // Close on Escape key
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modal.remove();
    }
  });
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// SUCCESS MODAL (Updated - No QR, Added Email)
function showSuccess(link, keyB64) {
  currentLink = link;
  currentKey = keyB64;
  
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
      
      <!-- Email Button -->
      <button id="email-btn" style="margin:1rem;padding:1.2rem 3rem;background:#ea580c;color:white;border:none;border-radius:16px;cursor:pointer;font-weight:bold;font-size:1.2rem;">
        📧 Send via Email
      </button>

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
  
  // EMAIL BUTTON - NEW FUNCTIONALITY
  document.getElementById('email-btn').addEventListener('click', () => {
    modal.remove();
    setTimeout(() => {
      showEmailModal(link, keyB64);
    }, 300);
  });
  
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  // Close on Escape key
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modal.remove();
    }
  });
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
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
    
    // Show progress bar
    showProgress();
    updateProgress(0, files.length, 'Starting...');
    
    if (password) {
      console.log('Using password protection');
      salt = crypto.getRandomValues(new Uint8Array(16));
      key = await deriveKey(password, salt);
      const exported = await crypto.subtle.exportKey('raw', key);
      keyB64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    } else {
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

    // Encrypt each file with progress updates
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      currentFileIndex = i + 1;
      
      // Update progress
      updateProgress(currentFileIndex, files.length, file.name);
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
      
      // Create a text blob with the payload string
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
    
    // Hide progress bar and show success
    hideProgress();
    showSuccess(link, keyB64);

    // Reset form
    files = []; 
    fileList.innerHTML = ''; 
    updateSummary(); 
    passwordInput.value = '';
    
  } catch (error) {
    console.error('Upload error:', error);
    alert('Error: ' + error.message);
    hideProgress();
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = originalBtnText;
  }
}

console.log('upload.js loaded successfully');