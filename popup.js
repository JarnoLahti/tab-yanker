// Popup Script for Tab Yanker Extension
// Handles the popup UI and interaction with the service worker

const FALLBACK_FAVICON = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjRjNGM0YzIi8+CjxwYXRoIGQ9Ik04IDJMOC4zNTM1NSAyLjM1MzU1TDEzIDdIMTBWMTBIMTNMMTMuMzUzNiAxMC4zNTM2TDggMTVMMi42NDY0NSAxMC4zNTM2TDMgMTBINlY3SDNMNS42NDY0NSAyLjM1MzU1TDggMloiIGZpbGw9IiNDQ0NDQ0MiLz4KPC9zdmc+';

document.addEventListener('DOMContentLoaded', async () => {
  await loadDetachedTabs();
  await updateYankButtonState();
  
  // Set up event listeners
  document.getElementById('unyank-all').addEventListener('click', unyankAllTabs);
  document.getElementById('yank-this-tab').addEventListener('click', handleYankThisTab);
  document.getElementById('tabs').addEventListener('click', handleTabActions);
});

async function updateYankButtonState() {
  const button = document.getElementById('yank-this-tab');

  try {
    const eligibility = await chrome.runtime.sendMessage({ action: 'getYankEligibility' });
    if (!eligibility?.allowed) {
      button.disabled = true;
      button.title = eligibility?.reason || 'This tab cannot be yanked right now.';
    } else {
      button.disabled = false;
      button.title = '';
    }
  } catch (error) {
    console.error('Error checking yank eligibility:', error);
  }
}

async function handleYankThisTab(){
  const button = document.getElementById('yank-this-tab');
  if (button.disabled) {
    return;
  }

  const originalText = button.textContent;
  button.textContent = 'Yanking...';
  button.disabled = true;

  try {
    const success = await chrome.runtime.sendMessage({ action: 'yankActiveTab' });

    if (success) {
      window.close();
      return;
    }
  } catch (error) {
    console.error('Error yanking current tab:', error);
  }

  button.textContent = originalText;
  button.disabled = false;
}

// Load and display all detached tabs
async function loadDetachedTabs() {
  const loading = document.getElementById('loading');
  const noTabs = document.getElementById('no-tabs');
  const tabsList = document.getElementById('tabs-list');
  const tabsContainer = document.getElementById('tabs');
  
  try {
    // Get detached tabs from service worker
    const detachedTabs = await getDetachedTabs();
    
    // Hide loading
    loading.style.display = 'none';
    
    if (detachedTabs.length === 0) {
      // Show empty state
      noTabs.style.display = 'block';
      tabsList.style.display = 'none';
    } else {
      // Show tabs
      noTabs.style.display = 'none';
      tabsList.style.display = 'block';
      
      // Render tabs
      tabsContainer.innerHTML = '';
      detachedTabs.forEach(tab => {
        tabsContainer.appendChild(createTabElement(tab));
      });
    }
    
  } catch (error) {
    console.error('Error loading detached tabs:', error);
    loading.innerHTML = '<div class="error">Failed to load tabs</div>';
  }
}

// Get detached tabs from service worker
async function getDetachedTabs() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getDetachedTabs' }, (response) => {
      resolve(response || []);
    });
  });
}

// Create HTML element for a single tab
function createTabElement(tabData) {
  const tabElement = document.createElement('div');
  tabElement.className = 'tab-item';
  tabElement.setAttribute('data-tab-id', tabData.tabId);
  
  const detachedTime = formatTimeAgo(tabData.detachedAt);
  
  tabElement.innerHTML = `
    <img class="tab-favicon" src="chrome://favicon/${tabData.currentUrl || tabData.tabUrl}">
    <div class="tab-info">
      <div class="tab-title" title="${escapeHtml(tabData.currentTitle || tabData.tabTitle || 'Unknown')}">
        ${escapeHtml(truncateText(tabData.currentTitle || tabData.tabTitle || 'Unknown', 35))}
      </div>
      <div class="tab-url" title="${escapeHtml(tabData.currentUrl || tabData.tabUrl)}">
        ${escapeHtml(truncateText(tabData.currentUrl || tabData.tabUrl, 40))}
      </div>
      <div class="tab-meta">Detached ${detachedTime}</div>
    </div>
    <div class="tab-actions">
      <button class="btn btn-primary btn-small" data-action="unyank-single" data-tab-id="${tabData.tabId}">
        Un-yank
      </button>
    </div>
  `;

  const favicon = tabElement.querySelector('.tab-favicon');
  favicon.addEventListener('error', () => {
    favicon.src = FALLBACK_FAVICON;
  }, { once: true });
  
  return tabElement;
}

function handleTabActions(event) {
  const button = event.target.closest('[data-action="unyank-single"]');
  if (!button) {
    return;
  }

  const tabId = Number(button.dataset.tabId);
  if (!Number.isInteger(tabId)) {
    console.error('Invalid tab ID for un-yank action:', button.dataset.tabId);
    return;
  }

  unyankSingleTab(tabId);
}

// Un-yank a single tab
async function unyankSingleTab(tabId) {
  try {
    const button = document.querySelector(`[data-tab-id="${tabId}"] .btn-primary`);
    const originalText = button.textContent;
    button.textContent = 'Un-yanking...';
    button.disabled = true;
    
    const success = await chrome.runtime.sendMessage({ 
      action: 'unyankTab', 
      tabId: tabId 
    });
    
    if (success) {
      // Remove the tab from UI
      const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
      if (tabElement) {
        tabElement.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
          tabElement.remove();
          checkIfEmpty();
        }, 300);
      }
    } else {
      // Restore button state if failed
      button.textContent = originalText;
      button.disabled = false;
    }
    
  } catch (error) {
    console.error('Error un-yanking tab:', error);
  }
}

// Un-yank all tabs
async function unyankAllTabs() {
  const button = document.getElementById('unyank-all');
  const originalText = button.textContent;
  button.textContent = 'Un-yanking...';
  button.disabled = true;
  
  try {
    const detachedTabs = await getDetachedTabs();
    
    // Un-yank each tab
    const promises = detachedTabs.map(tab => 
      chrome.runtime.sendMessage({ 
        action: 'unyankTab', 
        tabId: tab.tabId 
      })
    );
    
    await Promise.all(promises);
    
    // Reload the tabs view
    await loadDetachedTabs();
    
  } catch (error) {
    console.error('Error un-yanking all tabs:', error);
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Check if tabs container is empty and update UI
function checkIfEmpty() {
  const tabsContainer = document.getElementById('tabs');
  const noTabs = document.getElementById('no-tabs');
  const tabsList = document.getElementById('tabs-list');
  
  if (tabsContainer.children.length === 0) {
    noTabs.style.display = 'block';
    tabsList.style.display = 'none';
  }
}

// Utility: Format time ago
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Utility: Truncate text
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Add fadeOut animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(-20px); }
  }
`;
document.head.appendChild(style);
