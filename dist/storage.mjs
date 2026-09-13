import { validateWorkspace, sampleWorkspace, uid } from './model.mjs';
export const KEY = 'think-tree-web.v1';
export const BACKUP_KEY = `${KEY}.backup`;
export function decode(raw) {
  const envelope = JSON.parse(raw);
  if (!envelope || typeof envelope.revision !== 'string') throw new Error('保存形式が違います。');
  validateWorkspace(envelope.workspace);
  return envelope;
}
export function load(storage) {
  // 壊れた保存データは自動上書きしない。バックアップ表示でもblockedを返し、先に書き出しを促す。
  let raw;
  try {
    raw = storage.getItem(KEY);
    if (raw === null) return { workspace: sampleWorkspace(), raw: null, blocked: false };
    return { workspace: decode(raw).workspace, raw, blocked: false };
  } catch {
    try {
      const backup = storage.getItem(BACKUP_KEY);
      if (backup)
        return {
          workspace: decode(backup).workspace,
          raw,
          blocked: true,
          recovery: true,
          message:
            '最新の保存データを読めなかったため、前回の保存内容を表示しています。先に書き出して保管してください。',
        };
    } catch {
      /* Keep unreadable data intact; never silently overwrite it. */
    }
    return {
      workspace: sampleWorkspace(),
      raw,
      blocked: true,
      message:
        'ブラウザの保存データを利用できません。元のデータは上書きしていません。いま作るノートはファイルに書き出してください。',
    };
  }
}
export function save(storage, workspace, expectedRaw) {
  // 同じノートを開いた古いタブによる上書きを防ぐ。比較から書き込みまではUI側でWeb Locksを使って直列化する。
  validateWorkspace(workspace);
  let current;
  try {
    current = storage.getItem(KEY);
  } catch {
    throw new Error('このブラウザでは保存できません。ノートを書き出して保管してください。');
  }
  if (current !== expectedRaw)
    throw new Error(
      '別のタブでノートが変更されました。いまの内容を書き出してから、ページを再読み込みしてください。',
    );
  const next = JSON.stringify({ revision: uid(), workspace });
  try {
    // バックアップに破損データを移さない。先に正常性を検証し、最新世代を最後に書く。
    if (current) {
      decode(current);
      storage.setItem(BACKUP_KEY, current);
    }
    storage.setItem(KEY, next);
  } catch {
    throw new Error(
      'ブラウザに保存できませんでした。入力内容は画面に残っています。ノートを書き出して保管してください。',
    );
  }
  return next;
}
