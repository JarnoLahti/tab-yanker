// Service Worker for Tab Yanker Extension
// Handles tab detachment tracking plus yank and un-yank actions

import { DetachData } from "./types/types";

// Storage key pattern: tab_{tabId}
const STORAGE_PREFIX = 'tab_';


// Initialize extension
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

// Listen for tab detachment events
chrome.tabs.onDetached.addListener(async (tabId, detachInfo) => {
  console.log(`Tab ${tabId} detached from window ${detachInfo.oldWindowId}`);

  try {
    // Get tab details
    const tab = await chrome.tabs.get(tabId);

    // Store original window information
    const storageKey = STORAGE_PREFIX + tabId;
    const detachData: DetachData = {
      tabId: tabId,
      originalWindowId: detachInfo.oldWindowId,
      originalTabIndex: detachInfo.oldPosition,
      detachedAt: Date.now(),
      tabUrl: tab.url || '',
      tabTitle: tab.title || ''
    };

    await chrome.storage.session.set({ [storageKey]: detachData });
    console.log('Stored detach data:', detachData);

  } catch (error) {
    console.error('Error handling tab detachment:', error);
  }
});

// Listen for tab attachment events 
chrome.tabs.onAttached.addListener((tabId: number, attachInfo: chrome.tabs.OnAttachedInfo) => {
  console.log(`Tab ${tabId} attached to window ${attachInfo.newWindowId}`);
});

// Listen for tab removal (cleanup)
chrome.tabs.onRemoved.addListener(async (tabId: number) => {
  const storageKey = STORAGE_PREFIX + tabId;
  await chrome.storage.session.remove(storageKey);
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab || !activeTab.id) {
    console.log('No active tab found for command:', command);
    return;
  }

  switch (command) {
    case 'yank-active-tab':
      await yankTab(activeTab.id);
      break;

    case 'unyank-active-tab':
      await unyankTab(activeTab.id);
      break;
  }
});

// Check if a window exists
async function checkWindowExists(windowId: number) {
  try {
    await chrome.windows.get(windowId);
    return true;
  } catch (error) {
    return false;
  }
}

async function moveTabAndActivate(tabId: number, targetWindowId: number) {
  const movedTab = await chrome.tabs.move(tabId, {
    windowId: targetWindowId,
    index: -1  // -1 means end of the window
  });

  await chrome.tabs.update(movedTab.id, { active: true });
  await chrome.windows.update(targetWindowId, { focused: true });

  return movedTab;
}

async function moveTabToWindowIndexAndActivate(tabId: number, targetWindowId: number, targetIndex: number) {
  const movedTab = await chrome.tabs.move(tabId, {
    windowId: targetWindowId,
    index: targetIndex
  });

  await chrome.tabs.update(movedTab.id, { active: true });
  await chrome.windows.update(targetWindowId, { focused: true });

  return movedTab;
}

async function getOriginalWindowInsertIndex(windowId: number, originalTabIndex: number) {
  if (originalTabIndex < 0) {
    return -1;
  }

  const targetTabs = await chrome.tabs.query({ windowId });
  return targetTabs.length > originalTabIndex ? originalTabIndex : -1;
}

async function getYankEligibility(tabId: number) {
  const tab = await chrome.tabs.get(tabId);
  const windowTabs = await chrome.tabs.query({ windowId: tab.windowId });

  if (windowTabs.length <= 1) {
    return {
      allowed: false,
      reason: 'cannot yank the only tab in a window.'
    };
  }

  return {
    allowed: true,
    reason: ''
  };
}

async function yankTab(tabId: number): Promise<boolean> {

  const eligibility = await getYankEligibility(tabId);
  if (!eligibility.allowed) {
    showNotification(eligibility.reason, 'info');
    return false;
  }
  try {
    const res = await chrome.windows.create({ tabId });
    if (!res) {
      showNotification('Failed to create new window for tab.', 'error');
      return false;
    }
    if (!res.tabs || res.tabs.length === 0) {
      showNotification('Failed to retrieve tab information after creating new window.', 'error');
      return false;
    }
    const newTab = res.tabs[0];
    if (!newTab || newTab.id !== tabId) {
      showNotification('Unexpected error: Created window does not contain the expected tab.', 'error');
      return false;
    }
    return true;
  } catch (e) {
    if (e instanceof Error) {
      console.error('Error yanking tab:', e);
      showNotification('Failed to yank tab: ' + e.message, 'error');
    } else {
      console.error('Unknown error yanking tab:', e);
      showNotification('Failed to yank tab due to an unknown error.', 'error');
    }
    return false;
  }
  return false;
}

async function openWindowSelector(tabId: number, currentWindowId: number): Promise<boolean> {
  const windows = await chrome.windows.getAll({ populate: false, windowTypes: ['normal'] });
  const alternativeWindows = windows.filter(window => window.id !== currentWindowId);

  if (alternativeWindows.length === 0) {
    showNotification('Open another browser window to un-yank this tab.', 'info');
    return false;
  }

  if (alternativeWindows.length === 1) {
    const targetWindow = alternativeWindows[0];
    if (!targetWindow || !targetWindow.id) {
      showNotification('Failed to retrieve alternative window information.', 'error');
      return false;
    }
    return await unyankTabToWindow(tabId, targetWindow.id);
  }

  const windowSelectorUrl = chrome.runtime.getURL(
    `window-selector.html?tabId=${tabId}&currentWindowId=${currentWindowId}`
  );

  await chrome.windows.create({
    url: windowSelectorUrl,
    type: 'popup',
    width: 380,
    height: 400,
    focused: true
  });

  return true;
}

