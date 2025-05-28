// minify.js

const fs = require('fs');
const path = require('path');

/**
 * JavaScriptコードをMinifyして一行にする関数
 * - コメント（単一行、複数行）を削除
 * - 改行を削除（ただし、特定の場所ではスペースに置換）
 * - 不要な連続する空白を単一の空白に置き換え
 * - 前後の空白をトリム
 * - 必要に応じてセミコロンを挿入
 * @param {string} code - Minifyする元のJavaScriptコード
 * @returns {string} Minifyされた一行のJavaScriptコード
 */
function minifyJavaScript(code) {
  // 1. 複数行コメント /* ... */ を削除
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. 単一行コメント // ... を削除 (文字列内の // は保持)
  //    ただし、文字列リテラル内の // は削除しないように注意
  code = code.replace(/(?<!["'`])\/\/.*$/gm, '');

  // 3. セミコロンの後に続く改行と空白を、セミコロンと単一のスペースに置換
  //    これにより、各ステートメントが確実にセミコロンとスペースで区切られる
  code = code.replace(/;\s*\n\s*/g, '; ');

  // 4. それ以外の改行をスペースに置換
  code = code.replace(/\n/g, ' ');

  // 5. 不要な連続する空白を単一の空白に置き換え
  code = code.replace(/\s{2,}/g, ' ');

  // 6. 特定の構文の前後で安全のためにスペースを挿入
  //    例: `}`の後に続く`(function()`のような場合
  code = code.replace(/\}\(/g, '} (');
  code = code.replace(/\)\(/g, ') (');

  // 7. コードの前後の空白をトリム
  code = code.trim();

  // 8. 最後のセミコロンが欠落している可能性を考慮して、末尾に強制的に追加
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
  // これはcode.js自体が `javascript:` で始まることを考慮するため
  originalCode = originalCode.replace(/^javascript:\s*/, '');

  // JavaScriptコードをMinify
  const minifiedCode = minifyJavaScript(originalCode);

  // Minifyされたコードを bookmarklet.js に書き込む
  // `javascript:` プレフィックスを付けて書き込むことで、そのままブックマークレットとして使える形式にする
  // ここで初めて `javascript:` を追加する
  fs.writeFileSync(outputFilePath, `javascript:${minifiedCode}`, 'utf8');

  console.log(`✅ ${inputFileName} をMinifyし、${outputFileName} に出力しました。`);
  console.log(`出力パス: ${outputFilePath}`);

} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`エラー: 入力ファイルが見つかりません - ${inputFileName}`);
  } else {
    console.error(`ファイル処理中にエラーが発生しました: ${error.message}`);
  }
  process.exit(1); // エラー終了
}