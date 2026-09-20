import assert from 'node:assert/strict';

// Run with the Browser skill's local tab, after opening the card inspector.
// Uses rendered geometry and real wheel input; never edits DOM, notes or storage.
export async function measureInspector(tab) {
  return tab.playwright.evaluate(() => {
    const panel = document.querySelector('#inspector');
    const header = panel.querySelector('.inspector-top');
    const body = panel.querySelector('.inspector-body');
    const close = panel.querySelector('#close-inspector');
    const rect = (element) => {
      const r = element.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const p = rect(panel), h = rect(header), c = rect(close);
    const hit = document.elementFromPoint((c.left + c.right) / 2, (c.top + c.bottom) / 2);
    return {
      panel: p, header: h, close: c, body: body && rect(body),
      mode: getComputedStyle(panel).position,
      borderTop: +getComputedStyle(panel).borderTopWidth.replace('px', ''),
      bodyScroll: body?.scrollTop, bodyMaxScroll: body && body.scrollHeight - body.clientHeight,
      panelScroll: panel.scrollTop, headerInsideBody: body?.contains(header),
      closeReachable: Boolean(hit && close.contains(hit)),
      viewport: { width: innerWidth, height: innerHeight },
      pageWidth: document.documentElement.scrollWidth,
    };
  });
}

export function assertInspectorLayout(m) {
  assert.ok(m.panel.height > 0, 'Open the inspector before checking it');
  assert.ok(Math.abs(m.header.top - m.panel.top - m.borderTop) <= 1,
    `Header floats below panel top: ${m.header.top - m.panel.top}px`);
  assert.ok(m.body && !m.headerInsideBody, 'Header must be outside the scrolling body');
  assert.equal(m.panelScroll, 0, 'The outer panel must not scroll');
  assert.ok(Math.abs(m.body.top - m.header.bottom) <= 1, 'Body must start directly below the header');
  assert.ok(m.body.bottom <= m.panel.bottom + 1, 'Body extends outside the panel');
  assert.ok(m.closeReachable, 'Close button is obscured or outside the viewport');
  assert.ok(m.close.width >= 43 && m.close.height >= 43, 'Close hit area must be at least 44px');
  assert.ok(m.pageWidth <= m.viewport.width + 1, 'Panel causes horizontal page overflow');
}

export async function checkInspectorLayout(tab) {
  const initial = await measureInspector(tab);
  assertInspectorLayout(initial);
  assert.ok(initial.bodyMaxScroll > 1, 'Use long content or expand details so the body actually scrolls');
  const { body } = initial;
  const wheel = async (scrollY) => {
    let m;
    for (let i = 0; i < 12; i++) {
      await tab.cua.scroll({ x: body.right - 24, y: (body.top + body.bottom) / 2,
        scrollX: 0, scrollY: Math.sign(scrollY) * 600 });
      m = await measureInspector(tab);
      if (scrollY > 0 ? m.bodyScroll >= m.bodyMaxScroll - 1 : m.bodyScroll <= 1) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assertInspectorLayout(m);
    assert.ok(Math.abs(m.header.top - initial.header.top) <= 1, 'Header moves while reading');
    assert.ok(scrollY > 0 ? m.bodyScroll >= m.bodyMaxScroll - 1 : m.bodyScroll <= 1,
      'Wheel did not reach the expected edge of the body');
    return m;
  };
  const end = await wheel(10000);
  const start = await wheel(-10000);
  assert.ok(end.bodyScroll - start.bodyScroll > 1, 'The scrolling body did not move');
  return { viewport: start.viewport, mode: start.mode, headerInset: start.header.top - start.panel.top,
    scrollTravel: end.bodyScroll - start.bodyScroll, closeReachable: start.closeReachable };
}
