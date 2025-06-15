const CONFIG = {
    // Azure OpenAI設定
    azure: {
        endpoint: 'your url',
        apiKey: 'your key',
        apiVersion: '2025-01-01-preview',
        deploymentName: 'gpt-4.1'
    },
    
    // 事前設定されたプロンプト
    prompts: {
        'general': {
            name: '一般的な画像説明',
            text: 'この画像について詳しく説明してください。何が写っているか、色、形、配置などを含めて説明してください。'
        },
        'business': {
            name: 'ビジネス分析',
            text: 'この画像をビジネスの観点から分析してください。改善点や提案があれば教えてください。'
        },
        'technical': {
            name: '技術的分析',
            text: 'この画像の技術的な側面を分析してください。品質、構成、技術的な特徴について説明してください。'
        },
        'creative': {
            name: 'クリエイティブ分析',
            text: 'この画像のクリエイティブな要素を分析してください。アート的な観点、感情的な印象、美的な特徴について説明してください。'
        },
        'educational': {
            name: '教育的説明',
            text: 'この画像を教育的な観点から説明してください。学習者にとって重要なポイントや教育的価値について説明してください。'
        },
        'accessibility': {
            name: 'アクセシビリティ説明',
            text: 'この画像を視覚に障害のある方のために詳細に説明してください。重要な要素、レイアウト、テキストの内容などを含めて説明してください。'
        },
        'commuter_pass': {
            name: '通勤定期券データ抽出',
            text: `この画像は通勤定期券です。以下の情報を正確に抽出してCSV形式で出力してください：

**重要な指示:**
1. 結果はCSV形式のみで返してください（ヘッダーなし、説明文なし）
2. データが見つからない場合は空欄にしてください
3. 金額は数字のみ抽出してください（円記号なし）
4. 日付形式は指定通りに統一してください

**抽出項目（CSV列順）:**
- 1列目: 乗車駅名
- 2列目: 降車駅名  
- 3列目: 金額（数字のみ、左下の[数字]円から抽出）
- 4列目: 有効期間開始日（「○月○日から」の形式から抽出、YYYYMMDD形式で出力）
- 5列目: 有効期間終了日（YY.MM-DD形式から抽出、YYYYMMDD形式で出力）

**出力例:**
新宿,渋谷,12000,20250401,20250331

文字が不鮮明な場合は類推せず、確実に読み取れる情報のみを出力してください。`
        }
    },
    
    // アプリケーション設定
    app: {
        maxFileSize: 20 * 1024 * 1024, // 20MB
        supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        timeout: 30000 // 30秒
    }
};

// 設定を検証する関数
function validateConfig() {
    const errors = [];
    
    if (!CONFIG.azure.endpoint || CONFIG.azure.endpoint === 'https://your-resource-name.openai.azure.com') {
        errors.push('Azure OpenAI エンドポイントが設定されていません');
    }
    
    if (!CONFIG.azure.apiKey || CONFIG.azure.apiKey === 'your-api-key-here') {
        errors.push('Azure OpenAI APIキーが設定されていません');
    }
    
    if (!CONFIG.azure.deploymentName) {
        errors.push('Azure OpenAI デプロイメント名が設定されていません');
    }
    
    return errors;
}

// 設定をローカルストレージから読み込む関数
function loadConfigFromStorage() {
    const storedConfig = localStorage.getItem('azureOpenAIConfig');
    if (storedConfig) {
        try {
            const parsed = JSON.parse(storedConfig);
            CONFIG.azure = { ...CONFIG.azure, ...parsed };
        } catch (error) {
            console.error('設定の読み込みに失敗しました:', error);
        }
    }
}

// 設定をローカルストレージに保存する関数
function saveConfigToStorage(config) {
    try {
        localStorage.setItem('azureOpenAIConfig', JSON.stringify(config));
    } catch (error) {
        console.error('設定の保存に失敗しました:', error);
    }
}