// Window Selector Script for Tab Yanker Extension

let currentTabId = null;
let currentWindowId = null;
let candidateWindows = [];
let selectedWindowIndex = -1;
let isSelectingWindow = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Get tab ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  currentTabId = parseInt(urlParams.get('tabId'));
  currentWindowId = parseInt(urlParams.get('currentWindowId'));

  document.getElementById('cancel-selection').addEventListener('click', () => {
    window.close();
  });
  document.addEventListener('keydown', handleKeyboardSelection);
  
  if (!currentTabId) {
    console.error('No tab ID provided');
    window.close();
    return;
  }
  
  await loadAvailableWindows();
});

async function loadAvailableWindows() {
  const loading = document.getElementById('loading');
  const windowSelection = document.getElementById('window-selection');
  const windowsList = document.getElementById('windows-list');
  
  try {
    // Get all available windows
    const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
    candidateWindows = windows.filter(window => window.id !== currentWindowId);
    
    if (candidateWindows.length === 0) {
      loading.innerHTML = 'No alternative windows found.';
      return;
    }
    
    // Hide loading and show window selection
    loading.style.display = 'none';
    windowSelection.style.display = 'block';
    
    // Create window items
    windowsList.innerHTML = '';
    candidateWindows.forEach((window, index) => {
      const windowElement = createWindowElement(window, index);
      windowsList.appendChild(windowElement);
    });

    setSelectedWindowIndex(0);
    
  } catch (error) {
    console.error('Error loading windows:', error);
    loading.innerHTML = 'Failed to load available windows.';
  }
}

function createWindowElement(window, index) {
  const windowDiv = document.createElement('div');
  windowDiv.className = 'window-item';
  windowDiv.tabIndex = -1;
  windowDiv.addEventListener('click', () => selectWindow(window.id));
  
  // Get window info
  const tabCount = window.tabs ? window.tabs.length : 0;
  const activeTab = window.tabs ? window.tabs.find(tab => tab.active) : null;
  const windowTitle = activeTab ? activeTab.title : 'Untitled Window';
  const shortcutLabel = index < 9 ? `${index + 1}. ` : '';
  
  windowDiv.innerHTML = `
    <div class="window-info">
      <div class="window-title">${escapeHtml(shortcutLabel + truncateText(windowTitle, 40))}</div>
      <div class="window-details">Window ${window.id} • ${tabCount} tab${tabCount !== 1 ? 's' : ''}</div>
    </div>
  `;
  
  return windowDiv;
}

function handleKeyboardSelection(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    window.close();
    return;
  }

  if (candidateWindows.length === 0 || isSelectingWindow) {
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setSelectedWindowIndex((selectedWindowIndex + 1) % candidateWindows.length);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    setSelectedWindowIndex((selectedWindowIndex - 1 + candidateWindows.length) % candidateWindows.length);
    return;
  }

  if (event.key === 'Enter' && selectedWindowIndex >= 0) {
    event.preventDefault();
    selectWindow(candidateWindows[selectedWindowIndex].id);
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    const quickSelectIndex = Number(event.key) - 1;
    if (quickSelectIndex < candidateWindows.length) {
      event.preventDefault();
      selectWindow(candidateWindows[quickSelectIndex].id);
    }
  }
}

function setSelectedWindowIndex(index) {
  selectedWindowIndex = index;

  document.querySelectorAll('.window-item').forEach((windowElement, itemIndex) => {
    const isSelected = itemIndex === selectedWindowIndex;
    windowElement.classList.toggle('is-selected', isSelected);

    if (isSelected) {
      windowElement.focus();
      windowElement.scrollIntoView({ block: 'nearest' });
    }
  });
}

async function selectWindow(windowId) {
  if (isSelectingWindow) {
    return;
  }

  isSelectingWindow = true;

  try {
    // Send message to background script to perform the un-yank
    const success = await chrome.runtime.sendMessage({
      action: 'unyankTabToWindow',
      tabId: currentTabId,
      targetWindowId: windowId
    });
    
    if (success) {
      // Close this window
      window.close();
    } else {
      alert('Failed to un-yank tab. Please try again.');
    }
    
  } catch (error) {
    console.error('Error selecting window:', error);
    alert('An error occurred while un-yanking the tab.');
  } finally {
    isSelectingWindow = false;
  }
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text || 'Untitled';
  return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}