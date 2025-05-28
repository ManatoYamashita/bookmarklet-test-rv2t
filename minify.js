// minify.js

const fs = require('fs');
const path = require('path');

/**
 * JavaScriptコードをMinifyして一行にする関数
 * - コメント（複数行のみ）を削除
 * - 改行を削除（ただし、特定の場所ではスペースに置換）
 * - 不要な連続する空白を単一の空白に置き換え
 * - 前後の空白をトリム
 * - 必要に応じてセミコロンやスペースを挿入
 * @param {string} code - Minifyする元のJavaScriptコード
 * @returns {string} Minifyされた一行のJavaScriptコード
 */
function minifyJavaScript(code) {
  // 1. 複数行コメント /* ... */ を削除
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. 単一行コメント // ... を削除 (この行をコメントアウト/削除)
  // code = code.replace(/(?<!["'`])\/\/.*$/gm, ''); // Safariでの誤作動の原因の可能性あり

  // 3. すべての改行を単一スペースに置換
  code = code.replace(/\n/g, ' ');

  // 4. セミコロンの直後にスペースがない場合、スペースを挿入
  //    例: `foo();bar` => `foo(); bar`
  code = code.replace(/;(\S)/g, '; $1');

  // 5. `{` `}` `(` `)` `[` `]` の直後にスペースがない場合、スペースを挿入
  code = code.replace(/\}\(/g, '} ('); // `}`の後の`(`
  code = code.replace(/\)\(/g, ') ('); // `)`の後の`(`

  // 6. 連続する空白を単一の空白に置き換え
  code = code.replace(/\s{2,}/g, ' ');

  // 7. `var`, `function`, `return` などのキーワードの直前にスペースを挿入
  code = code.replace(/([^\s;])(var|function|return|if|for|while|do|switch|try|catch|finally|throw|new)/g, '$1 $2');

  // 8. コードの前後の空白をトリム
  code = code.replace(/^\s+|\s+$/g, ''); // .trim()の代わりに明示的に

  // 9. 最後のセミコロンが欠落している可能性を考慮して、末尾に強制的に追加
  if (!code.endsWith(';')) {
      code += ';';
  }

  return code;
}

// コマンドライン引数から入力ファイル名を取得
const inputFileName = process.argv[2];
// 出力ファイル名は固定で 'bookmarklet.js' とする
const outputFileName = 'bookmarklet.js';

if (!inputFileName) {
  console.error('使用方法: node minify.js <入力ファイル名>');
  process.exit(1); // エラー終了
}

// 入力ファイルの絶対パスを生成
const inputFilePath = path.resolve(process.cwd(), inputFileName);
// 出力ファイルの絶対パスを生成 (入力ファイルと同じディレクトリ)
const outputFilePath = path.resolve(process.cwd(), outputFileName);

try {
  // ファイルの内容を同期的に読み込む
  let originalCode = fs.readFileSync(inputFilePath, 'utf8');

  // `javascript:` プレフィックスが既に存在する場合は削除
  originalCode = originalCode.replace(/^javascript:\s*/, '');

  // JavaScriptコードをMinify
  const minifiedCode = minifyJavaScript(originalCode);

  // Minifyされたコードを bookmarklet.js に書き込む
  // `javascript:` プレフィックスを付けて書き込む
  fs.writeFileSync(outputFilePath, `javascript:${minifiedCode}`, 'utf8');

  console.log(`✅ <span class="math-inline">\{inputFileName\} をMinifyし、</span>{outputFileName} に出力しました。`);
  console.log(`出力パス: ${outputFilePath}`);

} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`エラー: 入力ファイルが見つかりません - ${inputFileName}`);
  } else {
    console.error(`ファイル処理中にエラーが発生しました: ${error.message}`);
  }
  process.exit(1); // エラー終了
}