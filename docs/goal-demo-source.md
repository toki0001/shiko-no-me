# Goal demo source and reconstruction notes

The goal demo is a learning reconstruction inspired by the Harada Method's Open Window 64. It is not a transcription or facsimile of Shohei Ohtani's original sheet.

Primary source: [Harada Education Institute, “Shōhei Ohtani and the education that helped raise him, part 3”](https://harada-educate.jp/archives/gro_with_news/2048/) (published 2018-04-27; Japanese).

The official article identifies the form as “Open Window 64,” gives the high-school goal as receiving first-round draft selection from eight teams, and names these eight surrounding elements: コントロール, キレ, 変化球, 160キロ, 運, 人間性, メンタル, and 体づくり. It describes adding eight concrete actions to each element. The article does not publish all 64 action phrases in its text. It does list eight examples for 人間性: ゴミ拾い, 部屋掃除, 審判さんへの態度, 本を読む, 応援される人間になる, プラス思考, 道具を大切に使う, and あいさつ.

The demo uses the source's goal, eight element names, and those eight published 人間性 examples. The other 56 action cards are new, AI-authored educational examples. They demonstrate how a goal can be expanded into areas of work and then into actions; they should not be attributed to Ohtani or described as his original wording. The examples avoid prescribing pitching programs, nutrition, or medical practices and point readers to coaches or qualified adults for those decisions.

`createGoalStory()` returns a 73-node tree: one goal, eight element cards, and eight action cards below each element. It also creates eight colored frames, one around each element and its actions. The root note and public description carry the reconstruction caveat; element and action cards use `growing` because the eight elements are concurrent parts of the goal, not mutually exclusive decisions. The eight source element names and the eight published 人間性 examples use `source: 'human'`; the 56 demo-authored actions use `source: 'ai'`.

The UI-facing `kind`, `title`, `labels`, `description`, `sourceUrl`, `steps`, and `groups` values let the app present a compact goal-plus-eight-elements overview and then focus a selected nine-card branch. Keep that overview separate from the full board fit: fitting all eight frames at once makes the action text too small to read.
