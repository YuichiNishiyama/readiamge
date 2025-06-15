class ImageAnalyzer {
    constructor() {
        this.selectedImage = null;
        this.selectedPrompt = '';
        this.initializeApp();
    }

    initializeApp() {
        // 設定を読み込み
        loadConfigFromStorage();
        
        // DOM要素を取得
        this.elements = {
            imageInput: document.getElementById('imageInput'),
            imagePreview: document.getElementById('imagePreview'),
            previewImg: document.getElementById('previewImg'),
            promptSelect: document.getElementById('promptSelect'),
            customPrompt: document.getElementById('customPrompt'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            loading: document.getElementById('loading'),
            resultSection: document.getElementById('resultSection'),
            resultContent: document.getElementById('resultContent'),
            copyBtn: document.getElementById('copyBtn')
        };

        // イベントリスナーを設定
        this.setupEventListeners();
        
        // プロンプト選択肢を設定
        this.setupPromptOptions();
        
        // 設定チェック
        this.checkConfiguration();
    }

    setupEventListeners() {
        // 画像ファイル選択
        this.elements.imageInput.addEventListener('change', (e) => {
            this.handleImageSelect(e);
        });

        // プロンプト選択
        this.elements.promptSelect.addEventListener('change', (e) => {
            this.selectedPrompt = e.target.value;
            this.updateAnalyzeButton();
        });

        // 解析ボタン
        this.elements.analyzeBtn.addEventListener('click', () => {
            this.analyzeImage();
        });

        // コピーボタン
        this.elements.copyBtn.addEventListener('click', () => {
            this.copyResult();
        });

        // ドラッグ&ドロップ
        this.setupDragAndDrop();
    }

    setupPromptOptions() {
        // プロンプト選択肢を追加
        Object.keys(CONFIG.prompts).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = CONFIG.prompts[key].name;
            this.elements.promptSelect.appendChild(option);
        });
    }

    setupDragAndDrop() {
        const uploadSection = document.querySelector('.upload-section');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadSection.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadSection.addEventListener(eventName, () => {
                uploadSection.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadSection.addEventListener(eventName, () => {
                uploadSection.classList.remove('drag-over');
            }, false);
        });

        uploadSection.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageFile(files[0]);
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleImageSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleImageFile(file);
        }
    }

    handleImageFile(file) {
        // ファイルサイズチェック
        if (file.size > CONFIG.app.maxFileSize) {
            alert(`ファイルサイズが制限を超えています。最大${CONFIG.app.maxFileSize / 1024 / 1024}MBまでです。`);
            return;
        }

        // ファイル形式チェック
        if (!CONFIG.app.supportedFormats.includes(file.type)) {
            alert('サポートされていないファイル形式です。JPEG、PNG、GIF、WebPファイルを選択してください。');
            return;
        }

        this.selectedImage = file;
        this.displayImagePreview(file);
        this.updateAnalyzeButton();
    }

    displayImagePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.elements.previewImg.src = e.target.result;
            this.elements.imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    updateAnalyzeButton() {
        const hasImage = this.selectedImage !== null;
        const hasPrompt = this.selectedPrompt !== '' || this.elements.customPrompt.value.trim() !== '';
        
        this.elements.analyzeBtn.disabled = !(hasImage && hasPrompt);
    }

    async analyzeImage() {
        if (!this.selectedImage) {
            alert('画像を選択してください。');
            return;
        }

        const prompt = this.getSelectedPrompt();
        if (!prompt) {
            alert('プロンプトを選択するか、カスタムプロンプトを入力してください。');
            return;
        }

        this.showLoading(true);
        this.elements.resultSection.style.display = 'none';

        try {
            const base64Image = await this.convertImageToBase64(this.selectedImage);
            const result = await this.callAzureOpenAI(prompt, base64Image);
            this.displayResult(result);
        } catch (error) {
            console.error('画像解析エラー:', error);
            alert('画像解析中にエラーが発生しました: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    getSelectedPrompt() {
        const customPrompt = this.elements.customPrompt.value.trim();
        if (customPrompt) {
            return customPrompt;
        }
        
        if (this.selectedPrompt && CONFIG.prompts[this.selectedPrompt]) {
            return CONFIG.prompts[this.selectedPrompt].text;
        }
        
        return '';
    }

    convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async callAzureOpenAI(prompt, base64Image) {
        // エンドポイントがフルURLかベースURLかを判定
        let url;
        if (CONFIG.azure.endpoint.includes('/chat/completions')) {
            // フルURLの場合はそのまま使用
            url = CONFIG.azure.endpoint;
        } else {
            // ベースURLの場合は従来通り組み立て
            url = `${CONFIG.azure.endpoint}/openai/deployments/${CONFIG.azure.deploymentName}/chat/completions?api-version=${CONFIG.azure.apiVersion}`;
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'api-key': CONFIG.azure.apiKey
        };

        const body = {
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${this.selectedImage.type};base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    displayResult(result) {
        this.elements.resultContent.textContent = result;
        this.elements.resultSection.style.display = 'block';
        this.elements.resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    copyResult() {
        const result = this.elements.resultContent.textContent;
        navigator.clipboard.writeText(result).then(() => {
            const originalText = this.elements.copyBtn.textContent;
            this.elements.copyBtn.textContent = 'コピー完了!';
            setTimeout(() => {
                this.elements.copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('コピーに失敗しました:', err);
            alert('結果をコピーできませんでした。');
        });
    }

    showLoading(show) {
        this.elements.loading.style.display = show ? 'flex' : 'none';
        this.elements.analyzeBtn.disabled = show;
    }

    checkConfiguration() {
        const errors = validateConfig();
        if (errors.length > 0) {
            console.warn('設定エラー:', errors);
            this.showConfigurationHelp();
        }
    }

    showConfigurationHelp() {
        const helpDiv = document.createElement('div');
        helpDiv.className = 'config-help';
        helpDiv.innerHTML = `
            <div class="config-help-content">
                <h3>設定が必要です</h3>
                <p>Azure OpenAI Serviceを使用するには、以下の設定が必要です：</p>
                <ul>
                    <li>config.js ファイルでエンドポイントとAPIキーを設定してください</li>
                    <li>デプロイメント名を確認してください</li>
                </ul>
                <button onclick="this.parentElement.parentElement.remove()">閉じる</button>
            </div>
        `;
        document.body.appendChild(helpDiv);
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    window.imageAnalyzer = new ImageAnalyzer();
});

// プロンプト選択の変更を監視
document.addEventListener('change', (e) => {
    if (e.target.id === 'promptSelect' || e.target.id === 'customPrompt') {
        window.imageAnalyzer.updateAnalyzeButton();
    }
});

// カスタムプロンプトの入力を監視
document.addEventListener('input', (e) => {
    if (e.target.id === 'customPrompt') {
        window.imageAnalyzer.updateAnalyzeButton();
    }
});