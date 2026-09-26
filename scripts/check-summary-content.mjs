import assert from 'node:assert/strict';

// Check the actual output after the user opens a decision summary or changes its scope.
export async function checkSummaryContent(tab, { includes = [], excludes = [] } = {}) {
  const summary = await tab.playwright.evaluate(() => {
    const dialog = document.querySelector('#summary-dialog');
    const output = document.querySelector('#decision-summary');
    return { open: dialog?.open, text: output?.value ?? '' };
  });
  assert(summary.open, 'Open the decision summary before checking its content');
  for (const text of includes) assert(summary.text.includes(text), `Summary must retain: ${text}`);
  for (const text of excludes) assert(!summary.text.includes(text), `Summary must omit: ${text}`);
  return { length: summary.text.length, retained: includes.length, omitted: excludes.length };
}
