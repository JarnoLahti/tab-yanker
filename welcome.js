const BRAVE_SHORTCUTS_URL = 'brave://extensions/shortcuts';

document.addEventListener('DOMContentLoaded', () => {
  const copyButton = document.getElementById('copy-shortcuts-url');
  const dismissButton = document.getElementById('dismiss-page');
  const feedback = document.getElementById('copy-feedback');

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(BRAVE_SHORTCUTS_URL);
      feedback.textContent = 'Copied brave://extensions/shortcuts to your clipboard.';
    } catch (error) {
      feedback.textContent = 'Copy failed. Open brave://extensions/shortcuts manually.';
    }
  });

  dismissButton.addEventListener('click', () => {
    window.close();
  });
});