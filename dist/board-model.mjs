// Spatial metadata is independent of the thought tree. No parent changes here.
export const CARD = Object.freeze({ width: 224, height: 116 });
export const CARD_MIN = Object.freeze({ width: 160, height: 96 });
export const CORNERS = Object.freeze(['nw', 'ne', 'sw', 'se']);
export const cardSize = (node) => node.size ?? CARD;
export const cardRect = (node) => ({ ...node.position, ...cardSize(node) });
export const SIDES = Object.freeze(['right', 'bottom', 'left', 'top']);
export const PALETTE = Object.freeze([
  ['#4f7d62', '緑'],
  ['#527ca6', '青'],
  ['#aa783e', '黄土'],
  ['#96649d', '紫'],
  ['#b66058', '赤'],
  ['#637078', '灰'],
]);
const extent = 200000;

// Capture stationary references once per drag. A frame never snaps to its own contents.
export function alignmentContext(book, gesture, visibleIds) {
  const movingIds = new Set(gesture.ids);
  const nodes = book.nodes.filter((node) => movingIds.has(node.id));
  const frame = book.frames?.find((item) => item.id === gesture.frameId);
  if (gesture.type !== 'cards' && gesture.type !== 'frame') return null;
  if (!frame && !nodes.length) return null;
  return {
    moving: frame
      ? { x: frame.x, y: frame.y, width: frame.width, height: frame.height }
      : boundsOf(nodes),
    targets: [
      ...book.nodes
        .filter((node) => !movingIds.has(node.id) && (!visibleIds || visibleIds.has(node.id)))
        .map(cardRect),
      ...(book.frames ?? [])
        .filter((item) => item.id !== frame?.id && !item.nodeIds.some((id) => movingIds.has(id)))
        .map((item) => ({ x: item.x, y: item.y, width: item.width, height: item.height })),
    ],
  };
}

