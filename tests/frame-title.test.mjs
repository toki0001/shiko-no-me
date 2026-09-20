import test from 'node:test';
import assert from 'node:assert/strict';
import { BoardView } from '../dist/board-view.mjs';

function fixture(value = '新しい名前') {
  const calls = [], title = {hidden:true, setAttribute() {}}, input = {
    value, remove(){this.removed=true;}, focus(){this.focused=true;},
    setCustomValidity(message){this.error=message;}, reportValidity(){},
  };
  const view = Object.create(BoardView.prototype);
  Object.assign(view,{ titleEdit:{frameId:'f',bookId:'b',original:'元の名前',input},
    frameElements:new Map([['f',{querySelector:selector=>selector==='.frame-title'?title:null,querySelectorAll:()=>[]}]]),
    callbacks:{renameFrame:(...args)=>{calls.push(args);return true;}} });
  return {view,input,title,calls};
}
test('inline frame title commits trimmed text once without replacing adjacent controls', () => {
  const {view,input,title,calls} = fixture('  新しい名前  ');
  assert(view.finishFrameTitle());
  assert.deepEqual(calls,[['f','新しい名前','b']]);
  assert(input.removed);
  assert.equal(title.textContent,'新しい名前');
  assert.equal(title.hidden,false);
  assert(view.finishFrameTitle());
  assert.equal(calls.length,1);
});
test('cancel and unchanged names are inert, blank input and composition cannot commit', () => {
  for(const value of ['元の名前','途中の名前']) {
    const f=fixture(value); assert(f.view.finishFrameTitle(value!=='元の名前')); assert.equal(f.calls.length,0);
  }
  const empty=fixture('   '); assert.equal(empty.view.finishFrameTitle(),false); assert(empty.input.error); assert.equal(empty.calls.length,0);
  const composing=fixture(); composing.view.titleEdit.composing=true;
  assert.equal(composing.view.finishFrameTitle(),false); assert(composing.input.focused); assert.equal(composing.calls.length,0);
});
test('read-only frame names retain selection without opening an editor', () => {
  const view=Object.create(BoardView.prototype), selected=[];
  view.callbacks={readOnly:()=>true,frame:id=>selected.push(id)};
  view.beginFrameTitle('f');
  assert.deepEqual(selected,['f']); assert.equal(view.titleEdit,undefined);
});
