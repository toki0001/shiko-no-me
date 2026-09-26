import assert from 'node:assert/strict';

// Inspect real rendered controls, including disclosure headings and secondary
// actions. Primary-button checks alone miss small Back and Discard targets.
export async function checkAIControls(tab) {
  const controls = await tab.playwright.evaluate(() => {
    const dialog = document.querySelector('#ai-dialog');
    if (!dialog?.open) return null;
    return [...dialog.querySelectorAll('button, summary, .ai-providers a')]
      .map(element => {
        const rect = element.getBoundingClientRect();
        return { label: element.getAttribute('aria-label') || element.textContent.trim(),
          width: rect.width, height: rect.height };
      }).filter(rect => rect.width > 0 && rect.height > 0);
  });
  assert(controls?.length, 'Open an AI stage before checking its controls');
  for (const control of controls) {
    assert(control.height >= 43.5, `Keep a 44px target for ${control.label}: ${control.height}px`);
    assert(control.width >= 43.5, `Keep a 44px target for ${control.label}: ${control.width}px`);
  }
  return { count: controls.length, minimumHeight: Math.min(...controls.map(item => item.height)) };
}