export function alignTranslation(context, dx, dy, scale = 1, bypass = false) {
  if (!context || bypass) return { dx, dy, guides: [] };
  const tolerance = 6 / scale;
  const moving = { ...context.moving, x: context.moving.x + dx, y: context.moving.y + dy };
  const guides = [];
  const offsets = { x: 0, y: 0 };
  for (const axis of ['x', 'y']) {
    const size = axis === 'x' ? 'width' : 'height';
    const other = axis === 'x' ? 'y' : 'x';
    const otherSize = axis === 'x' ? 'height' : 'width';
    let best = null;
    for (const target of context.targets) {
      for (const sourceFraction of [0, 0.5, 1]) {
        for (const targetFraction of [0, 0.5, 1]) {
          // Match centers to centers, or edges to edges, rather than ambiguous center/edge pairs.
          if ((sourceFraction === 0.5) !== (targetFraction === 0.5)) continue;
          const at = target[axis] + target[size] * targetFraction;
          const delta = at - moving[axis] - moving[size] * sourceFraction;
          const gap = Math.max(
            0,
            target[other] - moving[other] - moving[otherSize],
            moving[other] - target[other] - target[otherSize],
          );
          if (Math.abs(delta) > tolerance) continue;
          if (
            !best ||
            Math.abs(delta) < Math.abs(best.delta) - 1e-8 ||
            (Math.abs(Math.abs(delta) - Math.abs(best.delta)) < 1e-8 && gap < best.gap)
          ) {
            best = { delta, at, target, gap };
          }
        }
      }
    }
    if (best) {
      offsets[axis] = best.delta;
      guides.push({ axis, at: best.at, target: best.target });
    }
  }
  return {
    dx: dx + offsets.x,
    dy: dy + offsets.y,
    guides: guides.map(({ axis, at, target }) => {
      const other = axis === 'x' ? 'y' : 'x';
      const size = axis === 'x' ? 'height' : 'width';
      const start = moving[other] + offsets[other];
      return {
        axis,
        at,
        from: Math.min(start, target[other]) - 12 / scale,
        to: Math.max(start + moving[size], target[other] + target[size]) + 12 / scale,
      };
    }),
  };
}
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const coordinate = (value) => Number.isFinite(value) && Math.abs(value) <= extent;
const color = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const idLike = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
export function validateBoard(book) {
  const ids = new Set(book.nodes.map((node) => node.id));
  for (const node of book.nodes) {
    if (node.size !== undefined)
      check(
        object(node.size) && Number.isFinite(node.size.width) && Number.isFinite(node.size.height) &&
        node.size.width >= CARD_MIN.width && node.size.height >= CARD_MIN.height &&
        node.size.width <= 2000 && node.size.height <= 2000,
        'カードの大きさが不正です。',
      );
    if (node.position !== undefined)
      check(
        object(node.position) && coordinate(node.position.x) && coordinate(node.position.y),
        'カードの位置が不正です。',
      );
    if (node.branchSide !== undefined)
      check(SIDES.includes(node.branchSide), '枝の方向が不正です。');
    if (node.lineColor !== undefined) check(color(node.lineColor), '線の色が不正です。');
  }
  if (book.frames === undefined) return;
  check(Array.isArray(book.frames) && book.frames.length <= 60, '分類枠は1冊に60個までです。');
  const seen = new Set();
  for (const frame of book.frames) {
    check(object(frame) && idLike(frame.id) && !seen.has(frame.id), '分類枠のIDが不正です。');
    seen.add(frame.id);
    check(
      typeof frame.title === 'string' && frame.title.trim() && frame.title.length <= 80,
      '分類の名前は1〜80文字にしてください。',
    );
    check(
      coordinate(frame.x) &&
        coordinate(frame.y) &&
        Number.isFinite(frame.width) &&
        Number.isFinite(frame.height) &&
        frame.width >= 280 &&
        frame.height >= 200 &&
        frame.width <= extent &&
        frame.height <= extent,
      '分類枠の大きさや位置が不正です。',
    );
    check(color(frame.color), '分類枠の色が不正です。');
    check(
      Array.isArray(frame.nodeIds) &&
        frame.nodeIds.length <= book.nodes.length &&
        new Set(frame.nodeIds).size === frame.nodeIds.length &&
        frame.nodeIds.every((id) => ids.has(id)),
      '分類枠の中のカードが見つからないか、重複しています。',
    );
    check(
      book.nodes.every((node) => node.position),
      '分類枠があるノートにはカードの位置が必要です。',
    );
    const enclosed = nodesInside(book, frame);
    check(
      enclosed.length === frame.nodeIds.length &&
        enclosed.every((id) => frame.nodeIds.includes(id)),
      '分類枠の見た目と中のカードが一致しません。元のノートから書き出し直してください。',
    );
  }
}
export function initializeBoard(book) {
  validateBoard(book);
  book.frames ??= [];
  const byParent = new Map();
  for (const node of book.nodes) {
    const peers = byParent.get(node.parentId) ?? [];
    peers.push(node);
    byParent.set(node.parentId, peers);
  }
  for (const peers of byParent.values()) peers.sort((a, b) => a.order - b.order);
  let row = 0;
  const initial = new Map();
  function visit(node, depth) {
    const descendants = byParent.get(node.id) ?? [];
    const ys = descendants.map((child) => visit(child, depth + 1));
    const y = ys.length ? (ys[0] + ys.at(-1)) / 2 : row++ * 180;
    initial.set(node.id, { x: depth * 332, y });
    return y;
  }
  visit(
    book.nodes.find((node) => node.id === book.rootId),
    0,
  );
  for (const node of book.nodes) {
    node.position ??= initial.get(node.id);
    node.branchSide ??= 'right';
    node.lineColor ??= PALETTE[0][0];
  }
  return book;
}
export function overlaps(a, b, padding = 24) {
  return (
    a.x < b.x + (b.width ?? CARD.width) + padding &&
    a.x + (a.width ?? CARD.width) + padding > b.x &&
    a.y < b.y + (b.height ?? CARD.height) + padding &&
    a.y + (a.height ?? CARD.height) + padding > b.y
  );
}
export function freePosition(book, parentId, side = 'right') {
  check(SIDES.includes(side), '枝の方向を選んでください。');
  const parent = book.nodes.find((node) => node.id === parentId);
  check(parent?.position, '追加元のカードが見つかりません。');
  const horizontal = side === 'right' || side === 'left';
  const size = cardSize(parent);
  const base = {
    x: parent.position.x + (horizontal ? (side === 'right' ? size.width + 108 : -332) : 0),
    y: parent.position.y + (!horizontal ? (side === 'bottom' ? size.height + 84 : -200) : 0),
  };
  // Keep every existing card still. Search perpendicular to the chosen side.
  for (let index = 0; index <= book.nodes.length * 2 + 2; index++) {
    const offset = index === 0 ? 0 : Math.ceil(index / 2) * (index % 2 ? 1 : -1);
    const point = {
      x: base.x + (horizontal ? 0 : offset * 276),
      y: base.y + (horizontal ? offset * 168 : 0),
    };
    if (
      coordinate(point.x) &&
      coordinate(point.y) &&
      !book.nodes.some((node) => node.position && overlaps(point, cardRect(node)))
    )
      return point;
  }
  throw new Error('この方向に空きがありません。カードを動かしてから追加してください。');
}
export function placeNode(book, node, side = 'right') {
  if (!node.position) node.position = freePosition(book, node.parentId, side);
  node.branchSide = side;
  node.lineColor ??=
    book.nodes.find((item) => item.id === node.parentId)?.lineColor ?? PALETTE[0][0];
  return node;
}
export function setLineColor(book, ids, value) {
  check(color(value), '線の色を選んでください。');
  for (const node of book.nodes)
    if (ids.includes(node.id) && node.parentId !== null) node.lineColor = value;
}
export function moveCards(book, ids, dx, dy, { sync = true } = {}) {
  check(Number.isFinite(dx) && Number.isFinite(dy), '移動先が不正です。');
  const nodes = [...new Set(ids)].map((id) => book.nodes.find((node) => node.id === id));
  check(
    nodes.every(
      (node) =>
        node?.position && coordinate(node.position.x + dx) && coordinate(node.position.y + dy),
    ),
    'ボードの端に達しました。',
  );
  for (const node of nodes) node.position = { x: node.position.x + dx, y: node.position.y + dy };
  if (sync) syncFrameMembership(book);
}
export function nodesInside(book, frame) {
  return book.nodes
    .filter(
      (node) =>
        node.position &&
        node.position.x >= frame.x &&
        node.position.y >= frame.y + 44 &&
        node.position.x + cardSize(node).width <= frame.x + frame.width &&
        node.position.y + cardSize(node).height <= frame.y + frame.height,
    )
    .map((node) => node.id);
}
export function createFrame(book, ids, title = '新しい分類') {
  initializeBoard(book);
  const members = book.nodes.filter((node) => ids.includes(node.id));
  check(members.length, '囲むカードを選んでください。');
  check(book.frames.length < 60, '分類枠は1冊に60個までです。');
  const x = Math.min(...members.map((node) => node.position.x)) - 32,
    y = Math.min(...members.map((node) => node.position.y)) - 64;
  const frame = {
    id: crypto.randomUUID(),
    title,
    x,
    y,
    width: Math.max(280, Math.max(...members.map((node) => node.position.x + cardSize(node).width)) + 32 - x),
    height: Math.max(
      200,
      Math.max(...members.map((node) => node.position.y + cardSize(node).height)) + 32 - y,
    ),
    color: PALETTE[0][0],
    nodeIds: members.map((node) => node.id),
  };
  frame.nodeIds = nodesInside(book, frame);
  book.frames.push(frame);
  return frame;
}
export function moveFrame(book, frameId, dx, dy) {
  const frame = book.frames?.find((item) => item.id === frameId);
  check(frame, '分類枠が見つかりません。');
  check(coordinate(frame.x + dx) && coordinate(frame.y + dy), 'ボードの端に達しました。');
  moveCards(book, frame.nodeIds, dx, dy, { sync: false });
  frame.x += dx;
  frame.y += dy;
  syncFrameMembership(book);
}
// Keep the opposite corner fixed, including when a minimum or maximum is reached.
export function resizedRect(rect, corner, dx, dy, minimum = CARD_MIN, maximum = 2000) {
  check(CORNERS.includes(corner) && Number.isFinite(dx) && Number.isFinite(dy), 'サイズ変更の位置が不正です。');
  const west = corner.includes('w'), north = corner.includes('n');
  const right = rect.x + rect.width, bottom = rect.y + rect.height;
  const width = Math.max(west ? Math.max(minimum.width, right - extent) : minimum.width,
    Math.min(west ? Math.min(maximum, right + extent) : maximum, rect.width + (west ? -dx : dx)));
  const height = Math.max(north ? Math.max(minimum.height, bottom - extent) : minimum.height,
    Math.min(north ? Math.min(maximum, bottom + extent) : maximum, rect.height + (north ? -dy : dy)));
  return { x: west ? right - width : rect.x, y: north ? bottom - height : rect.y, width, height };
}
export function resizeCard(book, nodeId, width, height, corner = 'se') {
  const node = book.nodes.find((item) => item.id === nodeId);
  check(node?.position, 'カードが見つかりません。');
  const old = cardRect(node);
  const rect = resizedRect(old, corner, (width - old.width) * (corner.includes('w') ? -1 : 1),
    (height - old.height) * (corner.includes('n') ? -1 : 1));
  node.position = { x: rect.x, y: rect.y };
  node.size = { width: rect.width, height: rect.height };
  syncFrameMembership(book);
}
export function resizeFrame(book, frameId, width, height, corner = 'se') {
  const frame = book.frames?.find((item) => item.id === frameId);
  check(frame, '分類枠が見つかりません。');
  check(Number.isFinite(width) && Number.isFinite(height), '分類枠の大きさが不正です。');
  Object.assign(frame, resizedRect(frame, corner,
    (width - frame.width) * (corner.includes('w') ? -1 : 1),
    (height - frame.height) * (corner.includes('n') ? -1 : 1),
    { width: 280, height: 200 }, extent));
  syncFrameMembership(book);
}
export function syncFrameMembership(book) {
  for (const frame of book.frames ?? []) frame.nodeIds = nodesInside(book, frame);
}
export function boundsOf(nodes, frames = []) {
  const rects = [...nodes.map(cardRect), ...frames];
  if (!rects.length) return { x: 0, y: 0, width: CARD.width, height: CARD.height };
  const x = Math.min(...rects.map((rect) => rect.x)),
    y = Math.min(...rects.map((rect) => rect.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((rect) => rect.x + rect.width)) - x,
    height: Math.max(...rects.map((rect) => rect.y + rect.height)) - y,
  };
}
export function connector(parent, child) {
  const p = cardSize(parent), c = cardSize(child);
  const a = parent.position,
    b = child.position,
    side = child.branchSide ?? 'right';
  const points = {
    right: [a.x + p.width, a.y + p.height / 2, b.x, b.y + c.height / 2],
    left: [a.x, a.y + p.height / 2, b.x + c.width, b.y + c.height / 2],
    bottom: [a.x + p.width / 2, a.y + p.height, b.x + c.width / 2, b.y],
    top: [a.x + p.width / 2, a.y, b.x + c.width / 2, b.y + c.height],
  }[side];
  const [x1, y1, x2, y2] = points,
    horizontal = side === 'left' || side === 'right';
  const bend = Math.max(48, Math.abs(horizontal ? x2 - x1 : y2 - y1) * 0.5),
    sign = side === 'left' || side === 'top' ? -1 : 1;
  return horizontal
    ? `M${x1},${y1} C${x1 + bend * sign},${y1} ${x2 - bend * sign},${y2} ${x2},${y2}`
    : `M${x1},${y1} C${x1},${y1 + bend * sign} ${x2},${y2 - bend * sign} ${x2},${y2}`;
}
