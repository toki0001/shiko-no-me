import assert from 'node:assert/strict';

export async function measureCardControls(tab, text) {
  return tab.playwright.evaluate(text => {
    const card = [...document.querySelectorAll('.thought-card')]
      .find(card => card.querySelector('.card-text')?.textContent === text);
    if (!card) return null;
    const rect = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    const toggleElement = card.querySelector('.branch-toggle');
    const toggle = rect(toggleElement);
    const hit = toggle && document.elementFromPoint((toggle.left + toggle.right) / 2, (toggle.top + toggle.bottom) / 2);
    return {
      card: rect(card), title: rect(card.querySelector('.card-text')),
      toggle, reachable: Boolean(hit && toggleElement?.contains(hit)),
      controls: [...card.querySelectorAll('.branch-port,.resize-corner')].map(element => ({
        name: element.getAttribute('aria-label'), rect: rect(element),
      })),
    };
  }, text);
}

export function assertCardControls(measurement) {
  assert(measurement?.toggle?.width > 0, 'Select a card with an available collapse control');
  const toggle = measurement.toggle;
  assert(toggle.width >= 43.5 && toggle.height >= 43.5, 'Keep a 44px collapse hit area');
  assert(measurement.reachable, 'The collapse control must receive a click at its center');
  assert(toggle.left >= measurement.card.left - 1 && toggle.right <= measurement.card.right + 1,
    'Keep collapse attached to its own card, inside its horizontal edges');
  assert(toggle.top >= measurement.card.top - 1 && toggle.bottom <= measurement.card.bottom + 5,
    'Keep collapse at the card edge, not floating away from it');
  const distance = rect => Math.hypot(
    Math.max(rect.left - toggle.right, toggle.left - rect.right, 0),
    Math.max(rect.top - toggle.bottom, toggle.top - rect.bottom, 0),
  );
  assert(distance(measurement.title) > 0, 'Collapse must not cover card text');
  const gaps = measurement.controls.map(control => ({ name: control.name, gap: distance(control.rect) }));
  for (const { name, gap } of gaps) assert(gap >= 7.5, `Leave 8px around collapse and ${name}: ${gap.toFixed(2)}px`);
  return { card: measurement.card, toggle, smallestGap: Math.min(...gaps.map(gap => gap.gap)) };
}
