document.addEventListener('DOMContentLoaded', function() {
    // Get data from HTML
    const shareId = document.body.dataset.shareId;
    const hasPassword = document.body.dataset.hasPassword === 'true';
    
    const keyInput = document.getElementById('key-input');
    const passwordInput = document.getElementById('password-input');
    const decryptBtn = document.getElementById('decrypt-btn');
    const fileList = document.getElementById('file-list');
    
    // File type icon - returns emoji based on extension
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'pdf': '📕',
            'doc': '📄', 'docx': '📄',
            'xls': '📊', 'xlsx': '📊',
            'ppt': '📽️', 'pptx': '📽️',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️',
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
    
    // Key functions
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
            throw new Error('Invalid key format');
        }
    }
    
    // Format file size
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Show download stats
    function showFileStats(downloadCount, createdTime) {
        const statsDiv = document.getElementById('file-stats');
        const countSpan = document.getElementById('download-count');
        const timeSpan = document.getElementById('created-time');
        
        if (statsDiv && countSpan && timeSpan) {
            countSpan.textContent = downloadCount;
            
            // Format time
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
    
    // Show progress bar - black and white
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
    
   // Updated createFilePreview function
async function createFilePreview(filename, blob, url) {
    const ext = filename.split('.').pop().toLowerCase();
    const previewDiv = document.createElement('div');
    previewDiv.className = 'file-preview';
    
    // Add some styling
    previewDiv.style.cssText = 'margin-top: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9;';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        // Image preview - use the object URL
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'max-width: 100%; max-height: 200px; display: block; margin: 0 auto;';
        img.alt = filename;
        
        // Add loading indicator
        img.onload = () => {
            previewDiv.querySelector('.loading')?.remove();
        };
        
        // Show loading text
        const loadingText = document.createElement('div');
        loadingText.className = 'loading';
        loadingText.textContent = 'Loading image...';
        loadingText.style.cssText = 'text-align: center; color: #666; margin-bottom: 10px;';
        previewDiv.appendChild(loadingText);
        
        previewDiv.appendChild(img);
        
    } else if (['txt', 'json', 'js', 'py', 'html', 'css', 'md', 'xml', 'csv', 'log', 'yaml', 'yml'].includes(ext)) {
        // Text preview
        try {
            const text = await blob.text();
            const pre = document.createElement('pre');
            pre.style.cssText = 'background: #fff; padding: 10px; border-radius: 5px; font-size: 12px; max-height: 200px; overflow: auto; margin: 0; font-family: "Monaco", "Courier New", monospace; white-space: pre-wrap; word-wrap: break-word; color: #333; line-height: 1.4;';
            
            // Add line numbers for code files
            if (['js', 'py', 'html', 'css', 'java', 'cpp', 'c', 'php', 'rb'].includes(ext)) {
                const lines = text.split('\n');
                const numberedText = lines.map((line, i) => 
                    `<span style="color: #999; margin-right: 10px; user-select: none;">${i + 1}</span>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`
                ).join('\n');
                pre.innerHTML = numberedText;
            } else {
                pre.textContent = text.slice(0, 5000) + (text.length > 5000 ? '\n\n... (truncated)' : '');
            }
            
            previewDiv.appendChild(pre);
        } catch (error) {
            const errorMsg = document.createElement('div');
            errorMsg.textContent = 'Could not preview file: ' + error.message;
            errorMsg.style.cssText = 'color: #666; text-align: center; padding: 20px;';
            previewDiv.appendChild(errorMsg);
        }
        
    } else if (['pdf'].includes(ext)) {
        // PDF preview with PDF.js option
        const pdfPreview = document.createElement('div');
        pdfPreview.style.cssText = 'text-align: center;';
        pdfPreview.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px; color: #777;">📕</div>
            <div style="font-size: 14px; color: #555; margin-bottom: 5px;">PDF Document</div>
            <div style="font-size: 12px; color: #888; margin-bottom: 15px;">${formatBytes(blob.size)}</div>
            <a href="${url}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #333; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">Open in New Tab</a>
        `;
        previewDiv.appendChild(pdfPreview);
        
    } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
        // Audio preview
        const audioPreview = document.createElement('div');
        audioPreview.style.cssText = 'text-align: center;';
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = url;
        audio.style.cssText = 'width: 100%; margin: 10px 0;';
        
        audioPreview.appendChild(audio);
        previewDiv.appendChild(audioPreview);
        
    } else if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'ogg', 'wmv'].includes(ext)) {
        // Video preview
        const videoPreview = document.createElement('div');
        videoPreview.style.cssText = 'text-align: center;';
        const video = document.createElement('video');
        video.controls = true;
        video.src = url;
        video.style.cssText = 'max-width: 100%; max-height: 200px; display: block; margin: 0 auto;';
        
        videoPreview.appendChild(video);
        previewDiv.appendChild(videoPreview);
        
    } else if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
        // Archive preview
        const archivePreview = document.createElement('div');
        archivePreview.style.cssText = 'text-align: center;';
        archivePreview.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px; color: #777;">🗜️</div>
            <div style="font-size: 14px; color: #555; margin-bottom: 5px;">Compressed Archive</div>
            <div style="font-size: 12px; color: #888; margin-bottom: 15px;">${formatBytes(blob.size)}</div>
            <div style="font-size: 12px; color: #999;">Contains one or more files</div>
        `;
        previewDiv.appendChild(archivePreview);
        
    } else {
        // Generic file preview
        const genericPreview = document.createElement('div');
        genericPreview.style.cssText = 'text-align: center;';
        genericPreview.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px; color: #777;">${getFileIcon(filename)}</div>
            <div style="font-size: 14px; color: #555; margin-bottom: 5px;">${ext.toUpperCase()} File</div>
            <div style="font-size: 12px; color: #888; margin-bottom: 15px;">${formatBytes(blob.size)}</div>
            <div style="font-size: 12px; color: #999;">Preview not available for this file type</div>
        `;
        previewDiv.appendChild(genericPreview);
    }
    
    return previewDiv;
}

// Also update the preview button event listener to handle multiple previews better
const previewBtn = fileItem.querySelector('.preview-btn');
previewBtn.addEventListener('click', async () => {
    const existingPreview = fileItem.querySelector('.file-preview');
    if (existingPreview) {
        existingPreview.remove();
        previewBtn.textContent = 'Preview';
    } else {
        previewBtn.textContent = 'Hide Preview';
        
        // Disable button while loading
        previewBtn.disabled = true;
        previewBtn.textContent = 'Loading...';
        
        try {
            const preview = await createFilePreview(filename, blob, url);
            fileItem.appendChild(preview);
            previewBtn.textContent = 'Hide Preview';
        } catch (error) {
            console.error('Preview failed:', error);
            const errorMsg = document.createElement('div');
            errorMsg.className = 'file-preview';
            errorMsg.style.cssText = 'margin-top: 10px; padding: 10px; border: 1px solid #fecaca; border-radius: 5px; background: #fef2f2; color: #b91c1c;';
            errorMsg.textContent = 'Failed to generate preview: ' + error.message;
            fileItem.appendChild(errorMsg);
            previewBtn.textContent = 'Preview';
        } finally {
            previewBtn.disabled = false;
        }
    }
});
    
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
            
            // Show progress
            showDownloadProgress();
            
            // Fetch data from server
            const response = await fetch(`/data/${shareId}`);
            const result = await response.json();
            
            if (!response.ok || result.error) {
                throw new Error(result.error || 'Failed to fetch files');
            }
            
            if (!result.data || result.data.length === 0) {
                throw new Error('No files found');
            }
            
            // Show stats
            showFileStats(result.download_count || 0, result.created_at || Date.now()/1000);
            
            let decryptionKey;
            
            if (hasPassword) {
                // Password-protected files
                const firstPayloadBase64 = result.data[0];
                const firstPayload = atob(firstPayloadBase64);
                const parts = firstPayload.split(':');
                
                if (parts.length < 3) {
                    throw new Error('Invalid file format');
                }
                
                const saltB64 = parts[2];
                const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
                
                decryptionKey = await deriveKeyFromPassword(password, salt);
            } else {
                // Key-based files
                decryptionKey = await importRawKey(keyB64);
            }
            
            // Clear and start decrypting
            fileList.innerHTML = '';
            let successCount = 0;
            
            for (let i = 0; i < result.data.length; i++) {
                try {
                    // Update progress
                    updateDownloadProgress(i + 1, result.data.length, result.filenames[i] || `file-${i + 1}`);
                    
                    // Decode and parse data
                    const payloadBase64 = result.data[i];
                    const payload = atob(payloadBase64);
                    const parts = payload.split(':');
                    
                    if (parts.length < 2) {
                        continue;
                    }
                    
                    const encryptedB64 = parts[0];
                    const ivB64 = parts[1];
                    
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
                    
                    // Create file item - black and white
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
                    
                    // Preview button
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
                    
                    // Error item - red for errors only
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
            
            // Show summary - black and white
            if (successCount > 0) {
                const summary = document.createElement('div');
                summary.style.cssText = 'margin-top: 20px; padding: 15px; background: #fafafa; border-radius: 10px; text-align: center; border: 1px solid #eee;';
                summary.innerHTML = `
                    <p style="color: #111; margin-bottom: 10px;">
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
                        <div style="color: #b91c1c; margin-bottom: 10px; font-size: 18px;">❌ Decryption Failed</div>
                        <p style="color: #666;">Could not decrypt any files.</p>
                        <p style="font-size: 14px; color: #888;">Please check your ${hasPassword ? 'password' : 'decryption key'} and try again.</p>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Decryption error:', error);
            fileList.innerHTML = `
                <div style="text-align: center; padding: 30px; background: #fef2f2; border-radius: 10px; border: 1px solid #fecaca;">
                    <div style="color: #b91c1c; margin-bottom: 10px; font-size: 18px;">❌ Error</div>
                    <p style="color: #666;">${error.message}</p>
                    <p style="font-size: 14px; color: #888;">If this persists, the link may be expired or invalid.</p>
                </div>
            `;
        } finally {
            decryptBtn.disabled = false;
            decryptBtn.textContent = 'Decrypt & Download';
        }
    }
    
    // Event listeners
    if (decryptBtn) {
        decryptBtn.addEventListener('click', decryptFiles);
    }
    
    // Enter key triggers decryption
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
    
    console.log("download.js loaded");
});