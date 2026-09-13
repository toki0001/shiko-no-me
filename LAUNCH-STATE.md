# 思考の芽 — 配布状態

## 現在の配布 — 戻す・やり直す版 / version 5（2026-09-13）

- 公開URL・publicを維持し、`succeeded`（2026-09-13 14:59:33 UTC）。認証なしHTTP200でredoとhistory-controlsの新HTMLを取得。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site/
- 配布コード: `9cda3fd36e2041a8162c5c50b713f8ed34459dbd`。両リモートへpushし、同じ資産12ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_81c70e3830388191b5e95e95c9ea94d9`。
- Deployment: `appgdep_6aa6ba4b01b88191951e92fc52711c7e`。
- 左上に←/→を追加。文章・カード/枠・表示位置の移動/ズームを直近40段階まで戻す/やり直す。新編集でredoを破棄。文章の履歴を短く区切る。共有デモは表示履歴のみ。
- 全61テスト成功、独立コードレビュー重大0・残指摘0・PASS。新しい矢印の実画面/実機は未確認。提出URLとGitHub/サムネイルは変更なし。

## 過去の配布 — 微調整ズーム版 / version 4（2026-09-13）

- 公開URLと公開範囲publicを維持。最終状態 `succeeded`（2026-09-13 14:52:43 UTC）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site/
- 配布コード: `4b8892a962cd76fcd295af4712e896bf549d65c6`。Sites/GitHub両方へpush済み。同じ資産11ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_b4528a6cfd64819198865d9d9ccde125`。
- Deployment: `appgdep_6aa6b8b13028819188ac45e59d708728`。
- PCホイールを上下移動からカーソル中心ズームへ。ピンチの感度を穏やかにして小数の入力量を保持。＋／−は1.05倍と逆数、倍率表示は小数1桁。
- 57テスト成功。公開JSがHTTP200で新ホイール処理・ピンチ感度を含むことを確認。変更後の視覚・実トラックパッドの手触りは未確認。保存データ・共有デモ・提出URL・サムネイルは維持。

## 過去の配布 — ボード集中・企画デモ版 / version 3（2026-09-13）

- 最終状態 `succeeded`（2026-09-13 14:46:20 UTC）。審査員や他ユーザーに体験してもらう本人の依頼に沿って、14:46:36 UTCに公開範囲をpublicへ変更。
- アプリ: https://shiko-no-me-notebook.tokkey20.chatgpt.site/
- 企画デモ: https://shiko-no-me-notebook.tokkey20.chatgpt.site/?demo=origin
- Public GitHub: https://github.com/toki0001/shiko-no-me
- サムネイル: https://raw.githubusercontent.com/toki0001/shiko-no-me/main/thumbnail.jpg （リポジトリ直下、実画面JPEG）。
- 配布コード: `75b6be65ee8c43f14acfe3be7d9fb26e26ae3c0b`。以後の状態記録は文書のみで、配布資産は変更しない。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_e9f8df193a1c8191bd27a4135eabc002`。
- Deployment: `appgdep_6aa6b731d5a0819185d60098b74f375e`。
- 同じソースをSites専用リポジトリとGitHubへpushし、静的資産とmanifestの11ファイルを梱包して配布。GitHub公開範囲はこのアプリだけで、親リポジトリや個人ノートは含めない。
- 認証なしHTTP200で新CSSと共有中デモ文言を取得。サムネイルもHTTP200。公開ページでデモの順送り・読取専用メモを実クリック確認。既存Siteタブを再利用。
- PC画面の約92%、スマホ幅では約93%をボードに変更。共有デモは25カード・6分類枠・7段階で本人の課題と選択を再構成し、補完した比較案は明記。
- 一般のノートはブラウザ保存のまま。DB・3枠共有は本人の判断で今回は見送り、共有ボタンで未対応を明示する。固定デモをDB共有の実装済みと表現しない。
- 54テスト成功。PC・390幅の実画面、作成・保存・再読込・AI承認と取り消し・デモコピーを確認。実機タッチ/IME/WebMCP呼出の契約テストは未確認。詳細QA.md。
- GitHub Issuesへの入口を追加。公開投稿の注意あり。匿名受付・独自即時通知は未実装で、送信・通知受信テストも未実施。
- 応募フォームの同意・送信は本タスクで行っていない。提出準備の別タスクへ確定URLを連絡済み。

## 過去の配布 — ボード版 / version 2（2026-09-13）

- 本人限定のまま更新。最終状態 `succeeded` を確認（2026-09-13 08:18:46 UTC）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site
- 配布したコード: `a02d121c1ff891f37a34a5b0e11f711bb396eabb`。この後の配布状態・メモリの記録は文書だけの更新で、公開資産は変更しない。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_52bb5e5cbc04819180ba630eb723077b`（version 2）。
- Deployment: `appgdep_6aa65c5d83f08191af2a2edd72b7982b`。
- 検証したコードを専用ソースリポジトリへpushしてから、同じ状態の静的資産とmanifest（9ファイル）を梱包・保存して配布した。
- 主画面を自由配置のボードへ変更。PC四辺の＋／スマホダブルタップで分岐、線の自由色、名前付き分類枠と中身の移動、枠サイズ変更、従来一覧への切替を実装。
- 同じURL・保存キーを維持。旧ノートの文章・採否を残したまま位置情報を補完する。ブラウザ内保存・JSON入出力・人間のAI案承認も維持。
- ロジック：53テスト成功、独立コードレビューは最終残指摘0・PASS。
- 視覚・実操作：Browser接続候補が空で、実画面・タッチ・IME・任意WebMCPの契約テストは未確認。配布成功を描画・実機検証成功とは扱わない。
- 一般公開・Public GitHub・応募は未実施。公開範囲を広げる操作はしていない。

## 初版の配布履歴（2026-09-13）

- Sites登録済み。本人限定の新規サイトで、公開範囲は変更していない。
- 初回配布：本人限定でデプロイ成功を確認（2026-09-13 02:06:48 UTC）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site
- 配布したコード: `7691a45b0205d2b9f9012c053b5140212f33da31`。この後の配布状態・レビュー記録の追記は文書だけの更新。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_720c85e2ae20819198f99ecb640d6676`。
- Deployment: `appgdep_6aa60523bc7081919674aeee9f4de7aa`。最終状態 `succeeded` を取得した。
- 認証なしのHTTP取得は401。一般公開されていないことを確認。認証後の実ブラウザ描画・操作は未確認。
- コンテスト向け一般公開：未実施。
- Public GitHubリポジトリ：未作成。
- 応募フォーム：未入力・未送信。
- 確認用サイトも、ノート本体はブラウザ内保存。URLやブラウザを変えると保存領域が変わるため、JSON書き出し・読み込みを使う。
- 内蔵Browserへ表示する依頼はqueued。表示済みとは扱わない。
