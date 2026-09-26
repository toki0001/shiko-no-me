import assert from 'node:assert/strict';

// Run with the Browser skill's tab after opening AI and making a preview.
// Read geometry only; scrolling uses real wheel input.
export async function measureAIDialog(tab) {
  return tab.playwright.evaluate(() => {
    const panel = document.querySelector('#ai-dialog');
    const header = panel?.querySelector('.ai-dialog-heading');
    const body = panel?.querySelector('.ai-dialog-body');
    const footer = panel?.querySelector('.ai-dialog-footer');
    const close = header?.querySelector('[data-close]');
    const rect = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height };
    };
    const c = rect(close);
    const hit = c && document.elementFromPoint((c.left+c.right)/2, (c.top+c.bottom)/2);
    return {
      panel:rect(panel), header:rect(header), body:rect(body), footer:rect(footer), close:c,
      open:Boolean(panel?.open), closeReachable:Boolean(close && hit && close.contains(hit)),
      borderTop:panel ? +getComputedStyle(panel).borderTopWidth.replace('px','') : 0,
      borderBottom:panel ? +getComputedStyle(panel).borderBottomWidth.replace('px','') : 0,
      panelScroll:panel?.scrollTop, bodyScroll:body?.scrollTop,
      bodyMaxScroll:body ? body.scrollHeight-body.clientHeight : 0,
      bodyWidth:body?.clientWidth, bodyScrollWidth:body?.scrollWidth,
      pageWidth:document.documentElement.scrollWidth,
      viewport:{width:innerWidth,height:innerHeight},
      inputFonts:[...panel.querySelectorAll('textarea, select')].filter(el => el.getBoundingClientRect().height > 0)
        .map(el => ({id:el.id,size:+getComputedStyle(el).fontSize.replace('px','')})),
    };
  });
}

export function assertAIDialogLayout(m) {
  assert(m.open && m.panel?.height > 0, 'Open AI before checking');
  assert(m.header && m.body && m.close, 'AI header/body/close structure is missing');
  assert(Math.abs(m.header.top-m.panel.top-m.borderTop) <= 1, 'AI header is displaced from top');
  assert(Math.abs(m.body.top-m.header.bottom) <= 1, 'AI body must start below header');
  assert.equal(m.panelScroll, 0, 'AI outer dialog must not scroll');
  assert(m.body.height > 60, 'AI body has no usable reading area');
  assert(m.bodyScrollWidth <= m.bodyWidth+1, 'AI body overflows horizontally');
  assert(m.pageWidth <= m.viewport.width+1, 'AI causes page overflow');
  assert(m.panel.left >= -1 && m.panel.right <= m.viewport.width+1, 'AI extends outside viewport');
  assert(m.panel.top >= -1 && m.panel.bottom <= m.viewport.height+1, 'AI extends outside viewport height');
  assert(m.closeReachable, 'AI close button is obscured');
  assert(m.close.width >= 43 && m.close.height >= 43, 'AI close hit area is below44px');
  assert(m.inputFonts.every(input => input.size >= 16), 'AI textarea/select font below16px');
  if (m.footer?.height) {
    assert(Math.abs(m.body.bottom-m.footer.top) <= 1, 'AI body overlaps footer');
    assert(Math.abs(m.footer.bottom-m.panel.bottom+m.borderBottom) <= 1, 'AI footer is displaced from bottom');
  }
}

export async function checkAIDialogLayout(tab) {
  const start = await measureAIDialog(tab);
  assertAIDialogLayout(start);
  assert(start.bodyMaxScroll > 1, 'Use enough content to exercise scrolling');
  const wheel = async direction => {
    let m;
    for (let i=0; i<24; i++) {
      const {body} = await measureAIDialog(tab);
      await tab.cua.scroll({x:body.right-12,y:(body.top+body.bottom)/2,scrollX:0,scrollY:direction*800});
      m = await measureAIDialog(tab);
      if (direction > 0 ? m.bodyScroll >= m.bodyMaxScroll-1 : m.bodyScroll <= 1) break;
    }
    assertAIDialogLayout(m);
    assert(Math.abs(m.header.top-start.header.top) <= 1, 'AI header moves while reading');
    assert(direction > 0 ? m.bodyScroll >= m.bodyMaxScroll-1 : m.bodyScroll <= 1, 'AI wheel did not reach requested edge');
    return m;
  };
  const end = await wheel(1);
  const top = await wheel(-1);
  assert(end.bodyScroll-top.bodyScroll > 1, 'AI scrolling did not move');
  return {viewport:top.viewport,headerInset:top.header.top-top.panel.top,
    scrollTravel:end.bodyScroll-top.bodyScroll,closeReachable:top.closeReachable,
    footerHeight:top.footer?.height ?? 0};
}
