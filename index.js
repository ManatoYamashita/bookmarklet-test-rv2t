javascript:(function() {
    // 1. 設定値の定義
    const API_ENDPOINT = 'https://aablnq3wnk.execute-api.ap-northeast-1.amazonaws.com/report-v2t-dev';
    const SK = '20250521095554'; // 今回指定されたソートキー

    // DynamoDBのpkはLambdaのクエリパラメータ`employeeID`で指定されます。
    // 今回のLambda関数はpkでデータを絞り込んでいるため、ブックマークレットが動作するページのURLからpkを推測する必要があります。
    // 例: URLに`?employeeId=m-yamashita`のようなクエリパラメータが含まれている場合
    // もしくは、ブックマークレット実行時にユーザーにpkを入力させるプロンプトを表示することも考えられます。
    // ここでは、現在のURLから`employeeId`を取得する例を示します。
    // もしURLにemployeeIdが含まれない場合は、適宜`pk`の値を指定する必要があります。
    const urlParams = new URLSearchParams(window.location.search);
    const pk = urlParams.get('employeeId') || prompt('データを取得するためのEmployee IDを入力してください:', 'm-yamashita'); // デフォルト値を設定

    if (!pk) {
        alert('Employee IDが指定されていないため処理を中止します。');
        return;
    }

    // 2. APIからデータを取得する関数
    async function fetchData(employeeId) {
        const url = `${API_ENDPOINT}?employeeID=${employeeId}`; // Lambda関数がemployeeIDをクエリパラメータとして受け取るため
        console.log(`Workspaceing data from: ${url}`);
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }

            const data = await response.json();
            console.log('Fetched data:', data);

            // 取得したデータの中から、指定されたSKを持つエントリを探す
            // Lambda関数はpkで絞り込みを行っていますが、今回はSKで特定のエントリを見つける必要があるため、
            // 取得した配列の中からSKが一致するものを探します。
            const targetData = data.find(item => item.sk === SK);

            if (!targetData) {
                alert(`指定されたソートキー (${SK}) に一致するデータが見つかりませんでした。`);
                return null;
            }

            return targetData.meeting_data; // meeting_dataフィールドを返す
        } catch (error) {
            console.error('APIデータの取得中にエラーが発生しました:', error);
            alert('データの取得に失敗しました。詳細はコンソールを確認してください。');
            return null;
        }
    }

    // 3. 取得したデータをフォームフィールドに書き込む関数
    function fillFormFields(meetingData) {
        if (!meetingData) {
            console.warn('meetingDataがnullまたはundefinedのため、フォームフィールドへの書き込みをスキップします。');
            return;
        }

        // DynamoDBのデータ構造に応じてフィールドをマップ
        const fieldMap = {
            // 'cost': 'cost',
            // 'hearing_contents': 'hearing_contents',
            // 'meeting_purpose': 'meeting_purpose',
            // 'other': 'other',
            // 'proposal': 'proposal',
            // 'reaction': 'reaction',
            'meeting_purpose': '日報を入力',
        };

        for (const key in fieldMap) {
            if (meetingData.hasOwnProperty(key)) {
                const placeholderName = fieldMap[key];
                const valueToSet = meetingData[key];

                // inputタグとtextareaタグの両方を検索
                const elements = document.querySelectorAll(`input[placeholder="${placeholderName}"], textarea[placeholder="${placeholderName}"]`);

                if (elements.length > 0) {
                    elements.forEach(element => {
                        // Reactのcontrolled componentに対応するため、イベントを発生させる
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

                        if (element.tagName === 'INPUT') {
                            nativeInputValueSetter.call(element, valueToSet);
                        } else if (element.tagName === 'TEXTAREA') {
                            nativeTextAreaValueSetter.call(element, valueToSet);
                        }

                        // Reactがvalueの変更を検知できるようにイベントを発火
                        const event = new Event('input', { bubbles: true });
                        element.dispatchEvent(event);

                        console.log(`Set ${element.tagName}[placeholder="${placeholderName}"] to: "${valueToSet}"`);
                    });
                } else {
                    console.warn(`Placeholder "${placeholderName}" を持つinputまたはtextarea要素が見つかりませんでした。`);
                }
            } else {
                console.warn(`meetingDataにキー "${key}" が見つかりませんでした。`);
            }
        }
        alert('データの入力が完了しました。');
    }

    // 処理の実行
    (async () => {
        const meetingData = await fetchData(pk);
        if (meetingData) {
            fillFormFields(meetingData);
        }
    })();
})();