// Core function: Un-yank a tab to its original window when possible
async function unyankTab(tabId: number) {
  console.log(`Attempting to un-yank tab ${tabId}`);

  try {
    const currentTab = await chrome.tabs.get(tabId);
    const storageKey = STORAGE_PREFIX + tabId;
    const result = await chrome.storage.session.get(storageKey);
    const detachData = result[storageKey] as DetachData | undefined;


    if (!detachData) {
      console.log('No yank history found for tab, opening window selector', tabId);
      return await openWindowSelector(tabId, currentTab.windowId);
    }

    // Check if original window still exists
    const originalWindowExists = await checkWindowExists(detachData.originalWindowId);

    if (originalWindowExists) {
      const targetIndex = await getOriginalWindowInsertIndex(
        detachData.originalWindowId,
        detachData.originalTabIndex
      );

      if (targetIndex === -1) {
        await moveTabAndActivate(tabId, detachData.originalWindowId);
      } else {
        await moveTabToWindowIndexAndActivate(tabId, detachData.originalWindowId, targetIndex);
      }

      // Clean up storage
      await chrome.storage.session.remove(storageKey);

      showNotification('Tab successfully un-yanked to original window', 'success');
      console.log(`Tab ${tabId} un-yanked to original window ${detachData.originalWindowId}`);
      return true;

    } else {
      // Original window no longer exists - let user choose
      console.log('Original window no longer exists, showing window selection');
      return await handleMissingOriginalWindow(tabId, currentTab.windowId);
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error un-yanking tab:', error);
      showNotification('Failed to un-yank tab: ' + error.message, 'error');
    } else {
      console.error('Unknown error un-yanking tab:', error);
      showNotification('Failed to un-yank tab due to an unknown error.', 'error');
    }
    return false;
  }
}

// Handle case where original window no longer exists
async function handleMissingOriginalWindow(tabId: number, currentWindowId: number): Promise<boolean> {
  try {
    return await openWindowSelector(tabId, currentWindowId);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error handling missing original window:', error);
      showNotification('Failed to find alternative window: ' + error.message, 'error');
    } else {
      console.error('Unknown error handling missing original window:', error);
      showNotification('Failed to find alternative window due to an unknown error.', 'error');
    }
    return false;
  }
}

// Show notification to user
function showNotification(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const iconUrl = type === 'error' ? 'icons/icon-error.png' :
    type === 'success' ? 'icons/icon-success.png' :
      'icons/icon32.png';

  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconUrl,
    title: 'Tab Yanker',
    message: message
  });
}

// Un-yank a tab to a specific window (used by window selector)
async function unyankTabToWindow(tabId: number, targetWindowId: number): Promise<boolean> {
  console.log(`Attempting to un-yank tab ${tabId} to window ${targetWindowId}`);

  try {
    // Verify target window exists
    const windowExists = await checkWindowExists(targetWindowId);
    if (!windowExists) {
      showNotification('Target window no longer exists', 'error');
      return false;
    }

    // Move tab to target window and focus it
    await moveTabAndActivate(tabId, targetWindowId);

    // Clean up storage
    const storageKey = STORAGE_PREFIX + tabId;
    await chrome.storage.session.remove(storageKey);

    showNotification('Tab successfully un-yanked to selected window', 'success');
    console.log(`Tab ${tabId} un-yanked to window ${targetWindowId}`);
    return true;

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error un-yanking tab to specific window:', error);
      showNotification('Failed to un-yank tab: ' + error.message, 'error');
    } else {
      console.error('Unknown error un-yanking tab to specific window:', error);
      showNotification('Failed to un-yank tab due to an unknown error.', 'error');
    }
    return false;
  }
}

// Get all currently detached tabs
async function getAllDetachedTabs() : Promise<DetachData[]> {
  const allItems = await chrome.storage.session.get();
  const detachedTabs = [];

  for (const [key, value] of Object.entries(allItems)) {
    if (key.startsWith(STORAGE_PREFIX)) {
      // Verify tab still exists
      const v = value as DetachData | undefined;
      if (!v) {
        continue;
      }
      try {
        const tab = await chrome.tabs.get(v.tabId);
        detachedTabs.push({
          ...v,
          currentTitle: tab.title,
          currentUrl: tab.url
        });
      } catch (error) {
        // Tab no longer exists, clean up storage
        await chrome.storage.session.remove(key);
      }
    }
  }

  return detachedTabs;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  console.log('Message received:', request);

  switch (request.action) {
    case 'getDetachedTabs':
      getAllDetachedTabs().then(tabs => {
        sendResponse(tabs);
      });
      return true; // Keep message channel open for async response

    case 'yankActiveTab':
      chrome.tabs.query({ active: true, currentWindow: true }).then(async ([activeTab]) => {
        if (!activeTab) {
          sendResponse(false);
          return;
        }
        if (!activeTab.id) {
          sendResponse(false);
          return;
        }

        const success = await yankTab(activeTab.id);
        sendResponse(success);
      });
      return true; // Keep message channel open for async response

    case 'getYankEligibility':
      chrome.tabs.query({ active: true, currentWindow: true }).then(async ([activeTab]) => {
        if (!activeTab) {
          sendResponse({ allowed: false, reason: 'No active tab found.' });
          return;
        }
        if (!activeTab.id) {
          sendResponse({ allowed: false, reason: 'Active tab has no ID.' });
          return;
        }

        const eligibility = await getYankEligibility(activeTab.id);
        sendResponse(eligibility);
      });
      return true; // Keep message channel open for async response

    case 'unyankTab':
      unyankTab(request.tabId).then(success => {
        sendResponse(success);
      });
      return true; // Keep message channel open for async response

    case 'unyankTabToWindow':
      unyankTabToWindow(request.tabId, request.targetWindowId).then(success => {
        sendResponse(success);
      });
      return true; // Keep message channel open for async response

    default:
      sendResponse(false);
      return false; 
  }
});