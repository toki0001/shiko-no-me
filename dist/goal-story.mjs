import { addNode, createNotebook, getNode, validateNotebook } from './model.mjs';
import { createFrame, initializeBoard, syncFrameMembership } from './board-model.mjs';

export const GOAL_STORY_SOURCE_URL = 'https://harada-educate.jp/archives/gro_with_news/2048/';

// Reuse the six shared palette colors and two established story swatches.
const FRAME_COLORS = [
  '#4f7d62',
  '#527ca6',
  '#aa783e',
  '#96649d',
  '#b66058',
  '#637078',
  '#aa6756',
  '#698387',
];

const GOAL = 'ドラフト一位指名を8球団から受けたい';

const CATEGORIES = [
  {
    title: 'コントロール',
    note: '公式記事で「基礎思考」の一つとして紹介される項目。下の行動例はこのデモ用の再構成です。',
    actions: [
      ['一球ごとに狙いを決めて投げる', ''],
      ['狙った場所へ届いた球の数を数える', ''],
      ['外れた方向をマス目に書き込む', ''],
      ['捕手に受けやすかった球を尋ねる', ''],
      ['ブルペン映像で体の向きを見比べる', '同じ角度から撮った映像を並べて見る。'],
      ['制球が乱れた場面を一つ振り返る', 'どんな状況だったかを指導者と確認する。'],
      ['試合で先に使うコースを考える', '打者やカウントを想定し、狙いを一つ選ぶ。'],
      ['同じ場所から狙った時の違いを見る', '練習ごとに一つの条件をそろえて比べる。'],
    ],
  },
  {
    title: 'キレ',
    note: '公式記事で「基礎思考」の一つとして紹介される項目。技術の答えを決めつけず、指導者と観察する例にしています。',
    actions: [
      ['指導者に「キレ」の見方を聞く', 'どこに注目するか、まず自分の理解を確かめる。'],
      ['スローモーション映像で球の回転を見る', '気づいた点を指導者とすり合わせる。'],
      ['同じカメラ位置でリリース点を比べる', '撮影位置をそろえて違いを見つける。'],
      ['捕手に球の見え方を尋ねる', '受けた時の印象を具体的に聞く。'],
      ['観察したい一球を決めて撮影する', '一度にいくつも確かめず、見る対象を絞る。'],
      ['手応えのあった球と準備を見比べる', '投げる直前までの流れを振り返る。'],
      ['動画を見ながら気づきを話し合う', '自分以外の見方も聞いて、理解を深める。'],
      ['次の練習で同じ狙いを試してみる', '前回との違いを一つ確かめる。'],
    ],
  },
  {
    title: '変化球',
    note: '公式記事で「基礎思考」の一つとして紹介される項目。球種や練習内容は指導者と確かめる例にしています。',
    actions: [
      ['球種ごとに使いたい場面を分ける', '打者やカウントを思い浮かべて考える。'],
      ['指導者に握り方のポイントを教わる', '教わった内容を自分の言葉で言い直す。'],
      ['捕手に受けた時の軌道の印象を聞く', '自分では分からない見え方を確かめる。'],
      ['一つの球種を映像で追ってみる', 'どこで変化が見えるかを観察する。'],
      ['一打席を題材に配球を考える', '指導者と状況を整理して球種を選ぶ。'],
      ['変化が見えやすい映像を並べる', '同じ位置から撮ったものを比べる。'],
      ['練習で確かめる球種を一つ選ぶ', 'その日に見るポイントを決めてから始める。'],
      ['選んだ球種と打者の反応を振り返る', 'ねらいと結果を分けて考える。'],
    ],
  },
  {
    title: '160キロ',
    note: '公式記事にある基礎思考の項目です。速度を上げる方法は示さず、計測の見方や指導者への相談を例にしています。',
    actions: [
      ['同じ計測器で出た数値を並べる', '測り方が同じ記録を選んで比べる。'],
      ['スピードガンの測り方を確かめる', '表示された数字の意味を指導者に教わる。'],
      ['球速と狙ったコースの両方を見る', '数字だけを目標にせず、投球全体を確かめる。'],
      ['測定条件が違う記録に印をつける', '単純比較できない数値を区別する。'],
      ['リリース位置を映像で見比べる', '同じ角度の映像を使って観察する。'],
      ['速度の数字と手応えが違う球を探す', '数字では説明できない点を指導者と考える。'],
      ['一週間の計測結果の流れを見る', '一回ごとの上下ではなく全体の傾向を確かめる。'],
      ['フォームや練習内容を変える前に相談する', '自分だけで大きく変えず、指導者と決める。'],
    ],
  },
  {
    title: '運',
    note: '公式記事にある基礎思考の項目です。運を保証する方法ではなく、周りとの関わりや日々の気づきを考える例です。',
    actions: [
      ['集合前に練習場所の決まりを確かめる', '共有する場所の使い方を先に把握する。'],
      ['助けてもらった人へお礼を伝える', '何をしてもらったかを添えて伝える。'],
      ['仲間のよい準備を見つけて声をかける', '参考になった行動を具体的に伝える。'],
      ['集合や連絡の約束を守る', '遅れそうな時は早めに連絡する。'],
      ['チームの共有物の扱い方を確認する', '使ったものを決められた場所に戻す。'],
      ['試合後に相手や運営の人へ礼をする', '結果に関わらず感謝を示す。'],
      ['仲間が困っていたらできることを尋ねる', '勝手に決めず、必要な手伝いを聞く。'],
      ['一日を振り返り、よかった出来事を一つ見つける', '小さな助けや偶然にも目を向ける。'],
    ],
  },
  {
    title: '人間性',
    note: '下の8項目は、公式記事が人間性を高める行動例として列挙する内容です。記事に載る例であり、本人の原表全体を復元したものではありません。',
    officialActions: true,
    actions: [
      ['ゴミ拾い', '公式記事に掲載されている行動例。'],
      ['部屋掃除', '公式記事に掲載されている行動例。'],
      ['審判さんへの態度', '公式記事に掲載されている行動例。'],
      ['本を読む', '公式記事に掲載されている行動例。'],
      ['応援される人間になる', '公式記事に掲載されている行動例。'],
      ['プラス思考', '公式記事に掲載されている行動例。'],
      ['道具を大切に使う', '公式記事に掲載されている行動例。'],
      ['あいさつ', '公式記事に掲載されている行動例。'],
    ],
  },
  {
    title: 'メンタル',
    note: '公式記事で「基礎思考」の一つとして紹介される項目。気持ちの扱いを決めつけず、自分の振り返りと周囲への相談を例にしています。',
    actions: [
      ['試合前に自分へかける一言を決める', '短い合図の言葉を用意しておく。'],
      ['緊張しやすい場面を監督に共有する', '試合前に相談しやすい状態を作る。'],
      ['ミスの後に次のプレーで見る場所を決める', '終わったプレーから、次の動きへ意識を移す。'],
      ['勝敗以外に達成したい目標を一つ選ぶ', '準備や判断など、自分で取り組める目標にする。'],
      ['試合前の準備の順番を決めておく', 'いつも行うことを同じ順番で確かめる。'],
      ['落ち着きを取り戻せた場面を探す', 'どんなきっかけがあったか振り返る。'],
      ['試合から学んだことを仲間と話す', 'うまくいった判断と次に試すことを共有する。'],
      ['不安なことを抱えず周囲へ伝える', '相談相手をあらかじめ決めておく。'],
    ],
  },
  {
    title: '体づくり',
    note: '公式記事で「基礎思考」の一つとして紹介される項目。食事や練習量などの指示はせず、体調の記録と指導者・専門家への相談を例にしています。',
    actions: [
      ['使う道具を前日に点検する', '不具合があれば練習前に伝える。'],
      ['スパイクや用具の不具合を早めに伝える', '自分で直す前に指導者へ相談する。'],
      ['教わった準備の流れを確かめる', '練習前に必要な準備を順番に確認する。'],
      ['体調の変化があれば指導者に伝える', '体の異変を一人で抱えない。'],
      ['休養日や練習量を指導者と相談する', '負荷や休み方を自分だけで決めない。'],
      ['睡眠や食事の悩みを保護者に相談する', '健康については保護者や専門家にも相談する。'],
      ['練習後に道具を片付ける', 'チーム施設の決まりに沿って元の場所へ戻す。'],
      ['練習予定に合わせて道具を準備する', '忘れ物やサイズの確認を早めに済ませる。'],
    ],
  },
];

