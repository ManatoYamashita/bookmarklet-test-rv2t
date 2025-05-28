// minify.js

const fs = require('fs');
const path = require('path');

/**
 * JavaScriptコードをMinifyして一行にする関数
 * - コメント（複数行、単一行）を削除
 * - 改行を削除
 * - 不要な連続する空白を単一の空白に置き換え
 * - 前後の空白をトリム
 * - 必要に応じてセミコロンやスペースを挿入
 * @param {string} code - Minifyする元のJavaScriptコード
 * @returns {string} Minifyされた一行のJavaScriptコード
 */
function minifyJavaScript(code) {
  // 1. 複数行コメント /* ... */ を削除
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. 特定の末尾コメント行を削除 (code.jsファイル固有の対応。必要に応じて調整)
  code = code.replace(/^\s*\/\/minifiered.*$/gm, '');
  code = code.replace(/^\s*\/\/ javascript:.*$/gm, '');

  // 3. 単一行コメント // を削除 (より包括的な方法)
  //    行頭のスペースや、コードの途中にある // コメントも削除します。
  //    ただし、文字列リテラル内の // は保護されます。
  //    この正規表現は、単一行コメントを安全に削除するために、より複雑なパターンを使用します。
  //    これは、文字列リテラルをまず「一時的なプレースホルダー」に置き換え、コメント削除後に元に戻す方法の簡易版です。
  //    よりロバストな方法として、コメントと文字列を同時にマッチングし、コメントだけを削除します。
  //    ここでは、文字列リテラルとコメントを非キャプチャグループでマッチさせ、コメント部分だけを空文字に置き換えます。
  //    これにより、`https://` のようなURL内の `//` は保護されます。
  code = code.replace(/("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)|(\/\/.*$)/gm, (match, p1, p2, p3, p4) => {
    if (p1 || p2 || p3) { // 文字列リテラルの場合、そのまま残す
      return match;
    }
    return ''; // コメントの場合、削除する
  });

  // 4. すべての改行を単一スペースに置換
  code = code.replace(/\n/g, ' ');

  // 5. セミコロンの直後にスペースがない場合、スペースを挿入
  code = code.replace(/;(\S)/g, '; $1');

  // 6. `{` `}` `(` `)` `[` `]` の直後にスペースがない場合、スペースを挿入
  code = code.replace(/\}\(/g, '} (');
  code = code.replace(/\)\(/g, ') (');

  // 7. 連続する空白を単一の空白に置き換え
  code = code.replace(/\s{2,}/g, ' ');

  // 8. `var`, `function`, `return` などのキーワードの直前にスペースを挿入
  code = code.replace(/([^\s;])(var|function|return|if|for|while|do|switch|try|catch|finally|throw|new)/g, '$1 $2');

  // 9. コードの前後の空白をトリム
  code = code.trim();

  // 10. 最後のセミコロンが欠落している可能性を考慮して、末尾に強制的に追加
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