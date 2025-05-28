javascript:(function() {
    // ブックマークレットが実行されたことを示すアラート
    alert('Hello from Bookmarklet!');

    // 現在のページのタイトルとURLをコンソールに表示
    console.log('Page Title:', document.title);
    console.log('Page URL:', window.location.href);

    // 指定のURLにリダイレクト
    window.location.href = 'https://manapuraza.com';
})();