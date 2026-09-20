import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, eventBinding, assignBinding, matchShortcut, loadSettings, saveSettings, validateSettings, SHORTCUT_KEY } from '../dist/shortcuts.mjs';
const key = (value, flags = {}) => ({ key: value, ...flags });
test('decision keys and modifier combinations are exact on Ctrl and Command', () => {
  const s = defaults();
  assert.equal(matchShortcut(key('1'), s).id, 'adopted');
  assert.equal(matchShortcut(key('N', {shiftKey:true}), s).id, 'sibling');
  assert.equal(matchShortcut(key('z', {ctrlKey:true}), s).id, 'undo');
  assert.equal(matchShortcut(key('Z', {metaKey:true,shiftKey:true}), s).id, 'redo');
  assert.equal(matchShortcut(key('1', {ctrlKey:true}), s), null);
  assert.equal(matchShortcut(key('y', {ctrlKey:true}), s).id, 'redo');
  assert.equal(eventBinding(key('!',{code:'Digit1',shiftKey:true})), 'Shift+1');
});
test('typing, selects, dialogs, IME, repeated presses and active gestures never run commands', () => {
  for (const context of [{editable:true},{modal:true},{busy:true}]) assert.equal(matchShortcut(key('n'), defaults(), context), null);
  for (const flags of [{isComposing:true},{keyCode:229},{repeat:true},{defaultPrevented:true},{getModifierState:()=>true}]) assert.equal(matchShortcut(key('n', flags), defaults()), null);
  assert.equal(matchShortcut(key('1'), {...defaults(),enabled:false}), null);
});
test('remapping replaces the old key; removal disables only that action', () => {
  const s = assignBinding(defaults(), 'adopted', 'a');
  assert.equal(matchShortcut(key('1'), s), null);
  assert.equal(matchShortcut(key('A'), s).id, 'adopted');
  assert.equal(matchShortcut(key('a'), assignBinding(s,'adopted',null)), null);
  assert.equal(matchShortcut(key('2'), s).id, 'parked');
  assert.equal(matchShortcut(key('y',{ctrlKey:true}), assignBinding(s,'redo',null)), null);
});
test('duplicate, browser, navigation and unsupported keys are rejected without mutation', () => {
  const s=defaults(), before=JSON.stringify(s);
  for(const value of ['2','Mod+c','Mod+Shift+t','Alt+f','Escape','Tab','Enter','F5','Mod+F2','Mod+y']) assert.throws(()=>assignBinding(s,'adopted',value));
  assert.equal(JSON.stringify(s),before);
  assert.equal(eventBinding(key('Dead')),null);
});
test('settings round trip uses a separate key and never writes notebook storage', () => {
  const data=new Map([['think-tree-workspace','keep']]);
  const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  const s=assignBinding(defaults(),'edit','e');
  saveSettings(storage,s);
  assert.deepEqual(loadSettings(storage).settings,s);
  assert.equal(data.get('think-tree-workspace'),'keep');
  assert(data.has(SHORTCUT_KEY));
});
test('corrupt or unavailable preferences recover visibly without rewriting storage', () => {
  const storage={getItem:()=>'{',setItem:()=>assert.fail('must not write')};
  assert.deepEqual(loadSettings(storage).settings,defaults());
  assert(loadSettings(storage).warning);
  assert.throws(()=>saveSettings({setItem:()=>{throw new Error('quota');}},defaults()),/quota/);
  assert.throws(()=>validateSettings({...defaults(),bindings:{}}));
});
