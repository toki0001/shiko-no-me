// 履歴はページ内だけに保持する。戻した後の新しい編集では、古い「進む」経路を捨てる。
// 呼出側がスナップショットを用意し、登録したオブジェクトを後から編集しないことが前提。
// このクラスは履歴の順序だけを扱い、ノート内容の検証、画面の再描画、保存は行わない。
export class UndoHistory {
  constructor(limit = 40) {
    this.limit = limit;
    this.past = [];
    this.future = [];
  }
  get length() {
    return this.past.length;
  }
  get canRedo() {
    return this.future.length > 0;
  }
  peekUndo() {
    return this.past.at(-1);
  }
  peekRedo() {
    return this.future.at(-1);
  }
  dropRedo() {
    this.future.length = 0;
  }
  // 新しい操作だけが進む履歴を破棄する。redo内ではpushを呼ばず、残りの進む履歴を保つ。
  push(snapshot) {
    this.past.push(snapshot);
    if (this.past.length > this.limit) this.past.shift();
    this.dropRedo();
  }
  undo(current) {
    if (!this.length) return null;
    this.future.push(current);
    return this.past.pop();
  }
  redo(current) {
    if (!this.canRedo) return null;
    this.past.push(current);
    return this.future.pop();
  }
  clear() {
    this.past.length = 0;
    this.dropRedo();
  }
}
