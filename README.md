# Tab Yanker - Multi-Monitor Tab Management

A Browser extension for yanking tabs into new windows and un-yanking them back during multi-monitor workflows.

## Features

- **Tab Tracking**: Tracks tabs when they are **yanked** from their original window
- **Smart Un-yank**: Un-yank tracked tabs back to their original window
- **Keyboard Shortcuts**: Quick access via customizable keyboard shortcuts
- **Multiple UI Options**: Extension popup and keyboard shortcuts
- **Window Selection**: Choose alternative windows when original is no longer available
- **Session Persistence**: Tracking persists across service worker restarts within the same browser session

## Installation

### Loading the Extension (Developer Mode)

1. **Open Your Browser**:
   - Use a Chromium-based browser such as Chrome, Brave, or Edge
2. **Navigate to the Extensions Page**:
   - Open your browser's extensions management page
   - In most Chromium-based browsers, `chrome://extensions/` works
   - Some browsers also provide a browser-specific equivalent such as `edge://extensions/`
3. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch, usually in the top-right corner
4. **Load the Extension**:
   - Click "Load unpacked"
   - Select the `tab-yanker` folder containing this extension
5. **Verify Installation**:
   - You should see "Tab Yanker" in your extensions list
   - The extension icon should appear in your browser toolbar

### Setting Up Keyboard Shortcuts (Optional)

1. Open your browser's extension shortcuts page
   - In many Chromium-based browsers, `chrome://extensions/shortcuts` works
   - Some browsers provide a browser-specific equivalent such as `edge://extensions/shortcuts`
2. Find "Tab Yanker - Multi-Monitor Tab Management"
3. Set your preferred shortcuts:
   - **Yank current tab**: Default `Alt+Shift+Y`
   - **Un-yank current tab**: Default `Alt+Shift+U`

## How It Works

### Automatic Tab Tracking
- When you detach a tab from a window (drag tab out to create new window), Tab Yanker automatically:
  - Records the original window ID
  - Stores the tab information in session storage

### Yank / Un-yank Methods

#### 1. Keyboard Shortcut (Fastest)
- Press `Alt+Shift+Y` on the active tab to **yank** it into a new window
- Press `Alt+Shift+U` on the active tab to **un-yank** it
- The active window must have at least two tabs before a tab can be yanked into its own window
- Yanked tabs go back to their original window when available, and return to their original tab position when that slot still exists
- Tabs without tracked detach data open the window selector so you can choose a destination

#### 2. Extension Popup
- Click the Tab Yanker icon in the toolbar
- View all yanked tabs with their information
- Click "Un-yank" on individual tabs or "Un-yank All"

### Smart Window Selection
When the original window no longer exists, or when you use the shortcut on a tab that was not detached:
- **Alternative Windows Available**: Opens a window selector dialog to choose destination
- **No Alternative Windows Available**: Prompts you to open another browser window first

## Technical Details

### Storage
- Uses `chrome.storage.session` for tracking (persists across service worker restarts)
- Storage pattern: `tab_{tabId}`
- Automatic cleanup when tabs are closed or manually un-yanked

### Permissions Required
- `tabs`: Track tab detachment/attachment events and move tabs
- `storage`: Store detachment information in session storage
- `notifications`: Show status notifications

### Browser Compatibility
- Chromium-based browsers such as Brave, Chrome, and Edge
- Manifest V3 compliant
- Uses standard Chromium extension APIs

## Usage Examples

### Multi-Monitor Screen Sharing
1. Keep your main browser window with multiple tabs open on your secondary monitor.
2. Start sharing your primary screen during a call or presentation.
3. When you need to show information from a tab in the main browser window, **yank** that tab into its own window.
4. Move the new window to the shared screen and present it.
5. When you are done, **un-yank** the tab to send it back to the original browser window.

### Multi-Monitor Coding Workflow
1. Open documentation in one tab
2. Press `Alt+Shift+Y` to yank it into a new window on your second monitor
3. Continue coding on your main monitor
4. When done, press `Alt+Shift+U` to un-yank documentation back to the main window

### Research & Comparison
1. Open multiple research tabs
2. Yank them to different monitor positions
3. Use the Tab Yanker popup to see all yanked tabs
4. Un-yank specific tabs or all at once when consolidating

## Troubleshooting

### Extension Not Working
- Ensure Developer Mode is enabled on your browser's extensions page
- Check that the extension is enabled (toggle switch is on)
- Try reloading the extension: click the refresh icon

### Keyboard Shortcuts Not Working
- Check shortcuts are set on your browser's extensions shortcuts page
- Ensure no conflicts with other extensions or system shortcuts
- Try restarting your browser

### Tabs Not Being Tracked
- Tab Yanker only tracks tabs detached after installation
- Ensure you're actually detaching tabs (not just opening new windows)
- Check the extension popup to see tracked tabs

### Service Worker Issues
- Service workers may restart - this is normal and tracking will continue
- If issues persist, try reloading the extension

## Development

### File Structure
```
tab-yanker/
├── manifest.json          # Extension manifest (V3)
├── background.js          # Service worker with core logic
├── popup.html/js/css      # Extension popup interface
├── window-selector.html/js # Window selection dialog
├── icons/                 # Extension icons
└── README.md             # This file
```

### Key APIs Used
- `chrome.tabs.onDetached` - Listen for tab detachment
- `chrome.tabs.onAttached` - Listen for tab attachment  
- `chrome.tabs.move()` - Move tabs between windows
- `chrome.storage.session` - Store tracking data
- `chrome.commands` - Handle keyboard shortcuts

## License

MIT License - Feel free to modify and distribute.

---

**Tab Yanker** - Making multi-monitor workflows more efficient! 🚀