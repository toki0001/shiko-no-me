import {readFile, writeFile} from 'node:fs/promises';
const descriptions = [
 ['候補を比べる','同じ問いから出た候補を並べて、採用・保留・見送りを選ぶ画面。'],
 ['ボード全体','カードを枝分かれさせて考えを広げる画面。「全体を見る」を押した状態。'],
 ['ボードと右側の編集欄','選んだカードの文章・メモ・判断を右側で編集。ボードも同時に操作できる。'],
 ['比較しながら理由を編集','候補を見比べながら、選んだ案の内容と理由を右側で修正する。'],
 ['判断を持ち帰る','現在の問いと判断理由を文章にまとめ、コピーまたはファイル保存する。'],
 ['新しい問いを作る','問いと、その条件などのメモを入力して別のノートを作る。未入力の状態。'],
 ['ノート一覧と操作メニュー','ノートの切替、表示・整理、書き出し・読み込みなどの操作を選ぶ。表示・整理を展開した状態。'],
 ['AIへの相談','依頼文をコピーし、AIの回答を貼り戻して、採用する案を選ぶ。アプリからの自動送信はない。'],
 ['使い方ガイド','操作と保存の説明。スクロールする説明画面の最初の部分。'],
 ['スマホ幅で候補を比べる','390×844の表示。最初に見える範囲を撮影。下の候補へはスクロールする。実機タッチの検証ではない。'],
 ['スマホ幅の編集欄','390×844でカードの編集を開いた状態。背景は操作できなくなる。'],
 ['分類枠のあるボード','公開用の閲覧専用デモの2/7段階。枠・線・カードが増えた状態。01〜11とは別のノート。'],
];
const cards=await Promise.all(descriptions.map(async([title,description],i)=>{
 const n=String(i+1).padStart(2,'0');
 const data=(await readFile(new URL(n+'.jpg',import.meta.url))).toString('base64');
 const device=i===9||i===10?'スマホ幅':'PC';
 return `<article id="s${n}"><header><h2>画面 ${n}</h2><span>${device}</span></header><button class="shot" aria-label="画面 ${n} を拡大"><img src="data:image/jpeg;base64,${data}" alt="画面 ${n} の実画面" loading="eager"></button><details><summary>この画面の役割を見る</summary><h3>${title}</h3><p>${description}</p></details></article>`;
}));
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>思考の芽 Ver1.01｜画面レビュー12枚</title><style>
*{box-sizing:border-box}body{margin:0;background:#f1f2ef;color:#202822;font:16px/1.7 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:28px}h1{font-size:27px;line-height:1.4;margin:4px 0 12px}p{margin:8px 0;color:#566057}.intro{max-width:850px}.meta{font-size:13px;color:#667269}nav{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}a{color:#285d43}nav a{padding:5px 13px;border:1px solid #cbd4cb;border-radius:5px;background:white;text-decoration:none}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}article{background:white;border:1px solid #d3dbd2;border-radius:9px;overflow:hidden;scroll-margin-top:20px}article header{display:flex;align-items:center;justify-content:space-between;padding:12px 18px}h2{margin:0;font-size:18px}article header span{font-size:13px;color:#687469}.shot{border:0;border-block:1px solid #e1e6df;padding:0;width:100%;height:440px;display:block;background:#e8ece5;cursor:zoom-in}.shot img{display:block;width:100%;height:100%;object-fit:contain}details{padding:12px 18px}summary{cursor:pointer;color:#425548;font-size:14px}h3{font-size:17px;margin:12px 0 4px}dialog{width:96vw;max-width:1500px;height:95vh;border:1px solid #b8c5b7;border-radius:8px;padding:0;background:#f5f6f2}dialog::backdrop{background:#142019c9}.dialogbar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:white;border-bottom:1px solid #d5ded1}.dialogbar button{min-height:42px;padding:7px 18px;font:inherit;border:1px solid #bcc9bb;background:white;border-radius:5px;cursor:pointer}.large{display:block;max-width:100%;height:calc(100% - 68px);width:100%;object-fit:contain}footer{font-size:13px;margin-top:30px;color:#667166}body.overview main{max-width:890px;padding:15px;margin:0}body.overview h1{font-size:20px;margin:0 0 8px}body.overview .intro,body.overview nav,body.overview details,body.overview footer,body.overview .meta{display:none}body.overview .grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}body.overview article header{padding:5px 9px}body.overview h2{font-size:13px}body.overview .shot{height:165px}@media(max-width:700px){main{padding:16px}.grid{grid-template-columns:1fr}.shot{height:auto;min-height:260px;max-height:620px}.shot img{max-height:620px}h1{font-size:23px}}@media print{nav{display:none}article{break-inside:avoid}.shot{height:300px}}
</style></head><body><main><div class="meta">思考の芽 · Ver1.01 確認版 · 実画面12枚</div><h1>画面だけを見て、使い方が想像できるか。</h1><div class="intro"><p>まずは説明を開かず、画像だけを見てください。気になる画面はクリックで拡大できます。あとから「この画面の役割を見る」で答え合わせできます。</p><p>見るポイントは、<strong>何をする画面か／次にどこを押すか／見づらい場所はどこか</strong>。感想は「03の右側が…」のように番号で伝えてください。</p></div><nav aria-label="画面番号">${descriptions.map((_,i)=>{const n=String(i+1).padStart(2,'0');return `<a href="#s${n}">${n}</a>`}).join('')}</nav><section class="grid" aria-label="画面セット">${cards.join('')}</section><footer>01〜09は同じ記入例、10〜11はそのスマホ幅表示、12は閲覧専用デモです。PC配置は幅1280pxを縮小撮影（高さは02〜03が1000px、ほかは1142px）。スマホ幅は390×844px。画面に入る範囲の撮影であり、長い説明やカード一覧の全長ではありません。撮影中にアプリの機能・文章・判断状態を変更していません。公開版への反映もありません。画像はこのHTMLに内蔵されており、サーバー停止後もファイル単体で開けます。</footer></main><dialog aria-label="画像を拡大"><div class="dialogbar"><strong id="large-title"></strong><button id="close">閉じる ×</button></div><img class="large" alt=""></dialog><script>
if(new URLSearchParams(location.search).has('overview'))document.body.classList.add('overview');
const dialog=document.querySelector('dialog'),large=dialog.querySelector('img');let trigger;
document.querySelectorAll('.shot').forEach(button=>button.addEventListener('click',()=>{trigger=button;large.src=button.querySelector('img').src;large.alt=button.querySelector('img').alt;document.querySelector('#large-title').textContent=button.closest('article').querySelector('h2').textContent;dialog.showModal();}));
document.querySelector('#close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>trigger?.focus());
</script></body></html>`;
await writeFile(new URL('index.html',import.meta.url),html);
await writeFile(new URL('README.md',import.meta.url),'# Ver1.01 画面レビュー\n\nindex.html は12枚の実画面を内蔵した単体HTML。番号を先に見せ、画面の説明は折りたたむ。元画像は01.jpg〜12.jpg。01〜09はPC、10〜11はスマホ幅、12は閲覧専用デモ。アプリのコードと公開状態は変更していない。PCは撮影領域の制約から表示幅1280pxを縮小撮影。操作の動き・タッチ・整列ガイドの動的挙動は静止画だけでは検証できない。\n\n再生成: node build-gallery.mjs\n');
console.log('Built self-contained gallery: 12 images');
