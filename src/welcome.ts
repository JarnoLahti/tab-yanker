const SHORTCUTS_URL = 'chrome://extensions/shortcuts';

document.addEventListener('DOMContentLoaded', () => {
  const copyButton = document.getElementById('copy-shortcuts-url') as HTMLButtonElement;
  const dismissButton = document.getElementById('dismiss-page') as HTMLButtonElement;
  const feedback = document.getElementById('copy-feedback') as HTMLElement;

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(SHORTCUTS_URL);
      feedback.textContent = 'Copied chrome://extensions/shortcuts to your clipboard.';
    } catch (error) {
      feedback.textContent = 'Copy failed. Open chrome://extensions/shortcuts manually.';
    }
  });

  dismissButton.addEventListener('click', () => {
    window.close();
  });
});