document.addEventListener('DOMContentLoaded', function() {
    // Get values from HTML data attributes
    const shareId = document.body.dataset.shareId;
    const hasPassword = document.body.dataset.hasPassword === 'true';
    
    const keyInput = document.getElementById('key-input');
    const passwordInput = document.getElementById('password-input');
    const decryptBtn = document.getElementById('decrypt-btn');
    const fileList = document.getElementById('file-list');
    
    console.log("Download page loaded for share:", shareId);
    console.log("Has password:", hasPassword);
    
    // Update UI if password is required
    if (hasPassword) {
        const keyLabel = document.querySelector('#instructions');
        if (keyLabel) {
            keyLabel.innerHTML = 'Enter the password to decrypt your files';
        }
        if (keyInput) {
            keyInput.placeholder = "Key not needed (using password)";
            keyInput.disabled = true;
            keyInput.style.opacity = "0.5";
        }
    }
    
    // Helper function to derive key from password
    async function deriveKeyFromPassword(password, salt) {
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
                iterations: 200000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['decrypt']
        );
    }
    
    // Helper function to import raw key
    async function importRawKey(keyB64) {
        try {
            const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
            return await crypto.subtle.importKey(
                'raw',
                keyBytes,
                'AES-GCM',
                true,
                ['decrypt']
            );
        } catch (error) {
            throw new Error('Invalid key format. Please check the key.');
        }
    }
    
    // Format bytes for display
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Main decrypt function
    async function decryptFiles() {
        try {
            const keyB64 = keyInput.value.trim();
            const password = passwordInput.value.trim();
            
            // Validate inputs
            if (!hasPassword && !keyB64) {
                alert('Please enter the decryption key!');
                return;
            }
            
            if (hasPassword && !password) {
                alert('Please enter the password!');
                return;
            }
            
            // Update UI
            const originalBtnText = decryptBtn.textContent;
            decryptBtn.disabled = true;
            decryptBtn.textContent = 'Decrypting...';
            fileList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Decrypting files...</div>';
            
            console.log("Fetching data from server for share:", shareId);
            
            // Fetch data from server
            const response = await fetch(`/data/${shareId}`);
            const result = await response.json();
            
            console.log("Server response:", result);
            
            if (!response.ok || result.error) {
                throw new Error(result.error || 'Failed to fetch files from server');
            }
            
            if (!result.data || result.data.length === 0) {
                throw new Error('No files found in this share');
            }
            
            let decryptionKey;
            
            if (hasPassword) {
                // For password-protected files, derive key from password
                // Get salt from the first file's payload
                const firstPayloadBase64 = result.data[0];
                const firstPayload = atob(firstPayloadBase64); // Decode base64
                const parts = firstPayload.split(':');
                
                if (parts.length < 3) {
                    throw new Error('Invalid file format. Salt is missing.');
                }
                
                const saltB64 = parts[2];
                const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
                
                decryptionKey = await deriveKeyFromPassword(password, salt);
            } else {
                // For non-password files, import the raw key
                decryptionKey = await importRawKey(keyB64);
            }
            
            // Clear file list
            fileList.innerHTML = '';
            let successCount = 0;
            
            // Decrypt each file
            for (let i = 0; i < result.data.length; i++) {
                try {
                    // Data from server is base64 encoded
                    const payloadBase64 = result.data[i];
                    const payload = atob(payloadBase64); // Decode base64 to get string
                    const parts = payload.split(':');
                    
                    if (parts.length < 2) {
                        console.error('Invalid payload for file', i);
                        continue;
                    }
                    
                    const encryptedB64 = parts[0];
                    const ivB64 = parts[1];
                    
                    // Convert from base64 to Uint8Array
                    const encrypted = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
                    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
                    
                    // Decrypt
                    const decryptedData = await crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv },
                        decryptionKey,
                        encrypted
                    );
                    
                    // Get filename
                    const filename = result.filenames[i] || `file-${i + 1}`;
                    
                    // Create download link
                    const blob = new Blob([decryptedData]);
                    const url = URL.createObjectURL(blob);
                    
                    // Create file item
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.innerHTML = `
                        <span class="file-icon">📥</span>
                        <div class="file-info">
                            <div class="file-name">
                                <a href="${url}" download="${filename}">${filename}</a>
                            </div>
                            <div class="file-size">${formatBytes(decryptedData.byteLength)}</div>
                        </div>
                    `;
                    
                    fileList.appendChild(fileItem);
                    successCount++;
                    
                } catch (error) {
                    console.error(`Failed to decrypt file ${i}:`, error);
                    
                    const errorItem = document.createElement('div');
                    errorItem.className = 'file-item error';
                    errorItem.innerHTML = `
                        <span class="file-icon">❌</span>
                        <div class="file-info">
                            <div class="file-name">Failed to decrypt: ${result.filenames[i] || `file-${i + 1}`}</div>
                            <div class="file-size">${hasPassword ? 'Wrong password?' : 'Invalid key?'}</div>
                        </div>
                    `;
                    
                    fileList.appendChild(errorItem);
                }
            }
            
            // Show summary
            if (successCount > 0) {
                const summary = document.createElement('div');
                summary.style.cssText = 'margin-top: 20px; padding: 15px; background: rgba(0, 255, 0, 0.1); border-radius: 10px; text-align: center;';
                summary.innerHTML = `
                    <p style="color: #059669; margin-bottom: 10px;">
                        ✅ Successfully decrypted ${successCount} file${successCount !== 1 ? 's' : ''}
                    </p>
                    <p style="font-size: 14px; color: #666;">
                        Click on file names to download. Files are decrypted in your browser.
                    </p>
                `;
                fileList.appendChild(summary);
            } else {
                fileList.innerHTML = `
                    <div style="text-align: center; padding: 30px;">
                        <h3 style="color: #dc2626;">❌ Decryption Failed</h3>
                        <p>Could not decrypt any files.</p>
                        <p><small>Please check your ${hasPassword ? 'password' : 'decryption key'} and try again.</small></p>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Decryption error:', error);
            fileList.innerHTML = `
                <div style="text-align: center; padding: 30px; background: rgba(239, 68, 68, 0.1); border-radius: 10px;">
                    <h3 style="color: #dc2626;">❌ Error</h3>
                    <p>${error.message}</p>
                    <p><small>If this persists, the link may be expired or invalid.</small></p>
                </div>
            `;
        } finally {
            decryptBtn.disabled = false;
            decryptBtn.textContent = 'Decrypt & Download';
        }
    }
    
    // Add event listeners
    if (decryptBtn) {
        decryptBtn.addEventListener('click', decryptFiles);
    }
    
    // Also allow Enter key to trigger decryption
    if (keyInput) {
        keyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') decryptFiles();
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') decryptFiles();
        });
    }
    
    console.log("Download script loaded successfully");
});