// Each frame is a readable 3x3 branch: its category in the center and eight actions around it.
// The UI can use labels/groups for its separate compact goal-plus-eight overview.
const ACTION_SLOTS = [
  [-1, -1, 'left'],
  [0, -1, 'top'],
  [1, -1, 'right'],
  [-1, 0, 'left'],
  [1, 0, 'right'],
  [-1, 1, 'left'],
  [0, 1, 'bottom'],
  [1, 1, 'right'],
];
const CELL = Object.freeze({ width: 224, height: 116, gapX: 72, gapY: 64 });
const TILE = Object.freeze({ x: 620, y: -620, gapX: 920, gapY: 612 });

export function createGoalStory() {
  const notebook = createNotebook(
    GOAL,
    `原田教育研究所の公式解説は、大谷翔平選手が高校時代に「ドラフト一位指名を8球団から受けたい」という目標を立てたと紹介しています。中心目標と8要素は同記事を参照した学習用再構成です。「人間性」の8行動だけは記事に載る例を転記し、ほかの56行動はこのデモ用に作成しました。本人の原表全体を復元・転載したものではありません。出典: ${GOAL_STORY_SOURCE_URL}`,
  );
  const root = getNode(notebook, notebook.rootId);
  root.position = { x: 0, y: 0 };
  root.state = 'growing';
  const steps = [notebook.rootId];
  const groups = [];

  CATEGORIES.forEach((category, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const tileX = TILE.x + column * TILE.gapX;
    const tileY = TILE.y + row * TILE.gapY;
    const color = FRAME_COLORS[index];
    const categoryNode = addNode(notebook, notebook.rootId, category.title, category.note);
    categoryNode.position = {
      x: tileX + CELL.width + CELL.gapX,
      y: tileY + CELL.height + CELL.gapY,
    };
    categoryNode.lineColor = color;
    categoryNode.branchSide = 'right';
    categoryNode.state = 'growing';
    steps.push(categoryNode.id);

    const memberIds = [categoryNode.id];
    const actionIds = [];
    category.actions.forEach(([title, note], actionIndex) => {
      const [columnOffset, rowOffset, side] = ACTION_SLOTS[actionIndex];
      const action = addNode(notebook, categoryNode.id, title, note, category.officialActions ? 'human' : 'ai');
      action.position = {
        x: categoryNode.position.x + columnOffset * (CELL.width + CELL.gapX),
        y: categoryNode.position.y + rowOffset * (CELL.height + CELL.gapY),
      };
      action.branchSide = side;
      action.lineColor = color;
      action.state = 'growing';
      memberIds.push(action.id);
      actionIds.push(action.id);
    });

    const frame = createFrame(notebook, memberIds, `${index + 1}. ${category.title}`);
    frame.color = color;
    groups.push({ label: category.title, headId: categoryNode.id, actionIds, frameId: frame.id });
  });

  // Source is per-card: official names and the eight published humanity examples are human;
  // the 56 illustrative action cards are marked as AI-authored.
  initializeBoard(notebook);
  syncFrameMembership(notebook);
  validateNotebook(notebook);

  const description = '大谷翔平選手の目標達成シート「オープンウィンドウ64」の型を参考にした学習用再構成。行動例は一部の公式掲載例を除き、このデモ用に作成したもので、本人の原表全体の転載ではありません。';
  return {
    notebook,
    steps,
    kind: 'goal',
    title: '目標を8つの要素に分けて、行動まで広げる',
    labels: CATEGORIES.map((category) => category.title),
    description,
    sourceUrl: GOAL_STORY_SOURCE_URL,
    groups,
  };
}
