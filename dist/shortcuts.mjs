// Keyboard preferences are independent of notebook data and its revision history.
export const SHORTCUT_KEY = 'think-tree-shortcuts-v1';
export const ACTIONS = [
  { id: 'adopted', label: '採用にする', key: '1', card: true, writes: true },
  { id: 'parked', label: '保留にする', key: '2', card: true, writes: true },
  { id: 'rejected', label: '見送りにする', key: '3', card: true, writes: true },
  { id: 'growing', label: '考え中に戻す', key: '0', card: true, writes: true },
  { id: 'child', label: '子カードを追加', key: 'n', card: true, writes: true },
  { id: 'sibling', label: '同じ階層にカードを追加', key: 'Shift+n', card: true, writes: true },
  { id: 'edit', label: '選んだカードを編集', key: 'F2', card: true },
  { id: 'fit', label: 'ボード全体を見る', key: 'f' },
  { id: 'view', label: '広げる／比べて決めるを切替', key: 'v' },
  { id: 'undo', label: '元に戻す', key: 'Mod+z' },
  { id: 'redo', label: 'やり直す', key: 'Mod+Shift+z' },
];
export function defaults() {
  return { version: 1, enabled: true, bindings: Object.fromEntries(ACTIONS.map(a => [a.id, a.key])) };
}
export function eventBinding(event) {
  if (event.isComposing || event.keyCode === 229 || event.getModifierState?.('AltGraph')) return null;
  if (event.ctrlKey && event.metaKey) return null;
  const key = event.key === 'F2' ? 'F2' : /^Digit[0-9]$/.test(event.code ?? '') ? event.code.slice(-1) : event.key?.toLowerCase();
  if (!/^[a-z0-9]$/.test(key ?? '') && key !== 'F2') return null;
  return [event.ctrlKey || event.metaKey ? 'Mod' : '', event.altKey ? 'Alt' : '', event.shiftKey ? 'Shift' : '', key].filter(Boolean).join('+');
}
export function bindingError(binding) {
  if (binding === null) return '';
  if (typeof binding !== 'string' || !/^(Mod\+)?(Alt\+)?(Shift\+)?([a-z0-9]|F2)$/.test(binding))
    return '英数字またはF2を使ってください。Ctrl／⌘・Alt・Shiftも組み合わせられます。';
  // Keep browser navigation, editing and OS menu shortcuts available. In particular
  // Ctrl/Cmd+C/V/X must never become a document mutation outside a text field.
  if (binding.includes('Mod+') && (binding.includes('Alt+') || !/^(Mod\+(Shift\+)?[zy]|Mod\+Shift\+[0-9])$/.test(binding)))
    return 'ブラウザの操作と重なる組み合わせです。別のキーを選んでください。';
  if (binding.includes('Alt+') && !/^Alt\+Shift\+[a-z0-9]$/.test(binding))
    return 'AltはShiftと英数字を組み合わせてください。';
  if (binding.includes('F2') && binding !== 'F2') return 'F2は単独で割り当ててください。';
  return '';
}
export function validateSettings(value) {
  if (!value || value.version !== 1 || typeof value.enabled !== 'boolean' || !value.bindings) throw new Error('設定形式が不正です。');
  const bindings = {}, used = new Set();
  for (const action of ACTIONS) {
    const key = value.bindings[action.id];
    if (key === undefined || bindingError(key)) throw new Error('使えないキーが含まれています。');
    if (key && used.has(key)) throw new Error('同じキーが重複しています。');
    if (key) used.add(key);
    bindings[action.id] = key;
  }
  return { version: 1, enabled: value.enabled, bindings };
}
export function loadSettings(storage) {
  try {
    const raw = storage.getItem(SHORTCUT_KEY);
    return { settings: raw ? validateSettings(JSON.parse(raw)) : defaults(), warning: '' };
  } catch {
    return { settings: defaults(), warning: 'キー設定を読み込めなかったため、初期設定を使っています。' };
  }
}
export function saveSettings(storage, value) {
  const valid = validateSettings(value);
  storage.setItem(SHORTCUT_KEY, JSON.stringify(valid));
  return valid;
}
export function assignBinding(settings, id, binding) {
  const error = bindingError(binding);
  if (error) throw new Error(error);
  if (!ACTIONS.some(a => a.id === id)) throw new Error('操作が見つかりません。');
  const conflict = ACTIONS.find(a => a.id !== id && binding && settings.bindings[a.id] === binding);
  if (conflict) throw new Error(`「${conflict.label}」と重複しています。先にその割り当てを解除してください。`);
  if (id !== 'redo' && binding === 'Mod+y' && settings.bindings.redo === 'Mod+Shift+z')
    throw new Error('「やり直す」の補助キーと重複しています。先にやり直すの割り当てを変更してください。');
  if (id === 'redo' && binding === 'Mod+Shift+z' && ACTIONS.some(a => a.id !== id && settings.bindings[a.id] === 'Mod+y'))
    throw new Error('補助キーのCtrl／⌘＋Yがほかの操作に割り当てられています。');
  return validateSettings({ ...settings, bindings: { ...settings.bindings, [id]: binding } });
}
export function matchShortcut(event, settings, { editable = false, modal = false, busy = false } = {}) {
  if (!settings.enabled || editable || modal || busy || event.repeat || event.defaultPrevented) return null;
  const binding = eventBinding(event);
  if (!binding) return null;
  const assigned = ACTIONS.find(a => settings.bindings[a.id] === binding);
  if (assigned) return assigned;
  if (binding === 'Mod+y' && settings.bindings.redo === 'Mod+Shift+z') return ACTIONS.find(a => a.id === 'redo');
  return null;
}
export function keyLabel(binding) {
  return binding ? binding.split('+').map(k => k === 'Mod' ? 'Ctrl / ⌘' : k.length === 1 ? k.toUpperCase() : k).join(' + ') : '未設定';
}
