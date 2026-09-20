# UI regression checks

DESIGN.md is the design source of truth; LAUNCH-STATE.md records deployed state.

When changing inspector markup, shared CSS, viewport layout or editor behavior:

- Keep the inspector header and close button outside its scrolling body. Layout rules belong in dist/board.css; do not restore conflicting inspector rules in dist/styles.css or dist/focus.css.
- Build with npm run build. dist/index.html is generated from src/index.html and the CSS/JS assets.
- Unit tests alone do not validate layout. Use the Browser skill on a local test notebook, open the inspector, and run scripts/check-inspector-layout.mjs with its tab. See docs/inspector-regression.md.
- Check start/end scrolling, expanded details, card switching, close/reopen, and desktop/mobile breakpoint changes. Measure header-to-panel offset and close-button reachability; do not rely on a screenshot of the initial state alone.
- Keep logic, rendered visual checks, real-device checks and deployment status distinct in reports. Never claim actual touch/IME testing from desktop emulation.
