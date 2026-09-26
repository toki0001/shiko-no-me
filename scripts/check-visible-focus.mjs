import assert from 'node:assert/strict';

// Use after real Tab/Enter input through the Browser skill. DOM reads only.
export async function checkVisibleFocus(tab) {
  const result = await tab.playwright.evaluate(() => {
    const element = document.activeElement;
    const rect = element.getBoundingClientRect();
    const x = (rect.left + rect.right) / 2;
    const y = (rect.top + rect.bottom) / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      tag: element.tagName,
      id: element.id,
      label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 160),
      inert: Boolean(element.closest('[inert]')),
      hidden: Boolean(element.closest('[hidden], [aria-hidden="true"]')),
      hasArea: rect.width > 0 && rect.height > 0,
      centerInViewport: x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight,
      covered: !hit || !element.contains(hit),
      hitId: hit?.id,
    };
  });
  assert(!['BODY', 'HTML'].includes(result.tag), 'Focus fell back to the document');
  assert(!result.inert && !result.hidden, 'Focus reached a hidden or inert control');
  assert(result.hasArea && result.centerInViewport, 'Focused control is outside the usable viewport');
  assert(!result.covered, 'Focused control is covered by another surface');
  return result;
}
