// DOM Elements
const serviceUrlInput = document.getElementById('serviceUrl');
const cacheExpiryInput = document.getElementById('cacheExpiry');
const maxRetriesInput = document.getElementById('maxRetries');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');

// Constants
const DEFAULTS = {
  IDENTITY_SERVICE_URL: 'http://localhost:3001',
  CACHE_EXPIRY: '3600',
  MAX_RETRIES: '3',
};

// Load settings on page load
function loadSettings() {
  chrome.storage.sync.get(
    ['IDENTITY_SERVICE_URL', 'CACHE_EXPIRY', 'MAX_RETRIES'],
    (result) => {
      serviceUrlInput.value = result.IDENTITY_SERVICE_URL || DEFAULTS.IDENTITY_SERVICE_URL;
      cacheExpiryInput.value = result.CACHE_EXPIRY || DEFAULTS.CACHE_EXPIRY;
      maxRetriesInput.value = result.MAX_RETRIES || DEFAULTS.MAX_RETRIES;
    }
  );
}

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status show ${type}`;
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.classList.remove('show');
    }, 3000);
  }
}

// Validate URL
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Validate number
function isValidNumber(value) {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0;
}

// Save settings
saveBtn.addEventListener('click', () => {
  const serviceUrl = serviceUrlInput.value.trim();
  const cacheExpiry = cacheExpiryInput.value.trim();
  const maxRetries = maxRetriesInput.value.trim();

  if (!serviceUrl) {
    showStatus('❌ Service URL is required', 'error');
    return;
  }

  if (!isValidUrl(serviceUrl)) {
    showStatus('❌ Service URL must start with http:// or https://', 'error');
    return;
  }

  if (!isValidNumber(cacheExpiry)) {
    showStatus('❌ Cache TTL must be a positive number', 'error');
    return;
  }

  if (!isValidNumber(maxRetries)) {
    showStatus('❌ Max retries must be a positive number', 'error');
    return;
  }

  chrome.storage.sync.set(
    {
      IDENTITY_SERVICE_URL: serviceUrl,
      CACHE_EXPIRY: cacheExpiry,
      MAX_RETRIES: maxRetries,
    },
    () => {
      showStatus('✅ Settings saved successfully!', 'success');
    }
  );
});

// Reset to defaults
resetBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    chrome.storage.sync.clear(() => {
      serviceUrlInput.value = DEFAULTS.IDENTITY_SERVICE_URL;
      cacheExpiryInput.value = DEFAULTS.CACHE_EXPIRY;
      maxRetriesInput.value = DEFAULTS.MAX_RETRIES;
      showStatus('✅ Settings reset to defaults', 'info');
    });
  }
});

[serviceUrlInput, cacheExpiryInput, maxRetriesInput].forEach((input) => {
  input.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      saveBtn.click();
    }
  });
});

loadSettings();
