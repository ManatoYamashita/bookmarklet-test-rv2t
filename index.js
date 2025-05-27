javascript:(function() {
    // 1. 設定値の定義
    const API_ENDPOINT = 'https://aablnq3wnk.execute-api.ap-northeast-1.amazonaws.com/report-v2t-dev';
    const SK = '20250521095554'; // 今回指定されたソートキー

    // デバッグモードの設定（本番では false にする）
    const DEBUG_MODE = true;
    
    // デバッグ用アラート関数
    function debugAlert(message, data = null) {
        if (DEBUG_MODE) {
            let alertMessage = `[DEBUG] ${message}`;
            if (data) {
                alertMessage += `\n詳細: ${JSON.stringify(data, null, 2)}`;
            }
            alert(alertMessage);
            console.log(`[DEBUG] ${message}`, data);
        }
    }

    debugAlert('ブックマークレット開始', { API_ENDPOINT, SK });

    // DynamoDBのpkはLambdaのクエリパラメータ`employeeID`で指定されます。
    // 今回のLambda関数はpkでデータを絞り込んでいるため、ブックマークレットが動作するページのURLからpkを推測する必要があります。
    const urlParams = new URLSearchParams(window.location.search);
    const employeeIdFromUrl = urlParams.get('employeeId');
    
    debugAlert('URL解析結果', { 
        currentUrl: window.location.href,
        employeeIdFromUrl: employeeIdFromUrl 
    });

    const pk = employeeIdFromUrl || prompt('データを取得するためのEmployee IDを入力してください:', 'm-yamashita');

    if (!pk) {
        alert('Employee IDが指定されていないため処理を中止します。');
        return;
    }

    debugAlert('使用するEmployee ID', { pk });

    // 2. APIからデータを取得する関数
    async function fetchData(employeeId) {
        const url = `${API_ENDPOINT}?employeeID=${employeeId}`;
        
        debugAlert('API呼び出し開始', { url });
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            debugAlert('API応答受信', { 
                status: response.status, 
                statusText: response.statusText,
                ok: response.ok 
            });

            if (!response.ok) {
                const errorText = await response.text();
                debugAlert('API エラー応答', { errorText });
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }

            const data = await response.json();
            debugAlert('APIデータ取得成功', { 
                dataType: typeof data,
                isArray: Array.isArray(data),
                dataLength: Array.isArray(data) ? data.length : 'N/A',
                firstItem: Array.isArray(data) && data.length > 0 ? data[0] : data
            });

            // 取得したデータの中から、指定されたSKを持つエントリを探す
            const targetData = data.find(item => item.sk === SK);

            if (!targetData) {
                debugAlert('データ検索結果', { 
                    searchedSK: SK,
                    availableSKs: data.map(item => item.sk),
                    found: false
                });
                alert(`指定されたソートキー (${SK}) に一致するデータが見つかりませんでした。`);
                return null;
            }

            debugAlert('ターゲットデータ発見', { 
                targetData,
                meetingData: targetData.meeting_data 
            });

            return targetData.meeting_data; // meeting_dataフィールドを返す
        } catch (error) {
            debugAlert('API呼び出し例外', { 
                errorMessage: error.message,
                errorStack: error.stack 
            });
            console.error('APIデータの取得中にエラーが発生しました:', error);
            alert(`データの取得に失敗しました。\nエラー: ${error.message}`);
            return null;
        }
    }

    // 3. 取得したデータをフォームフィールドに書き込む関数
    function fillFormFields(meetingData) {
        if (!meetingData) {
            debugAlert('meetingDataがnullまたはundefined', { meetingData });
            console.warn('meetingDataがnullまたはundefinedのため、フォームフィールドへの書き込みをスキップします。');
            return;
        }

        debugAlert('フォーム入力開始', { meetingData });

        // DynamoDBのデータ構造に応じてフィールドをマップ
        const fieldMap = {
            'meeting_purpose': '日報を入力',
            // 他のフィールドもデバッグ時に追加可能
            // 'cost': 'cost',
            // 'hearing_contents': 'hearing_contents',
            // 'other': 'other',
            // 'proposal': 'proposal',
            // 'reaction': 'reaction',
        };

        debugAlert('フィールドマップ', { fieldMap });

        let successCount = 0;
        let failCount = 0;
        const results = [];

        for (const key in fieldMap) {
            if (meetingData.hasOwnProperty(key)) {
                const placeholderName = fieldMap[key];
                const valueToSet = meetingData[key];

                debugAlert(`フィールド処理中`, { 
                    key, 
                    placeholderName, 
                    valueToSet 
                });

                // inputタグとtextareaタグの両方を検索
                const elements = document.querySelectorAll(`input[placeholder="${placeholderName}"], textarea[placeholder="${placeholderName}"]`);

                debugAlert('要素検索結果', { 
                    placeholderName,
                    foundElements: elements.length,
                    elementTypes: Array.from(elements).map(el => el.tagName)
                });

                if (elements.length > 0) {
                    elements.forEach((element, index) => {
                        try {
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

                            successCount++;
                            results.push(`✅ ${element.tagName}[placeholder="${placeholderName}"] に "${valueToSet}" を設定`);
                            
                            debugAlert(`要素への入力成功`, { 
                                elementIndex: index,
                                tagName: element.tagName,
                                placeholderName,
                                valueToSet
                            });

                        } catch (elementError) {
                            failCount++;
                            results.push(`❌ ${element.tagName}[placeholder="${placeholderName}"] の設定に失敗: ${elementError.message}`);
                            
                            debugAlert(`要素への入力失敗`, { 
                                elementIndex: index,
                                error: elementError.message
                            });
                        }
                    });
                } else {
                    failCount++;
                    results.push(`❌ Placeholder "${placeholderName}" を持つ要素が見つかりませんでした`);
                    
                    debugAlert('要素が見つからない', { 
                        placeholderName,
                        availablePlaceholders: Array.from(document.querySelectorAll('input[placeholder], textarea[placeholder]')).map(el => el.placeholder)
                    });
                }
            } else {
                debugAlert('meetingDataにキーが存在しない', { 
                    missingKey: key,
                    availableKeys: Object.keys(meetingData)
                });
                results.push(`⚠️ meetingDataにキー "${key}" が見つかりませんでした`);
            }
        }

        // 最終結果の表示
        const summaryMessage = `データ入力完了\n成功: ${successCount}件\n失敗: ${failCount}件\n\n詳細:\n${results.join('\n')}`;
        alert(summaryMessage);
        
        debugAlert('フォーム入力完了', { 
            successCount, 
            failCount, 
            results 
        });
    }

    // 4. 処理の実行
    (async () => {
        try {
            debugAlert('メイン処理開始');
            
            const meetingData = await fetchData(pk);
            if (meetingData) {
                fillFormFields(meetingData);
            } else {
                alert('meetingDataが取得できませんでした。処理を終了します。');
            }
            
            debugAlert('メイン処理完了');
        } catch (mainError) {
            debugAlert('メイン処理で例外発生', { 
                error: mainError.message,
                stack: mainError.stack 
            });
            alert(`処理中に予期しないエラーが発生しました: ${mainError.message}`);
        }
    })();
})();