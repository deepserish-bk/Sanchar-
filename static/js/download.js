document.addEventListener('DOMContentLoaded', function() {
    // Get data from HTML
    const shareId = document.body.dataset.shareId;
    const hasPassword = document.body.dataset.hasPassword === 'true';
    
    const keyInput = document.getElementById('key-input');
    const passwordInput = document.getElementById('password-input');
    const decryptBtn = document.getElementById('decrypt-btn');
    const fileList = document.getElementById('file-list');
    
    // Quick Look state
    let quickLookModal = null;
    let currentFileIndex = 0;
    let currentFiles = [];
    
    // File type icon - returns emoji based on extension
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'pdf': '📕',
            'doc': '📄', 'docx': '📄',
            'xls': '📊', 'xlsx': '📊',
            'ppt': '📽️', 'pptx': '📽️',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
            'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵', 'flac': '🎵',
            'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬', 'webm': '🎬',
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
    
    // Show progress bar
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
    
    // Create Quick Look modal
    function createQuickLookModal() {
        if (quickLookModal) return;
        
        quickLookModal = document.createElement('div');
        quickLookModal.id = 'quicklook-modal';
        quickLookModal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;
        
        quickLookModal.innerHTML = `
            <div style="position: absolute; top: 20px; right: 20px;">
                <button id="ql-close" style="
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 10px 15px;
                    border-radius: 50%;
                    width: 45px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">✕</button>
            </div>
            
            <div id="ql-content" style="
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 40px;
                box-sizing: border-box;
            ">
                <div style="
                    max-width: 100%;
                    max-height: 100%;
                    text-align: center;
                    position: relative;
                ">
                    <!-- Content will be inserted here -->
                </div>
            </div>
            
            <div id="ql-file-info" style="
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                text-align: center;
                padding: 20px;
                background: linear-gradient(transparent, rgba(0,0,0,0.8));
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                color: white;
            ">
                <div id="ql-filename" style="
                    font-weight: 500;
                    font-size: 16px;
                    margin-bottom: 5px;
                "></div>
                <div id="ql-filesize" style="
                    font-size: 14px;
                    opacity: 0.8;
                    margin-bottom: 15px;
                "></div>
                <div id="ql-nav" style="
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                    align-items: center;
                ">
                    <button id="ql-prev" style="
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background 0.2s;
                    ">← Previous</button>
                    <span id="ql-counter" style="
                        font-size: 14px;
                        opacity: 0.8;
                        min-width: 60px;
                    "></span>
                    <button id="ql-next" style="
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background 0.2s;
                    ">Next →</button>
                </div>
            </div>
            
            <div id="ql-error" style="
                color: white;
                text-align: center;
                padding: 40px;
                display: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">
                <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                <div style="font-size: 18px; margin-bottom: 10px;">Preview not available</div>
                <div style="opacity: 0.8; font-size: 14px;">This file type cannot be previewed</div>
            </div>
        `;
        
        document.body.appendChild(quickLookModal);
        
        // Event listeners for modal
        document.getElementById('ql-close').addEventListener('click', closeQuickLook);
        document.getElementById('ql-prev').addEventListener('click', showPrevFile);
        document.getElementById('ql-next').addEventListener('click', showNextFile);
        
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && quickLookModal.style.display === 'flex') {
                closeQuickLook();
            } else if (e.key === 'ArrowLeft' && quickLookModal.style.display === 'flex') {
                showPrevFile();
            } else if (e.key === 'ArrowRight' && quickLookModal.style.display === 'flex') {
                showNextFile();
            } else if (e.key === ' ' && quickLookModal.style.display === 'flex') {
                e.preventDefault(); // Prevent space from scrolling
            }
        });
        
        // Close on background click
        quickLookModal.addEventListener('click', (e) => {
            if (e.target === quickLookModal) {
                closeQuickLook();
            }
        });
    }
    
    // Show Quick Look modal
    function showQuickLook(index, files) {
        currentFileIndex = index;
        currentFiles = files;
        createQuickLookModal();
        
        const modal = document.getElementById('quicklook-modal');
        const errorDiv = document.getElementById('ql-error');
        const contentDiv = modal.querySelector('#ql-content > div');
        const filenameDiv = document.getElementById('ql-filename');
        const filesizeDiv = document.getElementById('ql-filesize');
        const counterDiv = document.getElementById('ql-counter');
        
        // Reset
        errorDiv.style.display = 'none';
        contentDiv.innerHTML = '';
        
        const file = files[index];
        filenameDiv.textContent = file.filename;
        filesizeDiv.textContent = formatBytes(file.blob.size);
        counterDiv.textContent = `${index + 1} of ${files.length}`;
        
        // Update nav buttons
        document.getElementById('ql-prev').style.display = index > 0 ? 'block' : 'none';
        document.getElementById('ql-next').style.display = index < files.length - 1 ? 'block' : 'none';
        
        // Show loading
        contentDiv.innerHTML = `
            <div style="color: white; font-size: 16px; opacity: 0.8;">
                Loading preview...
            </div>
        `;
        
        modal.style.display = 'flex';
        
        // Load preview
        loadFilePreview(file, contentDiv, errorDiv);
    }
    
    // Load file preview
    async function loadFilePreview(file, container, errorDiv) {
        const ext = file.filename.split('.').pop().toLowerCase();
        
        try {
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
                // Image preview
                const img = document.createElement('img');
                img.src = file.url;
                img.style.cssText = `
                    max-width: 90vw;
                    max-height: 70vh;
                    object-fit: contain;
                    border-radius: 4px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                `;
                img.onload = () => {
                    container.innerHTML = '';
                    container.appendChild(img);
                };
                img.onerror = () => showErrorPreview(container, errorDiv);
                
            } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
                // Audio preview
                const audioContainer = document.createElement('div');
                audioContainer.style.cssText = `
                    background: rgba(255,255,255,0.05);
                    padding: 40px;
                    border-radius: 12px;
                    max-width: 600px;
                `;
                
                const audioIcon = document.createElement('div');
                audioIcon.textContent = '🎵';
                audioIcon.style.cssText = 'font-size: 48px; margin-bottom: 20px;';
                
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.src = file.url;
                audio.style.cssText = 'width: 100%; margin: 20px 0;';
                
                const fileName = document.createElement('div');
                fileName.textContent = file.filename;
                fileName.style.cssText = 'font-size: 14px; opacity: 0.8; margin-top: 10px;';
                
                audioContainer.appendChild(audioIcon);
                audioContainer.appendChild(audio);
                audioContainer.appendChild(fileName);
                
                container.innerHTML = '';
                container.appendChild(audioContainer);
                
            } else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
                // Video preview
                const video = document.createElement('video');
                video.controls = true;
                video.src = file.url;
                video.style.cssText = `
                    max-width: 90vw;
                    max-height: 70vh;
                    border-radius: 4px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                `;
                
                container.innerHTML = '';
                container.appendChild(video);
                
            } else if (['txt', 'json', 'js', 'py', 'html', 'css', 'md', 'xml', 'csv', 'log', 'yaml', 'yml'].includes(ext)) {
                // Text preview
                const text = await file.blob.text();
                const pre = document.createElement('pre');
                pre.style.cssText = `
                    max-width: 80vw;
                    max-height: 70vh;
                    overflow: auto;
                    text-align: left;
                    background: rgba(255,255,255,0.05);
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 14px;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                `;
                
                // Limit preview size
                if (text.length > 100000) {
                    pre.textContent = text.substring(0, 100000) + '\n\n... (file too large for preview)';
                } else {
                    pre.textContent = text;
                }
                
                container.innerHTML = '';
                container.appendChild(pre);
                
            } else if (['pdf'].includes(ext)) {
                // PDF preview
                const pdfContainer = document.createElement('div');
                pdfContainer.style.cssText = `
                    background: rgba(255,255,255,0.05);
                    padding: 40px;
                    border-radius: 12px;
                    max-width: 400px;
                `;
                
                pdfContainer.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 20px;">📕</div>
                    <div style="font-size: 16px; margin-bottom: 15px; opacity: 0.9;">PDF Document</div>
                    <div style="font-size: 14px; margin-bottom: 25px; opacity: 0.7;">${formatBytes(file.blob.size)}</div>
                    <a href="${file.url}" target="_blank" style="
                        display: inline-block;
                        padding: 12px 24px;
                        background: rgba(255,255,255,0.1);
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        border: 1px solid rgba(255,255,255,0.2);
                        font-size: 14px;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.2)';" 
                     onmouseout="this.style.background='rgba(255,255,255,0.1)';">
                        Open in New Tab
                    </a>
                `;
                
                container.innerHTML = '';
                container.appendChild(pdfContainer);
                
            } else {
                // Generic preview for other file types
                const genericContainer = document.createElement('div');
                genericContainer.style.cssText = `
                    background: rgba(255,255,255,0.05);
                    padding: 40px;
                    border-radius: 12px;
                    max-width: 300px;
                `;
                
                genericContainer.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 20px;">${getFileIcon(file.filename)}</div>
                    <div style="font-size: 16px; margin-bottom: 10px; opacity: 0.9;">${ext.toUpperCase()} File</div>
                    <div style="font-size: 14px; margin-bottom: 25px; opacity: 0.7;">${formatBytes(file.blob.size)}</div>
                    <a href="${file.url}" download="${file.filename}" style="
                        display: inline-block;
                        padding: 12px 24px;
                        background: rgba(59, 130, 246, 0.8);
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        font-size: 14px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='rgba(59, 130, 246, 1)';" 
                     onmouseout="this.style.background='rgba(59, 130, 246, 0.8)';">
                        Download File
                    </a>
                `;
                
                container.innerHTML = '';
                container.appendChild(genericContainer);
            }
        } catch (error) {
            console.error('Preview error:', error);
            showErrorPreview(container, errorDiv);
        }
    }
    
    function showErrorPreview(container, errorDiv) {
        container.innerHTML = '';
        errorDiv.style.display = 'block';
    }
    
    function showPrevFile() {
        if (currentFileIndex > 0) {
            showQuickLook(currentFileIndex - 1, currentFiles);
        }
    }
    
    function showNextFile() {
        if (currentFileIndex < currentFiles.length - 1) {
            showQuickLook(currentFileIndex + 1, currentFiles);
        }
    }
    
    function closeQuickLook() {
        if (quickLookModal) {
            quickLookModal.style.display = 'none';
        }
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
            const decryptedFiles = [];
            
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
                    
                    // Store for Quick Look
                    decryptedFiles.push({
                        filename,
                        blob,
                        url,
                        index: i
                    });
                    
                    // Create file item
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.innerHTML = `
                        <span class="file-icon">${getFileIcon(filename)}</span>
                        <div class="file-info">
                            <div class="file-name">
                                <a href="${url}" download="${filename}">${filename}</a>
                                <button class="preview-btn" data-index="${i}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    Preview
                                </button>
                            </div>
                            <div class="file-size">${formatBytes(decryptedData.byteLength)}</div>
                        </div>
                    `;
                    
                    // Preview button - Quick Look
                    const previewBtn = fileItem.querySelector('.preview-btn');
                    previewBtn.addEventListener('click', () => {
                        showQuickLook(i, decryptedFiles);
                    });
                    
                    // Also make the filename clickable for Quick Look
                    const filenameLink = fileItem.querySelector('.file-name a');
                    filenameLink.addEventListener('click', (e) => {
                        if (e.ctrlKey || e.metaKey) {
                            // Allow Ctrl/Cmd+click to download
                            return;
                        }
                        e.preventDefault();
                        showQuickLook(i, decryptedFiles);
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
                summary.style.cssText = 'margin-top: 20px; padding: 15px; background: #fafafa; border-radius: 10px; text-align: center; border: 1px solid #eee;';
                summary.innerHTML = `
                    <p style="color: #111; margin-bottom: 10px;">
                        ✅ Successfully decrypted ${successCount} file${successCount !== 1 ? 's' : ''}
                    </p>
                    <p style="font-size: 14px; color: #666;">
                        Click on file names to preview, or hold Ctrl/Cmd and click to download directly.
                    </p>
                    <p style="font-size: 12px; color: #888; margin-top: 10px;">
                        Press spacebar on a file to open Quick Look preview
                    </p>
                `;
                fileList.appendChild(summary);
                
                // Add keyboard navigation for Quick Look
                document.addEventListener('keydown', (e) => {
                    if (e.key === ' ') {
                        e.preventDefault();
                        const focusedElement = document.activeElement;
                        const fileItem = focusedElement.closest('.file-item');
                        if (fileItem && !fileItem.classList.contains('error')) {
                            const previewBtn = fileItem.querySelector('.preview-btn');
                            if (previewBtn) {
                                previewBtn.click();
                            }
                        }
                    }
                });
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
    
    console.log("download.js loaded with Quick Look preview");
});