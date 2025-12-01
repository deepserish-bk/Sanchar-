const translations = {
  en: {
    drop_here: "Drop files here or click to upload",
    drag_over: "Yes! Release to drop",
    one_file_ready: "1 file ready to send ({size})",
    files_ready: "{n} files ready to send ({size})"
  },
  it: {
    drop_here: "Rilascia i file qui o clicca per caricare",
    drag_over: "Perfetto! Rilascia ora",
    one_file_ready: "1 file pronto per l'invio ({size})",
    files_ready: "{n} file pronti per l'invio ({size})"
  },
  ne: {
    drop_here: "यहाँ फाइलहरू छोड्नुहोस् वा अपलोड गर्न क्लिक गर्नुहोस्",
    drag_over: "छोड्नुहोस्!",
    one_file_ready: "१ फाइल पठाउन तयार ({size})",
    files_ready: "{n} फाइलहरू पठाउन तयार ({size})"
  }
};

let currentLang = document.documentElement.lang || 'en';
let files = [];

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const summary = document.getElementById('summary');
const dropText = document.querySelector('.drop-text');

// Load translations
fetch('/static/i18n/translations.json')
  .then(r => r.json())
  .then(data => {
    Object.assign(translations, data);
    updateTexts();
  });

// Human readable file size
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateTexts() {
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key');
    if (translations[currentLang][key]) {
      el.textContent = translations[currentLang][key];
    }
  });
}

function updateSummary() {
  if (files.length === 0) {
    summary.textContent = '';
    return;
  }
  const total = files.reduce((a, f) => a + f.size, 0);
  const text = files.length === 1 
    ? translations[currentLang].one_file_ready
    : translations[currentLang].files_ready.replace('{n}', files.length);
  summary.textContent = text.replace('{size}', formatBytes(total));
}

function addFileToList(file) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.innerHTML = `
    <span class="file-icon">✓</span>
    <div class="file-info">
      <div class="file-name">${file.name}</div>
      <div class="file-size">${formatBytes(file.size)}</div>
    </div>
  `;
  fileList.appendChild(div);
}

// Drag & Drop Events
['dragenter', 'dragover'].forEach(event => {
  dropZone.addEventListener(event, e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
    dropText.textContent = translations[currentLang].drag_over;
  });
});

['dragleave', 'drop'].forEach(event => {
  dropZone.addEventListener(event, e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    dropText.textContent = translations[currentLang].drop_here;
  });
});

dropZone.addEventListener('drop', e => {
  const newFiles = Array.from(e.dataTransfer.files);
  files.push(...newFiles);
  newFiles.forEach(addFileToList);
  updateSummary();
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const newFiles = Array.from(fileInput.files);
  files.push(...newFiles);
  newFiles.forEach(addFileToList);
  updateSummary();
  fileInput.value = '';
});
