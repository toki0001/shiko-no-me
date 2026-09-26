# 思考の芽 — 配布状態

## 現在の配布：Ver1.03 ボードの判断色 / version 22（2026-09-26）

- 同じpublic URL https://shiko-no-me-notebook.tokkey20.chatgpt.site へ `succeeded`（2026-09-26 14:07:22 UTC / 23:07:22 JST）。通常ノートのカード上辺へ、比較画面と同色の採用/保留/見送りを表示。未判断は従来の枠線を維持。
- 配布コード: `31da1add887c5e0e30bc2ad8ac981ca95fd60049`。GitHub/Sites mainへpush、標準Sites workflowで同じコードの20ファイルを梱包。archive SHA-256: `7ba013f8fac5cf88d6e69bc0579f78c6d42a5a5ded5f8cbcba89d9dfbca6effc`。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_3c98629c0f1c81919a8d8c83304de66c`。
- Deployment: `appgdep_6ab7d18d3d308191ad5760df58136324`。
- [GitHub Actions](https://github.com/toki0001/shiko-no-me/actions/runs/36247344251) completed/success。build・構文42ファイル・153テスト成功。PC/スマホ幅の状態色・選択・開閉、8寸法の編集欄を実画面で確認。Luna Max実装をAstraが角丸修正までレビューし、別Luna Maxの限定差分レビューもPASS。実機タッチは未検証。
- 公開確認はSites nativeの成功応答。公開後のブラウザ再検証は行わず、公開サイトの保存内容は操作していない。サイトURL・public範囲・提出済み画像URL/画像は維持。

## 過去の配布：Ver1.03 AIの復旧・下書き・理由のまとめ / version 21（2026-09-26）

- 同じpublic URL https://shiko-no-me-notebook.tokkey20.chatgpt.site へ `succeeded`（2026-09-26 13:29:13 UTC / 22:29:13 JST）。文脈別のAI入口、原文メモと複数候補、返答形式の明示的な切替、依頼文と返答の下書き復元、関連カードを含む判断まとめを反映。開閉ボタンの間隔と表示位置の維持、隠れる全カード数、未対応共有入口も整理。
- 配布コード: `965a60423b3dc1f0cab593d0b847be947796077f`。GitHub/Sites mainへpushし、同じコミットのmanifestとdistを `git archive` で20ファイルに梱包。archive SHA-256: `c52b14e6d22155965fdc41d15e991db8af0d484a4d03420231e29e2505e3a36a`。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_0d0d64e7f2c48191bfde2a6a84c6abbd`。
- Deployment: `appgdep_6ab7c89c41a08191b406565643b0d728`。
- [GitHub Actions](https://github.com/toki0001/shiko-no-me/actions/runs/36245233276) completed/success。構文42ファイル・build・153テスト成功。PC/390幅の復旧・部分追加・Undo・下書き再開と破棄、2タブ競合、4寸法のAI画面と8寸法の編集欄を実操作。独立UXレビューPASS後、形式エラーの内部用語も修正して限定差分を再レビュー済み。
- 最小160×96カードの100%/86.4%表示で開閉ボタン44px相当、四方向の追加点・四隅との最小間隔約8px。旧v19の0.19px制約は解消。実スマホのタッチ/IME/ソフトキーボード、スクリーンリーダー、各外部AIサービス固有の往復は未検証。匿名の非公開フィードバック受付は既知の残件。詳細QA.md / docs/review-followup-2026-09-26.md / docs/ux-review-followup-2026-09-26.md。
- 公開確認はSites nativeの成功応答。公開後のブラウザ再検証は行わず、利用者の公開サイトの保存内容は操作していない。version 20は最終文言修正前の保存のみで、公開には使用していない。
- 提出済み画像URL https://raw.githubusercontent.com/toki0001/shiko-no-me/main/thumbnail.jpg と画像を維持。ローカルSHA-256は `8f7a372a83eac6a67b883f74751f5acbb85fd92e98db2c0d194c6015cd0c4c32`。フォームの再送なし。

## 過去の配布：Ver1.02 AI画面・言葉・開閉操作 / version 19（2026-09-26）

- 同じpublic URL https://shiko-no-me-notebook.tokkey20.chatgpt.site へ `succeeded`（2026-09-26 10:15:24 UTC / 19:15:24 JST）。目的選択と段階別のAI画面、カード中心の説明、単色の開閉矢印を反映。
- 配布コード: `2071248f9013a4abd8899b51dc4792deb47ad825`。GitHub/Sites mainへpush後、同じコミットのmanifestとdistを `git archive` で18ファイルに梱包して保存。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_8cbc2578f6988191bce20b51ae5bbea9`。
- Deployment: `appgdep_6ab79b2f29bc8191a8827cfb3b6ebfd7`。
- [GitHub Actions](https://github.com/toki0001/shiko-no-me/actions/runs/36235134539) completed/success。構文35ファイル・build・131テスト成功。PC/390幅の追加・Undo・下書き・不正入力・重複拒否、4寸法のAI画面と8寸法の編集欄を確認。最終ローカルconsole error 0。独立UXレビューPASS、詳細docs/ux-simplification-2026-09-26.md。
- 最小160×96カードの85%表示で開閉と下部追加点の間隔が0.19pxになる残課題あり。実機タッチ/IME/ソフトキーボードは未検証。公開確認はSites native成功応答で、公開後ブラウザー再検証はしていない。
- 今回の作業途中にSites標準workflowファイルがキャッシュから消失したため、開始済みのsource準備を引き継ぎ、nativeの資格情報発行・保存・公開とGitによる同一コミットの梱包で完了。資格情報はメモリと非表示stdinだけで扱い、保存していない。
- サイトのURL・public範囲・提出済み `main/thumbnail.jpg` URLを維持。画像の変更なし。SHA-256: `8f7a372a83eac6a67b883f74751f5acbb85fd92e98db2c0d194c6015cd0c4c32`。

## 過去の配布：Ver1.02 目標デモのフォーカス修正 / version 18（2026-09-26）

- 同じpublic URL https://shiko-no-me-notebook.tokkey20.chatgpt.site へ `succeeded`（2026-09-26 07:04:51 UTC / 16:04:51 JST）。Ver1.02のAI改善と目標デモを含み、全体図の裏へキーボードフォーカスが入る不具合を追加修正。
- 配布コード: `b27f484ebe1f6b56688a0ff7eff91c9c8543cdc3`。GitHub/Sites mainへpushし、標準workflowで同じコミットの18ファイルを梱包・保存。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_88a3f9984fac8191a6aeae91cade4f1b`。
- Deployment: `appgdep_6ab76e866c088191a341d41d60a65219`。
- [GitHub Actions](https://github.com/toki0001/shiko-no-me/actions/runs/36225599957) completed/success。構文34ファイル・build・130テスト成功。修正前に失敗するフォーカス確認スクリプトを追加し、ローカルPC/390幅でTab・Enter、要素への移動/復帰、73カードのコピー、編集モーダルの背景制御を確認。独立コードレビューPASS、最終ローカル画面のconsole error 0。
- 実機のタッチ/IME/ソフトキーボード/スクリーンリーダーと公開後ブラウザ再検証は未実施。公開確認はSites native成功応答。元のサイトURL・public範囲・サムネイルURLと画像を維持。

## 過去の配布：Ver1.02 AI会話の取り込みと目標デモ / version 17（2026-09-26）

- 本人の約2時間の継続改善依頼により、GPT-6 Luna Maxが実装し、Astraが差分・実操作をレビューして修正を往復した。別LunaによるUI・AI接続の最終レビューもPASS。
- 同じpublic URL https://shiko-no-me-notebook.tokkey20.chatgpt.site へ `succeeded`（2026-09-26 06:49:51 UTC / 15:49:51 JST）。アプリ内表示はVer1.02。目標デモは同じサイトの `?demo=goal`。
- 配布コード: `bea22202c52b5c7edee58eb7049d4d40b7bbea41`。AI転送ロジックの先行コミットは `2943b36`。GitHub/Sites mainへ通常pushし、同じコミットの18配布ファイルをSites標準スクリプトで梱包・保存した。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_961bb2a1bf988191b0ac98e8b709bb6e`。
- Deployment: `appgdep_6ab76b01ffe881918557f53b4af0b582`。
- GitHub Actions: [配布コードの実行](https://github.com/toki0001/shiko-no-me/actions/runs/36224616088)がcompleted/success。
- 既存枝への多段追加、AI会話からの新規ノート、JSON/Markdownのプレビュー、枝の選択、一括Undo、形式修正の依頼文、ページ内下書きを追加。アプリから外部AIを直接呼ばず、従来どおり本人が依頼文と返答を貼り付ける。
- 第2共有デモは1目標・8要素・64行動の73カード。公式掲載内容を参考にし、56行動を補った学習用の再構成と明示。通常ボードには枝の開閉を追加し、部分表示時の分類枠と回転後の位置ずれも修正。
- ロジック: 構文33ファイル・build・130テスト、生成HTMLの一致・git diff --check成功。視覚/実操作: ローカルPC・390幅のAI取り込み/Undo/保存、8寸法の編集欄、目標デモの縦横画面、実Luna返答・WebMCP呼出を確認。詳細QA.md / docs/ai-review-2026-09-26.md。
- 実スマホ・IME・ソフトキーボード、各外部AIサービス固有の操作、公開後のブラウザ再検証は未実施。Sitesのnative成功応答を公開確認とする。
- 提出済みサムネイルURL https://raw.githubusercontent.com/toki0001/shiko-no-me/main/thumbnail.jpg は維持。今回画像の変更なし。ローカルSHA-256は引き続き `8f7a372a83eac6a67b883f74751f5acbb85fd92e98db2c0d194c6015cd0c4c32`。フォーム再送なし。
- Windowsの標準環境では梱包用bashがPATHに見つからず、GNU tarもCドライブ表記をリモートと解釈した。プロセス内だけGitのbin/usr/binをPathへ追加し、TAR_OPTIONS=--force-localで標準workflowを完走。資格情報はメモリと非表示stdinだけで渡し、ファイルには保存していない。

## GitHub品質整備・同一URLのサムネイル更新（2026-09-26）

- 本人指定のLuna（Max）実装→Astraレビューを完了。GitHub Actionsで構文、build、テスト、生成HTMLの一致を自動確認するようにした。98テスト成功、保存失敗とJSON一括取込の境界を補強。アプリ実行用のsrc/distは変更なし。
- GitHub mainへ品質整備 `18c4781` と画像・レビュー記録 `1895c5867e90f1df9509c9cc0c2105672bb603af` を通常push。後者の[GitHub Actions実行](https://github.com/toki0001/shiko-no-me/actions/runs/36216328787)はcompleted/success。
- 提出済み画像URLを維持: https://raw.githubusercontent.com/toki0001/shiko-no-me/main/thumbnail.jpg 。匿名取得でHTTP200、image/jpeg、168,936 bytes。SHA-256は `8f7a372a83eac6a67b883f74751f5acbb85fd92e98db2c0d194c6015cd0c4c32` で完成JPEGと一致。Cache-Controlはmax-age=300。JPEG1586×992px、画像の文字・内容も確認済み。
- 新画像は内蔵画像生成による作品紹介の概念図。画像待ちは解消。フォームの再送は行っていない。
- アプリURL https://shiko-no-me-notebook.tokkey20.chatgpt.site とpublic範囲は継続。src/distに差分がないため今回のアプリ再デプロイは不要、稼働版は下記version16のまま。Sitesのソース同期補助スクリプトが作業途中にキャッシュから消失したため、新版の保存・デプロイは実行していない。今回のコード品質と画像の公開先は提出済みGitHub。
- ロジックとAstraレビューの記録はQA.md / docs/quality-review-2026-09-26.md。ローカルPC/390幅で追加・採用・Undo/Redo・保存再読込・画面を確認。実スマホ・IME・ソフトキーボード、公開後アプリの再検証は今回行っていない。

## 過去の配布：スマホ縦だけ下部編集 / version 16（2026-09-20）

- 同じpublic URLで `succeeded`（2026-09-20 13:03:31 UTC / 22:03:31 JST）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site
- 配布コード: `3be0037862964776c26097131498976aaf6b8448`。GitHub/Sites mainへpush後、同一HEADの静的資産/manifest14ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_205dc1536e9c819199f9655de6b47411`。
- Deployment: `appgdep_6aafd99641f0819197459928abd8e9f5`。
- 600px以下かつ縦長だけ下部編集。それ以外は右側に幅を予約し、ボードを同時操作。追加バー・mobile-only・modal/inertを同期。回転時も編集中のカードを維持し、ノート一覧との二重inertを回避。
- ロジック: 96テスト・独立レビューPASS。ローカル8サイズの表示方式/背景操作/追加バー、695・390幅のスクロール、568横の保存表示/追加バー非重複、回転時の一覧閉鎖とフォーカスを確認。695幅は画像確認。実機タッチ/ソフトキーボードと公開後ブラウザ再検証は未実施。

## 過去の配布：編集パネルの固定見出し / version 15（2026-09-20）

- 同じpublic URLで `succeeded`（2026-09-20 08:18:30 UTC / 17:18:30 JST）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site
- 配布コード: `64d63c7172f0cfd120d99d489b9964e3200e1048`。GitHub/Sites mainへpush後、同一HEADの静的資産/manifest14ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_18fc659912488191adb2585dc1e4e4e8`。
- Deployment: `appgdep_6aaf96c89ec481918b59edc766d1ca82`。
- 右パネル見出し/×の32pxの浮きを修正。見出しを本文スクロール領域の外へ分離、CSSの重複/余白/sticky補正を撤去。幅別パネル配置はboard.cssへ集約。
- ロジック: 96テスト成功・独立レビューPASS。視覚/実操作: ローカルPC/タブレット/スマホ/低い画面、先頭/末尾、詳細展開、カード切替、×で閉じる、境界両側を確認。実機タッチ/キーボード表示と公開後ブラウザ再検証は未実施。
- 修正前に失敗するブラウザ実測チェックスクリプトとAGENTS.mdの必須ゲートを追加。共通UI台帳G2/P8とオーナーメモリにも書き戻し。外部AI会話の取り込みは構想のみ・未実装。

## 過去の配布：背景Aを正式採用 / version 14（2026-09-20）

- 本人のA採用・デプロイ指示で、同じpublic URLへ `succeeded`（2026-09-20 05:21:15 UTC / 14:21:15 JST）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site
- 配布コード: `e49bf2a017bc2d20397bf56e7e618401adb2d7f3`。GitHub/Sites mainへpush後、同一HEADの静的資産とmanifest14ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_158109021fbc8191b7978002b2aef1bc`。
- Deployment: `appgdep_6aaf6d3db1048191893a97eeb591d244`。
- 点方眼をA（muted色15%）に固定。比較用UI/処理/初回表示の例外を削除。旧比較URLからも同じ濃さになる。
- ロジック: ビルド・96テスト成功、差分確認。視覚: ローカルPC通常/旧比較URLでalpha=0.15、比較バー撤去を確認。通常画面の画像確認。公開後ブラウザ再検証は未実施。
- 梱包時にSitesプラグインのキャッシュが消失していたため、Windows標準tarで静的distとmanifestのみを梱包。内容一覧とmanifestを確認し、Sites保存時にも14ファイルの受理を確認。

## 過去の配布：背景3段階の比較 / version 13（2026-09-20）

- 同じpublic URLで `succeeded`（2026-09-20 05:07:08 UTC / 14:07:08 JST）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site
- 比較URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site/?background=preview
- 配布コード: `9aa1596e2131dca036e0b32f8d12cda4b2eceb32`。GitHub/Sites mainへpush後、同一HEADの静的資産/manifest14ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_79d7eee8eaa0819189b468b076b2f38a`。
- Deployment: `appgdep_6aaf69ef0b9c8191833c5340b96f7c84`。
- 点方眼を旧55%からA15%/B25%/C35%で比較。通常は暫定B。最終採用は本人の選択待ち。比較バーは比較URLのボードだけに表示し、選択はURLに保持。
- ロジック: 96テスト・独立レビューPASS。視覚/実操作: ローカルPC3案と390幅、切替/再読込保持/通常URL非表示/Undo不変を確認。公開後のブラウザ再検証は未実施。

## 過去の配布：ドット方眼・枠名編集 / version 12（2026-09-20）

- 同じpublic URLで `succeeded`（2026-09-20 04:46:47 UTC / 13:46:47 JST）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site
- 配布コード: `3cad66962020c6da9e21c696f0c5346f8eee7040`。GitHub/Sites mainへpushし、同一HEADの静的資産/manifest14ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_5753bb0b8e3c8191b38c9a4c478f7061`。
- Deployment: `appgdep_6aaf652a5ad481919bee6de2ab579425`。
- 点方眼を見える濃さへ、追加バーは601px以上でPCと同じ左下へ、枠名タップでその場の入力欄へ。名前ドラッグ移動・保存・Undoを維持。
- 96テスト・独立コードレビューPASS。ローカルPC/768/601/600/390幅、直接編集/確定/取消/保存復元/移動を確認。共有デモ25カードで名前入力欄0。実タッチ/実IME・公開後のブラウザ再検証は未実施。

## 過去の配布：四つ角リサイズ / version 11（2026-09-20）

- 同じpublic URLで `succeeded`（2026-09-20 04:30:15 UTC / 13:30:15 JST）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site
- 配布コード: `2507dea397bdf0b7b57d7fa96c18578063dc41be`。GitHub/Sites mainへpush後、同一HEADの14ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_6df1b06061f88191a77d318ca9779241`。
- Deployment: `appgdep_6aaf6148285881918f376c85881006bf`。
- 枠/カードの四つ角からサイズ変更。大きな四角いマークを廃止し、透明な角の操作領域とカーソルで案内。位置/寸法を保存・Undo。カードの大きさに線/枠所属/整列が追従。
- ロジック93テスト・独立コードレビューPASS。ローカルPC8角ドラッグ・取消/Redo・再読込・Escape・キーボード確認。390幅のタッチ模擬/25%/最小カードで中央選択を維持。閲覧専用デモ25カード・リサイズハンドル0。詳細QA.md。実スマホ未検証、今回の公開後のブラウザ再検証は未実施。

## 過去の配布：Ver1.01 / version 10（2026-09-20）

- 本人の「ショートカットらへんはデプロイまで進めていい」により公開。同じURL・publicで `succeeded`（2026-09-20 02:52:38 UTC / 11:52:38 JST）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site
- 配布コード: `673666ba38dbae49830289e2d13c59566fa467fb`。GitHub/Sites mainへpush後、同じHEADの静的資産とmanifestの14ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_76ca016945c88191a9165830c83bd823`。
- Deployment: `appgdep_6aaf4a67fb7881918a7f78a63fe9a583`。
- 候補比較・理由付きまとめ・初回例・編集/使い方入口・変更可能なショートカットを含む。表示は「Ver1.01」。AI機能の改善は次の作業。
- ロジック: 公開直前に再ビルド・全88テスト成功。視覚/実操作: 同じ機能のローカルPC/390幅確認はQA.md参照。今回の公開後のブラウザ再検証は未実施。Sitesの成功応答を確認し、既存公開タブへの表示依頼はqueued。
- ローカル確認版と公開サイトの保存先は別。確認用ノート・キー設定の本番への自動移行はしない。

## 公開前の確認版記録：Ver1.01（2026-09-20）

- ユーザー指示によりデプロイ・pushなし。公開版は下記v9のまま。
- 確認先: http://127.0.0.1:4191/?view=compare （ローカル専用）。確認サーバーは作業終了時も起動を維持。
- ブランチ: codex/ver1.01-decision-preview。候補比較・理由付きまとめ・初回例・編集/使い方の入口改善。
- 追加依頼の判断/カード追加ショートカット、変更可能なキー設定を同じ確認版へ追加。全88テスト。確認版だけの更新で公開版/pushには反映しない。
- 機能と確認範囲: VERSION-1.01.md / DESIGN.md / QA.md。配布承認済みとは扱わない。

## 過去の配布：整列ガイド版 / version 9（2026-09-16）

- 同じURL・publicで `succeeded`（2026-09-16 08:38:50 UTC / 17:38:50 JST）。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site/
- 配布コード: `cc393a5d50b80a9cec14f7ce1f507b00211fb0da`。GitHub/Sites mainへpush後、同じHEADの静的資産とmanifestの12ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_026d0e38eef08191aee51827417f0801`。
- Deployment: `appgdep_6aaa5590038081919e476f0a3cdb0641`。
- カード/枠移動で端・中心に6画面px以内で吸着し赤い破線。Altで自由移動。中身の相対位置を保ち、確定/取消で線を消す。74テスト成功、PC実画面・保存復元・取消を確認（QA.md）。
- 匿名HTTP200。公開board-model.mjs/board-view.mjs/board.cssとHTML内全style/script本文がローカルと一致。公開ページ再読込でも既存6カードと新ガイド描画層を確認。公開の本人ノートは移動せず、ドラッグ検証はローカル検証ノートで実施。実スマホ未確認。

## 過去の配布：カード編集改善版 / version 8（2026-09-15）

- 同じURL・publicを維持し、`succeeded`（2026-09-15 07:52:39 UTC / 16:52:39 JST）を確認。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site/
- 配布コード: `1b9adcfc6dbd1fb541a150e09439be03ab3ccdf3`。GitHub/Sitesのmainへpush後、同じHEADから静的資産とmanifestの12ファイルを配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_ee93325eed0c8191a5575db7c3d876de`。
- Deployment: `appgdep_6aa8f93e8e448191a749702b15617320`。
- 「選択中」の文字を削除。PCのダブルクリックで右側の閲覧/編集欄を開き、別カード単クリックで切替。パネル360px幅を予約し、ボードと同時操作。保存形式は維持。
- 69テスト成功。ローカル1280pxで新規カード・編集・保存/再読込・切替・パネル独立スクロール・F2/閉じる、390pxで既存の下部編集欄と背景無効化を確認。共有デモのダブルクリックは25カードを保った読取専用。
- 匿名HTTP200。公開HTML内の全style/script本文とapp.mjs/board-view.mjs/board.cssがローカルと一致（改行正規化。SitesがHTMLへ追加する部分は比較対象外）。公開版でダブルクリックによるパネル表示・選択文字0を実確認。実スマホタッチ・IMEは未確認。

## 過去の配布：初期表示改善版 / version 7（2026-09-15）

- 同じURL・publicを維持し、`succeeded`（2026-09-15 07:37:01 UTC / 16:37:01 JST）を確認。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site/
- 配布コード: `fed254aeaad0003fb2bb7059b4d5e98d4f5c01c9`。GitHub/Sitesへpush後、静的資産とmanifestの12ファイルを同じ状態から配布。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_f3ac7657e53c8191a242483e143603bc`。
- Deployment: `appgdep_6aa8f580fc3081919d861824cbd15384`。
- CSS3本と起動JSを配布HTMLにまとめ、依存6モジュールを先読み。src/index.htmlからNode標準機能だけで生成。CSS/JSの処理と保存形式・共有デモは変更なし。
- 65テスト成功、独立コードレビューPASS。匿名HTTP200・インラインCSS/JSの配布一致を確認。
- 公開デモのFCPは再計測2回で260/220ms。変更前は4744/5420msだが、初期応答時間も変動しており全差分を修正効果とは断定しない。条件と限界はPERFORMANCE.md。
- ローカルPC画面と公開デモ25カード・順送り/逆送りを確認。実スマホ・低速回線は未検証。

## 過去の配布：操作の配置修正版 / version 6（2026-09-14）

- 本人の「公開サイトにも反映する」という返答を受け、同じURL・publicのまま更新。`succeeded`（2026-09-13 15:24:44 UTC、9月14日00:24:44 JST）を確認。
- URL: https://shiko-no-me-notebook.tokkey20.chatgpt.site/
- 配布コード: `145ad76474c0e4307f13ded3ad18e5ec2a3dbe99`。GitHub/Sites両方へpushしてから、同じ静的資産とmanifestの12ファイルを梱包・配布した。
- Sites version: `appgprj_6aa5fdc48f048191aa316118958f2567~appgver_fbbc481ff32081919519fc233ed21178`。
- Deployment: `appgdep_6aa6c02756188191b14a970500076248`。
- 矢印をボード左上・倍率と同じ高さへ、ノート入口を最上部右端・一覧を右側の引き出しへ移動。左下の兄弟追加ボタンだけ削除し、子の追加・保存表示・AI方式・保存形式は維持。サムネイルは未変更。
- 匿名HTTP200、公開JS/CSSの10ファイルがローカルと完全一致。HTMLは配信側のスクリプト付加があるためバイト一致とは扱わず、新しいノート入口と削除済みボタンの不在を確認。
- 62テスト成功・独立コードレビューPASS。今回の実画面・実機は未確認。公開URLへの表示依頼はqueuedで、表示済みとは断定しない。

## ソースのみの保守整理（2026-09-14）

GitHub向けにJavaScriptの整形・コードコメント・保守説明書を追加する更新。
公開サイトは再配布せず、下記v5のまま維持する。
公開版とGitHubの最新ソースは整形・コメントが異なるが、変更した全14モジュールの構文木比較で処理が変わらないことを確認し、61テストが成功した。
HTML・CSS・保存形式・サムネイルは変更していない。

機能追加の最後のコミットは9月13日23:58:26 JSTの `9cda3fd36e2041a8162c5c50b713f8ed34459dbd`、v5配布成功は同日23:59:33 JST。
続く9月14日00:00:09 JSTの `30e29f1c4012696689ea5e23a11469675b3a4dd1` はLAUNCH-STATE.mdとQA.mdのみの記録更新。
今回の保守整理も実際の更新日時で記録し、過去の履歴・日付を書き換えない。

[公式要項](https://progedu.github.io/webappcontest/2026/summer/index.html) に審査期間中のコード変更を禁止しない旨が明記されていることを9月14日に確認した。
これは応募フォームの締切延長や、主催者による受理を示すものではない。

## 過去の配布 — 戻す・やり直す版 / version 5（2026-09-13）

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
