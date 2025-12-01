const shareId = "{{ share_id }}";
const keyInput = document.getElementById('key-input');
const passwordInput = document.getElementById('password-input');
const decryptBtn = document.getElementById('decrypt-btn');
const fileList = document.getElementById('file-list');

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
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt']
  );
}

decryptBtn.addEventListener('click', async () => {
  const keyB64 = keyInput.value.trim();
  const password = passwordInput.value.trim();
  if (!keyB64) return alert('Enter the key!');

  const res = await fetch(`/data/${shareId}`);
  const json = await res.json();
  if (json.error) return alert(json.error);

  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  let key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', true, ['decrypt']);

  if (password) {
    // For password, keyB64 is actually the salt? Wait, no – in upload, keyB64 is derived key export, but to match, we derive again
    // Actually, for pw, we derive from pw + salt, but salt is in payload. Use first payload's salt.
    const firstPayload = json.data[0];
    const parts = firstPayload.split(':');
    if (parts.length === 3) {
      const saltB64 = parts[2];
      const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
      key = await deriveKey(password, salt);
    } else {
      return alert('Password required but salt missing');
    }
  }

  fileList.innerHTML = '';

  for (let i = 0; i < json.data.length; i++) {
    const parts = json.data[i].split(':');
    const encB64 = parts[0];
    const ivB64 = parts[1];
    const saltB64 = parts[2] || null;

    const encrypted = Uint8Array.from(atob(encB64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, encrypted);
    const blob = new Blob([decrypted]);
    const url = URL.createObjectURL(blob);

    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `<span class="file-icon">📥</span><div class="file-info"><div class="file-name"><a href="${url}" download="${json.filenames[i]}">${json.filenames[i]}</a></div></div>`;
    fileList.appendChild(div);
  }
});
