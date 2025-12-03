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
    
    // File type icon function
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'pdf': '📕',
            'doc': '📄', 'docx': '📄',
            'xls': '📊', 'xlsx': '📊',
            'ppt': '📽️', 'pptx': '📽️',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 'webp': '🖼️',
            'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵',
            'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬',
            'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️', 'tar': '🗜️', 'gz': '🗜️',
            'txt': '📝',
            'html': '🌐', 'htm': '🌐',
            'js': '📜',
            'py': '🐍',
            'java': '☕',
            'cpp': '⚙️', 'c': '⚙️',
            'exe': '⚙️',
            'dmg': '💿'
        };
        return icons[ext] || '📁';
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
    
    // Show file statistics
    function showFileStats(downloadCount, createdTime) {
        const statsDiv = document.getElementById('file-stats');
        const countSpan = document.getElementById('download-count');
        const timeSpan = document.getElementById('created-time');
        
        if (statsDiv && countSpan && timeSpan) {
            countSpan.textContent = downloadCount;
            
            // Format the time
            const timeDiff = Date.now() - (createdTime * 1000);
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);
            
            if (days > 0) {
                timeSpan.textContent = `${days} day${days !== 1 ? 's' : ''} ago`;
            } else if (hours > 0) {
                timeSpan.textContent = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            } else {
                timeSpan.textContent = 'Just now';
            }
            
            statsDiv.style.display = 'block';
        }
    }
    
    // Show download progress
    function showDownloadProgress() {
        const progressHTML = `
            <div id="download-progress">
                <div class="progress-header">
                    <span id="dl-progress-text">Decrypting...</span>
                    <span id="dl-progress-percent">0%</span>
                </div>
                <div class="progress-bar-bg">
                    <div id="dl-progress-bar" class="progress-bar-fill"></div>
                </div>
            </div>
        `;
        fileList.innerHTML = progressHTML;
    }
    
    function updateDownloadProgress(current, total, filename) {
        const percent = Math.round((current / total) * 100);
        const progressText = document.getElementById('dl-progress-text');
        const progressPercent = document.getElementById('dl-progress-percent');
        const progressBar = document.getElementById('dl-progress-bar');
        
        if (progressText && progressPercent && progressBar) {
            progressText.textContent = `Decrypting: ${filename}`;
            progressPercent.textContent = `${percent}%`;
            progressBar.style.width = `${percent}%`;
        }
    }
    
    // File preview function
    async function createFilePreview(filename, blob, url) {
        const ext = filename.split('.').pop().toLowerCase();
        const previewDiv = document.createElement('div');
        previewDiv.className = 'file-preview';
        previewDiv.style.cssText = 'margin-top: 10px; max-width: 300px; border-radius: 8px; overflow: hidden;';
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            // Image preview
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = 'max-width: 100%; max-height: 200px; display: block;';
            img.onload = () => {
                // Don't revoke URL here, keep it for download
            };
            previewDiv.appendChild(img);
        } else if (['txt', 'json', 'js', 'py', 'html', 'css', 'md', 'xml', 'csv'].includes(ext)) {
            // Text preview (first 1000 characters)
            try {
                const text = await blob.text();
                const pre = document.createElement('pre');
                pre.style.cssText = 'background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 12px; max-height: 200px; overflow: auto; margin: 0; font-family: monospace; white-space: pre-wrap; word-wrap: break-word;';
                pre.textContent = text.slice(0, 1000) + (text.length > 1000 ? '...' : '');
                previewDiv.appendChild(pre);
            } catch (error) {
                console.error('Could not read file for preview:', error);
            }
        } else if (['pdf'].includes(ext)) {
            // PDF preview (link)
            const pdfPreview = document.createElement('div');
            pdfPreview.style.cssText = 'background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;';
            pdfPreview.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">📕</div>
                <div style="font-size: 14px; color: #666;">PDF Document</div>
                <div style="font-size: 12px; color: #999;">${formatBytes(blob.size)}</div>
            `;
            previewDiv.appendChild(pdfPreview);
        } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
            // Audio preview
            const audioPreview = document.createElement('div');
            audioPreview.style.cssText = 'background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;';
            audioPreview.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">🎵</div>
                <div style="font-size: 14px; color: #666;">Audio File</div>
                <div style="font-size: 12px; color: #999;">${formatBytes(blob.size)}</div>
            `;
            previewDiv.appendChild(audioPreview);
        }
        
        return previewDiv;
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
            
            // Show download progress
            showDownloadProgress();
            
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
            
            // Show file statistics
            showFileStats(result.download_count || 0, result.created_at || Date.now()/1000);
            
            let decryptionKey;
            
            if (hasPassword) {
                // For password-protected files, derive key from password
                // Get salt from the first file's payload
                const firstPayloadBase64 = result.data[0];
                const firstPayload = atob(firstPayloadBase64);
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
            
            // Clear file list and remove progress bar
            fileList.innerHTML = '';
            let successCount = 0;
            
            // Decrypt each file
            for (let i = 0; i < result.data.length; i++) {
                try {
                    // Update progress
                    updateDownloadProgress(i + 1, result.data.length, result.filenames[i] || `file-${i + 1}`);
                    
                    // Data from server is base64 encoded
                    const payloadBase64 = result.data[i];
                    const payload = atob(payloadBase64);
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
                        <span class="file-icon">${getFileIcon(filename)}</span>
                        <div class="file-info">
                            <div class="file-name">
                                <a href="${url}" download="${filename}">${filename}</a>
                                <button class="preview-btn">Preview</button>
                            </div>
                            <div class="file-size">${formatBytes(decryptedData.byteLength)}</div>
                        </div>
                    `;
                    
                    // Add preview functionality
                    const previewBtn = fileItem.querySelector('.preview-btn');
                    previewBtn.addEventListener('click', async () => {
                        const existingPreview = fileItem.querySelector('.file-preview');
                        if (existingPreview) {
                            existingPreview.remove();
                            previewBtn.textContent = 'Preview';
                        } else {
                            previewBtn.textContent = 'Hide Preview';
                            const preview = await createFilePreview(filename, blob, url);
                            fileItem.appendChild(preview);
                        }
                    });
                    
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