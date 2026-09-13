import { CARD, SIDES, boundsOf, connector } from './board-model.mjs';

const el = (tag, className, text) => { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; };
const svg = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
export class BoardView {
  constructor(container, callbacks) {
    this.container = container; this.callbacks = callbacks; this.view = { x: 36, y: 36, scale: 1 }; this.bookId = null;
    this.world = el('div', 'board-world'); this.edges = svg('svg'); this.edges.classList.add('board-edges'); this.edges.setAttribute('aria-hidden', 'true');
    this.frames = el('div', 'board-frames'); this.cards = el('div', 'board-cards'); this.world.append(this.frames, this.edges, this.cards); container.append(this.world);
    this.cardElements = new Map(); this.frameElements = new Map();
    this.pointers = new Map(); this.lastTap = null; this.gesture = null; this.dragFrame = null; this.draft = null;
    container.addEventListener('pointerdown', event => this.pointerDown(event));
    container.addEventListener('pointermove', event => this.pointerMove(event));
    container.addEventListener('pointerup', event => this.pointerUp(event));
    container.addEventListener('pointercancel', () => this.cancelGesture());
    container.addEventListener('lostpointercapture', event => { if (this.gesture?.pointerId === event.pointerId) this.cancelGesture(); });
    container.addEventListener('wheel', event => {
      if (event.target.closest('textarea,input')) return;
      event.preventDefault(); this.lastTap = null;
      if (event.ctrlKey || event.metaKey) this.zoomBy(Math.exp(-event.deltaY * .008), event.clientX, event.clientY);
      else { this.view.x -= event.deltaX; this.view.y -= event.deltaY; this.transform(); }
    }, { passive: false });
    container.addEventListener('keydown', event => this.keydown(event));
    window.addEventListener('blur', () => this.cancelGesture());
    this.resizeObserver = new ResizeObserver(() => { if (this.book) this.transform(); }); this.resizeObserver.observe(container);
  }
  render(book, rows, selectedIds, selectedFrame) {
    const focused = document.activeElement;
    const focusedCard = this.container.contains(focused) ? focused.closest('.thought-card')?.dataset.nodeId : null;
    const focusedFrame = this.container.contains(focused) ? focused.closest('.classification-frame')?.dataset.frameId : null;
    const focusPart = focused?.dataset.side ? `.port-${focused.dataset.side}` : focused?.classList.contains('frame-resize') ? '.frame-resize' : focused?.classList.contains('frame-edit') ? '.frame-edit' : focusedFrame ? '.frame-title' : '.card-body';
    this.cancelGesture();
    this.book = book; this.rows = rows; this.selectedIds = selectedIds; this.selectedFrame = selectedFrame;
    this.cards.replaceChildren(); this.frames.replaceChildren(); this.cardElements.clear(); this.frameElements.clear();
    const shown = new Set(rows.map(row => row.node.id));
    for (const frame of book.frames ?? []) {
      const box = el('section', `classification-frame${frame.id === selectedFrame ? ' is-selected' : ''}`); box.dataset.frameId = frame.id; box.style.setProperty('--frame-color', frame.color);
      const title = el('button', 'frame-title', frame.title); title.type = 'button'; title.setAttribute('aria-label', `分類：${frame.title}`); box.append(title);
      title.addEventListener('click', event => { if (event.detail === 0) this.callbacks.frame(frame.id); });
      const edit = el('button', 'frame-edit', '編集'); edit.type = 'button'; edit.setAttribute('aria-label', `${frame.title}の分類枠を編集`); edit.addEventListener('click', () => this.callbacks.frame(frame.id, true)); box.append(edit);
      const resize = el('button', 'frame-resize', '↘'); resize.type = 'button'; resize.dataset.resize = frame.id; resize.setAttribute('aria-label', `${frame.title}の大きさを変更。矢印キーでも調整できます`);
      resize.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation(); const step = event.shiftKey ? 80 : 24;
        this.callbacks.gesture({ type: 'resize', frameId: frame.id, width: frame.width + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), height: frame.height + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) });
        this.frameElements.get(frame.id)?.querySelector('.frame-resize').focus({ preventScroll: true });
      }); box.append(resize);
      this.frames.append(box); this.frameElements.set(frame.id, box);
    }
    for (const { node, depth } of rows) {
      const card = el('article', `thought-card${selectedIds.has(node.id) ? ' is-selected' : ''}`); card.dataset.nodeId = node.id;
      const select = el('button', 'card-body'); select.type = 'button'; select.setAttribute('aria-label', `${node.text}、${this.callbacks.stateLabel(node.state)}`);
      select.append(el('span', 'card-text', node.text));
      const meta = el('span', 'card-meta'); meta.append(el('span', 'card-state', this.callbacks.stateLabel(node.state)));
      if (selectedIds.has(node.id)) meta.append(el('span', 'card-selected-label', '選択中'));
      select.append(meta); select.addEventListener('click', event => { if (event.detail === 0) this.callbacks.select(node.id, event.shiftKey); }); card.append(select);
      for (const side of SIDES) {
        const names = { right: '右', bottom: '下', left: '左', top: '上' };
        const port = el('button', `branch-port port-${side}`, '+'); port.type = 'button'; port.dataset.side = side;
        port.setAttribute('aria-label', `${node.text}から${names[side]}に枝を追加`); port.addEventListener('click', () => this.callbacks.add(node.id, side)); card.append(port);
      }
      card.style.setProperty('--node-depth', depth); this.cards.append(card); this.cardElements.set(node.id, card);
    }
    this.drawGeometry(shown);
    if (this.bookId !== book.id) { this.bookId = book.id; this.fit(); } else this.transform();
    if (focusedCard || focusedFrame) {
      const replacement = focusedCard ? this.cardElements.get(focusedCard) : this.frameElements.get(focusedFrame);
      (replacement?.querySelector(focusPart) ?? this.container).focus({ preventScroll: true });
    }
  }
  drawGeometry(shown = new Set(this.rows.map(row => row.node.id)), preview = null) {
    const positions = preview?.positions ?? new Map(), frameRects = preview?.frames ?? new Map();
    for (const node of this.book.nodes) { const card = this.cardElements.get(node.id), position = positions.get(node.id) ?? node.position; if (card) { card.style.left = `${position.x}px`; card.style.top = `${position.y}px`; } }
    for (const frame of this.book.frames ?? []) {
      const box = this.frameElements.get(frame.id), rect = frameRects.get(frame.id) ?? frame; if (box) Object.assign(box.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    }
    this.edges.replaceChildren(); const byId = new Map(this.book.nodes.map(node => [node.id, node]));
    for (const node of this.book.nodes) {
      if (!node.parentId || !shown.has(node.id) || !shown.has(node.parentId)) continue;
      const parent = byId.get(node.parentId);
      const d = connector({ ...parent, position: positions.get(parent.id) ?? parent.position }, { ...node, position: positions.get(node.id) ?? node.position });
      const hit = svg('path'); hit.setAttribute('d', d); hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', '16'); hit.setAttribute('fill', 'none'); hit.classList.add('edge-hit');
      hit.addEventListener('click', () => this.callbacks.edge(node.id));
      const path = svg('path'); path.setAttribute('d', d); path.setAttribute('stroke', node.lineColor); path.setAttribute('fill', 'none'); path.setAttribute('stroke-width', this.selectedIds.has(node.id) ? '3.5' : '2.5'); this.edges.append(hit, path);
    }
  }
  transform() {
    this.world.style.transform = `translate(${this.view.x}px,${this.view.y}px) scale(${this.view.scale})`;
    this.container.style.setProperty('--board-scale', this.view.scale); this.callbacks.zoom?.(this.view.scale);
    this.container.classList.toggle('is-overview', this.view.scale < .7);
  }
  fit() {
    if (!this.book || !this.container.clientWidth) return;
    const rect = boundsOf(this.rows.map(row => row.node), this.book.frames);
    const scale = Math.max(.25, Math.min(1, (this.container.clientWidth - 96) / rect.width, (this.container.clientHeight - 96) / rect.height));
    this.view = { scale, x: (this.container.clientWidth - rect.width * scale) / 2 - rect.x * scale, y: (this.container.clientHeight - rect.height * scale) / 2 - rect.y * scale }; this.transform();
  }
  zoomBy(factor, clientX, clientY) {
    const rect = this.container.getBoundingClientRect(), x = (clientX ?? rect.left + rect.width / 2) - rect.left, y = (clientY ?? rect.top + rect.height / 2) - rect.top;
    const before = this.view.scale, scale = Math.max(.25, Math.min(1.75, before * factor));
    this.view.x = x - (x - this.view.x) / before * scale; this.view.y = y - (y - this.view.y) / before * scale; this.view.scale = scale; this.transform();
  }
  reveal(id, focus = false) {
    const node = this.book.nodes.find(item => item.id === id); if (!node) return;
    const scale = Math.max(.85, this.view.scale);
    this.view = { scale, x: (this.container.clientWidth - CARD.width * scale) / 2 - node.position.x * scale, y: (this.container.clientHeight - CARD.height * scale) / 2 - node.position.y * scale }; this.transform();
    if (focus) this.cardElements.get(id)?.querySelector('.card-body').focus({ preventScroll: true });
  }
  pointerDown(event) {
    if (event.button !== 0 && event.button !== 1 || event.target.closest('textarea,input,.branch-port,.frame-edit,.edge-hit,.draft-actions')) return;
    if (!this.callbacks.ready()) { event.preventDefault(); return; }
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.container.setPointerCapture(event.pointerId);
    if (this.pointers.size === 2) {
      this.cancelPreview(); this.lastTap = null;
      const [a, b] = [...this.pointers.values()], rect = this.container.getBoundingClientRect();
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      this.pinch = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), scale: this.view.scale, world: { x: (mid.x - this.view.x) / this.view.scale, y: (mid.y - this.view.y) / this.view.scale } }; return;
    }
    if (this.pinch || this.pointers.size !== 1) return;
    const card = event.target.closest('.thought-card'), frame = event.target.closest('.classification-frame');
    let type = 'pan', ids = [], frameId;
    if (card && event.button === 0) { type = 'cards'; ids = this.selectedIds.has(card.dataset.nodeId) ? [...this.selectedIds] : [card.dataset.nodeId]; }
    else if (frame && event.button === 0) { frameId = frame.dataset.frameId; type = event.target.closest('.frame-resize') ? 'resize' : 'frame'; ids = this.book.frames.find(item => item.id === frameId).nodeIds; }
    this.gesture = { pointerId: event.pointerId, pointerType: event.pointerType, type, ids, frameId, cardId: card?.dataset.nodeId, x: event.clientX, y: event.clientY, view: { ...this.view }, moved: false, shiftKey: event.shiftKey, dx: 0, dy: 0 };
  }
  pointerMove(event) {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pinch) {
      if (this.pointers.size < 2) return;
      const [a, b] = [...this.pointers.values()], rect = this.container.getBoundingClientRect();
      const scale = Math.max(.25, Math.min(1.75, this.pinch.scale * Math.hypot(a.x - b.x, a.y - b.y) / this.pinch.distance));
      this.view = { scale, x: (a.x + b.x) / 2 - rect.left - this.pinch.world.x * scale, y: (a.y + b.y) / 2 - rect.top - this.pinch.world.y * scale }; this.transform(); return;
    }
    const g = this.gesture; if (!g || g.pointerId !== event.pointerId) return;
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < (g.pointerType === 'touch' ? 10 : 5)) return;
    g.moved = true; this.lastTap = null; g.dx = dx / g.view.scale; g.dy = dy / g.view.scale;
    if (g.type === 'pan') { this.view.x = g.view.x + dx; this.view.y = g.view.y + dy; this.transform(); return; }
    if (this.dragFrame) return;
    this.dragFrame = requestAnimationFrame(() => { this.dragFrame = null; this.previewGesture(); });
  }
  previewGesture() {
    const g = this.gesture; if (!g?.moved || g.type === 'pan') return;
    const positions = new Map(), frames = new Map();
    if (g.type === 'cards' || g.type === 'frame') for (const node of this.book.nodes) if (g.ids.includes(node.id)) positions.set(node.id, { x: node.position.x + g.dx, y: node.position.y + g.dy });
    if (g.frameId) {
      const frame = this.book.frames.find(item => item.id === g.frameId);
      frames.set(frame.id, g.type === 'resize' ? { ...frame, width: Math.max(280, frame.width + g.dx), height: Math.max(200, frame.height + g.dy) } : { ...frame, x: frame.x + g.dx, y: frame.y + g.dy });
    }
    this.drawGeometry(undefined, { positions, frames });
  }
  pointerUp(event) {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.delete(event.pointerId);
    if (this.pinch) { if (!this.pointers.size) this.pinch = null; return; }
    const g = this.gesture; this.gesture = null;
    if (this.dragFrame) cancelAnimationFrame(this.dragFrame); this.dragFrame = null;
    if (!g || g.pointerId !== event.pointerId) return;
    if (g.moved) {
      this.lastTap = null;
      if (g.type === 'resize') {
        const frame = this.book.frames.find(item => item.id === g.frameId);
        this.callbacks.gesture({ type: 'resize', frameId: g.frameId, width: frame.width + g.dx, height: frame.height + g.dy });
      } else if (g.type !== 'pan') this.callbacks.gesture(g);
      this.drawGeometry(); return;
    }
    if (g.type === 'frame' || g.type === 'resize') { this.callbacks.frame(g.frameId); return; }
    if (g.type === 'cards') {
      const previous = this.lastTap, now = performance.now();
      const double = g.pointerType === 'touch' && !this.callbacks.multiple() && previous?.id === g.cardId && now - previous.time < 340 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 24;
      if (double) { this.lastTap = null; this.callbacks.add(g.cardId, 'right'); }
      else { this.callbacks.select(g.cardId, g.shiftKey); this.lastTap = { id: g.cardId, time: now, x: event.clientX, y: event.clientY }; }
    } else { this.lastTap = null; this.callbacks.clearFrame(); }
  }
  cancelPreview() { if (this.dragFrame) cancelAnimationFrame(this.dragFrame); this.dragFrame = null; this.gesture = null; if (this.book) this.drawGeometry(); }
  cancelGesture() { this.cancelPreview(); this.pointers.clear(); this.pinch = null; }
  keydown(event) {
    if (event.isComposing || event.target.closest('textarea,input') || event.target.closest('.frame-resize')) return;
    if (event.key === 'Escape') { this.cancelGesture(); this.callbacks.escape(); return; }
    const card = event.target.closest('.thought-card'), frame = event.target.closest('.classification-frame');
    if (event.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); const step = event.shiftKey ? 80 : 24, dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0, dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
      if (frame) { this.callbacks.gesture({ type: 'frame', frameId: frame.dataset.frameId, dx, dy }); this.frameElements.get(frame.dataset.frameId)?.querySelector('.frame-title').focus({ preventScroll: true }); }
      else if (card) { this.callbacks.gesture({ type: 'cards', ids: [card.dataset.nodeId], dx, dy }); this.cardElements.get(card.dataset.nodeId)?.querySelector('.card-body').focus({ preventScroll: true }); }
      return;
    }
    if (card && event.key === 'F2') { event.preventDefault(); this.callbacks.edit(card.dataset.nodeId); }
    if (event.target === this.container && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); this.view.x += event.key === 'ArrowRight' ? -80 : event.key === 'ArrowLeft' ? 80 : 0; this.view.y += event.key === 'ArrowDown' ? -80 : event.key === 'ArrowUp' ? 80 : 0; this.transform();
    }
  }
  showDraft(draft) {
    this.removeDraft(); this.draft = draft;
    const card = el('div', 'thought-card draft-card'); card.style.left = `${draft.position.x}px`; card.style.top = `${draft.position.y}px`;
    const input = el('textarea', 'draft-input'); input.maxLength = 240; input.rows = 2; input.placeholder = 'ここに考えを書く'; input.setAttribute('aria-label', '新しい考え'); input.value = draft.text ?? '';
    input.addEventListener('input', () => { draft.text = input.value; this.callbacks.draftChanged(); });
    input.addEventListener('keydown', event => {
      event.stopPropagation(); if (event.isComposing) return;
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.callbacks.commitDraft(); }
      if (event.key === 'Escape') { event.preventDefault(); this.callbacks.cancelDraft(); }
    });
    const actions = el('div', 'draft-actions');
    for (const [label, handler] of [['追加', () => this.callbacks.commitDraft()], ['やめる', () => this.callbacks.cancelDraft()]]) { const b = el('button', '', label); b.type = 'button'; b.addEventListener('click', handler); actions.append(b); }
    card.append(input, actions); this.cards.append(card); this.draftElement = card; this.draftInput = input;
    const parent = this.book.nodes.find(node => node.id === draft.parentId), line = svg('path'); line.setAttribute('d', connector(parent, { position: draft.position, branchSide: draft.side })); line.setAttribute('stroke', parent.lineColor); line.setAttribute('stroke-dasharray', '6 5'); line.setAttribute('stroke-width', '2'); line.setAttribute('fill', 'none'); this.edges.append(line); this.draftLine = line;
    // Keep the source still unless the new card would be outside the viewport.
    this.view.scale = Math.max(.85, this.view.scale);
    const px = this.view.x + draft.position.x * this.view.scale, py = this.view.y + draft.position.y * this.view.scale;
    if (px < 28 || py < 28 || px + CARD.width * this.view.scale > this.container.clientWidth - 28 || py + CARD.height * this.view.scale > this.container.clientHeight - 28) {
      this.view.x = (this.container.clientWidth - CARD.width * this.view.scale) / 2 - draft.position.x * this.view.scale;
      this.view.y = (this.container.clientHeight - CARD.height * this.view.scale) / 2 - draft.position.y * this.view.scale;
    }
    this.transform(); input.focus({ preventScroll: true });
  }
  removeDraft() { this.draftElement?.remove(); this.draftLine?.remove(); this.draftElement = null; this.draftLine = null; this.draftInput = null; this.draft = null; }
}
