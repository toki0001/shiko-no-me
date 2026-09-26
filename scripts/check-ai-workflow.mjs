import assert from 'node:assert/strict';

// Read the rendered dialog after a real UI action. This does not modify the page.
export async function checkAIWorkflow(tab, expectedStage) {
  const state = await tab.playwright.evaluate(() => {
    const dialog = document.querySelector('#ai-dialog');
    const visible = element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0;
    const stages = [...dialog.querySelectorAll('[data-ai-stage]')].filter(visible).map(el => el.dataset.aiStage);
    const primary = [...dialog.querySelectorAll('button.primary')].filter(visible).map(el => ({
      text: el.textContent.trim(), height: el.getBoundingClientRect().height,
    }));
    const focused = document.activeElement;
    return {
      open: dialog.open, stages, primary,
      footerVisible: visible(dialog.querySelector('.ai-dialog-footer')),
      focusInside: dialog.contains(focused), focusVisible: focused && visible(focused) && !focused.closest('[hidden], [inert]'),
    };
  });
  assert(state.open, 'Open AI before checking the workflow');
  assert.equal(JSON.stringify(state.stages), JSON.stringify([expectedStage]), 'Show exactly the current workflow stage');
  assert.equal(state.footerVisible, expectedStage === 'review', 'Import action belongs only to the review stage');
  assert.equal(state.primary.length, expectedStage === 'purpose' ? 0 : 1, 'Each working stage needs one primary action');
  assert(state.primary.every(button => button.height >= 43), 'Primary actions need a 44px hit area');
  assert(state.focusInside && state.focusVisible, 'Stage changes must not leave focus in hidden content');
  return state;
}
