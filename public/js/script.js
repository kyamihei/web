document.addEventListener('DOMContentLoaded', () => {
    // 要素の取得
    const streamsContainer = document.querySelector('.streams-container');
    const layoutButtons = document.querySelectorAll('.layout-controls button');
    const loadButtons = document.querySelectorAll('.load-stream');
    const menuToggle = document.getElementById('menu-toggle');
    const closeMenu = document.getElementById('close-menu');
    const streamMenu = document.getElementById('stream-menu');
    const addStreamButton = document.getElementById('add-stream');
    
    // 現在表示されている配信入力フィールドの数
    let visibleStreamInputs = 1;
    
    // 状態管理
    let currentState = {
        layout: 'layout-2x2',
        streams: {}
    };

    // URLからステートを復元
    function loadStateFromURL() {
        const params = new URLSearchParams(window.location.search);
        const stateParam = params.get('state');
        if (stateParam) {
            try {
                const decodedState = JSON.parse(atob(stateParam));
                currentState = decodedState;
                applyState(currentState);
            } catch (e) {
                console.error('Failed to load state from URL:', e);
            }
        }
    }

    // ステートをURLに保存
    function saveStateToURL() {
        const stateString = btoa(JSON.stringify(currentState));
        const newURL = `${window.location.pathname}?state=${stateString}`;
        window.history.pushState({}, '', newURL);
    }

    // ステートを適用
    function applyState(state) {
        // レイアウトを適用
        document.getElementById(state.layout).click();

        // ストリームを読み込み
        Object.entries(state.streams).forEach(([streamId, streamData]) => {
            const platformSelect = document.getElementById(`platform-${streamId}`);
            const channelInput = document.getElementById(`channel-${streamId}`);
            
            if (platformSelect && channelInput) {
                platformSelect.value = streamData.platform;
                channelInput.value = streamData.channelId;
                loadStream(streamId, streamData.platform, streamData.channelId);
            }
        });
    }

    // インラインURL入力の実装
    function initializeStreamPlayers() {
        document.querySelectorAll('.stream-player').forEach(player => {
            const placeholder = player.querySelector('.placeholder');
            if (placeholder) {
                placeholder.addEventListener('click', () => {
                    const streamId = player.id.split('-')[1];
                    createInlineUrlInput(player, streamId);
                });
            }
        });
    }

    function createInlineUrlInput(player, streamId) {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'inline-url-input';
        
        const platformSelect = document.createElement('select');
        platformSelect.innerHTML = `
            <option value="twitch">Twitch</option>
            <option value="youtube">YouTube</option>
            <option value="twitcasting">ツイキャス</option>
            <option value="openrec">OPENREC</option>
        `;
        
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.placeholder = 'URLまたはチャンネルIDを入力';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        const loadButton = document.createElement('button');
        loadButton.textContent = '読み込み';
        loadButton.className = 'load-button';
        
        const resetButton = document.createElement('button');
        resetButton.textContent = 'リセット';
        resetButton.className = 'reset-button';
        
        buttonContainer.appendChild(loadButton);
        buttonContainer.appendChild(resetButton);
        
        loadButton.addEventListener('click', () => {
            const platform = platformSelect.value;
            const channelId = urlInput.value.trim();
            
            if (channelId) {
                // メインの入力フィールドも更新
                document.getElementById(`platform-${streamId}`).value = platform;
                document.getElementById(`channel-${streamId}`).value = channelId;
                
                // ストリームを読み込み
                loadStream(streamId, platform, channelId);
                
                // 状態を更新
                currentState.streams[streamId] = { platform, channelId };
                saveStateToURL();
            }
            
            inputContainer.remove();
        });
        
        resetButton.addEventListener('click', () => {
            // ストリームをリセット
            resetStream(streamId);
            inputContainer.remove();
        });
        
        inputContainer.appendChild(platformSelect);
        inputContainer.appendChild(urlInput);
        inputContainer.appendChild(buttonContainer);
        
        const placeholder = player.querySelector('.placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        player.appendChild(inputContainer);
        
        urlInput.focus();
    }

    // ストリームをリセットする関数
    function resetStream(streamId) {
        const streamContainer = document.getElementById(`stream-${streamId}`);
        const mainInput = document.getElementById(`stream-input-${streamId}`);
        
        // イベントリスナーを含むすべての要素を削除して再構築
        streamContainer.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-plus-circle placeholder-icon"></i>
                <p>配信を追加</p>
                <p>クリックしてURLを入力</p>
            </div>
        `;
        
        // プレースホルダーのクリックイベントを再設定
        const placeholder = streamContainer.querySelector('.placeholder');
        if (placeholder) {
            placeholder.addEventListener('click', () => {
                createInlineUrlInput(streamContainer, streamId);
            });
        }
        
        // メインの入力フィールドをリセット
        if (mainInput) {
            const platformSelect = mainInput.querySelector('.platform-select');
            const channelInput = mainInput.querySelector('input');
            if (platformSelect) platformSelect.value = 'twitch';
            if (channelInput) channelInput.value = '';
            
            // 配信2以降の場合は非表示に
            if (streamId > 1) {
                mainInput.classList.add('hidden');
                visibleStreamInputs = Math.max(1, visibleStreamInputs - 1);
                updateVisibleStreamInputs();
            }
        }
        
        // 状態を更新
        delete currentState.streams[streamId];
        saveStateToURL();
        
        // ドラッグ&ドロップを再有効化
        initializeStreamPlayers();
    }

    // 表示されている入力フィールドの数を更新する関数
    function updateVisibleStreamInputs() {
        visibleStreamInputs = Array.from(document.querySelectorAll('.stream-input:not(.hidden)')).length;
        
        // 「追加」ボタンの表示状態を更新
        if (visibleStreamInputs < 10) {
            addStreamButton.classList.remove('hidden');
        } else {
            addStreamButton.classList.add('hidden');
        }
    }

    // 配信入力フィールドを追加する機能
    addStreamButton.addEventListener('click', () => {
        if (visibleStreamInputs < 10) {
            visibleStreamInputs++;
            document.getElementById(`stream-input-${visibleStreamInputs}`).classList.remove('hidden');
            updateVisibleStreamInputs();
        }
    });
    
    // 削除ボタンのイベントリスナーを追加
    const deleteButtons = document.querySelectorAll('.delete-stream');
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const streamId = parseInt(button.getAttribute('data-target'));
            resetStream(streamId);
        });
    });
    
    // メニュー開閉機能
    menuToggle.addEventListener('click', () => {
        document.body.style.overflow = 'hidden'; // スクロール防止
        streamMenu.classList.add('open');
        
        // 共有URLを更新
        updateShareUrl();
        
        // メニューアイテムのフェードインアニメーション
        const menuItems = streamMenu.querySelectorAll('h3, .layout-buttons, .stream-input, .add-stream-button, .url-help, .share-url-container');
        menuItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 100 + (index * 50));
        });
    });
    
    closeMenu.addEventListener('click', () => {
        streamMenu.classList.remove('open');
        document.body.style.overflow = ''; // スクロール復活
    });
    
    // メニュー外クリックで閉じる
    document.addEventListener('click', (event) => {
        if (!streamMenu.contains(event.target) && event.target !== menuToggle && !menuToggle.contains(event.target)) {
            streamMenu.classList.remove('open');
        }
    });
    
    // レイアウトボタンのイベントリスナー
    layoutButtons.forEach(button => {
        button.addEventListener('click', () => {
            // アクティブクラスの切り替え
            layoutButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // レイアウトクラスの切り替え
            const layoutClass = button.id;
            streamsContainer.className = 'streams-container ' + layoutClass;
            
            // 状態を更新
            currentState.layout = layoutClass;
            saveStateToURL();
            
            // レイアウトに応じてストリームプレーヤーの表示/非表示を切り替え
            const streamPlayers = document.querySelectorAll('.stream-player');
            
            switch (layoutClass) {
                case 'layout-1x2':
                case 'layout-2x1':
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 2 ? 'flex' : 'none';
                    });
                    break;
                case 'layout-1x3':
                case 'layout-3x1':
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 3 ? 'flex' : 'none';
                    });
                    break;
                case 'layout-2x3':
                case 'layout-3x2':
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 6 ? 'flex' : 'none';
                    });
                    break;
                case 'layout-1x4':
                case 'layout-4x1':
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 4 ? 'flex' : 'none';
                    });
                    break;
                case 'layout-4x2':
                case 'layout-2x4':
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 8 ? 'flex' : 'none';
                    });
                    break;
                case 'layout-5x2':
                case 'layout-2x5':
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 10 ? 'flex' : 'none';
                    });
                    break;
                default:
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 4 ? 'flex' : 'none';
                    });
            }

            initializeStreamPlayers();
        });
    });
    
    // 初期状態で4x2レイアウトをアクティブに
    document.getElementById('layout-2x2').classList.add('active');
    
    // 読み込みボタンのイベントリスナー
    loadButtons.forEach(button => {
        button.addEventListener('click', () => {
            const streamId = button.getAttribute('data-target');
            const platformSelect = document.getElementById(`platform-${streamId}`);
            const channelInput = document.getElementById(`channel-${streamId}`);
            
            const platform = platformSelect.value;
            const channelId = channelInput.value.trim();
            
            if (channelId) {
                loadStream(streamId, platform, channelId);
            } else {
                alert('URLまたはチャンネルIDを入力してください');
            }
        });
    });
    
    // ストリームを読み込む関数
    function loadStream(streamId, platform, channelId) {
        const streamContainer = document.getElementById(`stream-${streamId}`);
        const mainInput = document.getElementById(`stream-input-${streamId}`);
        
        // 既存のコンテンツをクリアしてiframeを追加
        streamContainer.innerHTML = '';
        
        // URLの正規化と埋め込みURL生成
        let embedUrl = '';
        let normalizedChannelId = channelId;
        
        switch (platform) {
            case 'twitch':
                const parentParam = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
                // Twitchの完全なURLからチャンネル名を抽出
                if (channelId.includes('twitch.tv/')) {
                    normalizedChannelId = channelId.split('twitch.tv/')[1].split('/')[0];
                }
                if (normalizedChannelId.startsWith('v')) {
                    embedUrl = `https://player.twitch.tv/?video=${normalizedChannelId}&parent=${parentParam}`;
                } else {
                    embedUrl = `https://player.twitch.tv/?channel=${normalizedChannelId}&parent=${parentParam}`;
                }
                break;
                
            case 'youtube':
                // YouTubeの様々なURL形式に対応
                let youtubeId = normalizedChannelId;
                if (normalizedChannelId.includes('youtube.com/')) {
                    try {
                        const url = new URL(normalizedChannelId);
                        if (normalizedChannelId.includes('youtube.com/watch')) {
                            youtubeId = url.searchParams.get('v');
                        } else if (normalizedChannelId.includes('youtube.com/live/')) {
                            youtubeId = normalizedChannelId.split('youtube.com/live/')[1].split('?')[0];
                        } else if (normalizedChannelId.includes('youtube.com/channel/')) {
                            youtubeId = normalizedChannelId.split('youtube.com/channel/')[1].split('?')[0];
                        }
                    } catch (e) {
                        console.error('Invalid YouTube URL:', e);
                        alert('無効なYouTube URLです');
                        return;
                    }
                } else if (normalizedChannelId.includes('youtu.be/')) {
                    youtubeId = normalizedChannelId.split('youtu.be/')[1].split('?')[0];
                }
                embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
                break;
                
            case 'twitcasting':
                // ツイキャスの完全なURLからユーザー名を抽出
                if (normalizedChannelId.includes('twitcasting.tv/')) {
                    normalizedChannelId = normalizedChannelId.split('twitcasting.tv/')[1].split('/')[0];
                }
                embedUrl = `https://twitcasting.tv/${normalizedChannelId}/embeddedplayer/live?auto_play=true`;
                break;
                
            case 'openrec':
                // OPENRECの完全なURLから配信IDを抽出
                if (normalizedChannelId.includes('openrec.tv/')) {
                    const match = normalizedChannelId.match(/openrec\.tv\/(?:live|movie)\/([^\/\?]+)/);
                    if (match) {
                        normalizedChannelId = match[1];
                    }
                }
                embedUrl = `https://www.openrec.tv/embed/${normalizedChannelId}`;
                break;
                
            default:
                alert('サポートされていないプラットフォームです');
                return;
        }
        
        // iframeを作成して埋め込み
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.setAttribute('allowfullscreen', 'true');
        
        if (platform === 'twitch') {
            iframe.setAttribute('allow', 'autoplay; fullscreen');
        }
        
        streamContainer.appendChild(iframe);
        
        // リセットボタンを追加
        const resetButtonContainer = document.createElement('div');
        resetButtonContainer.className = 'reset-button-container';
        const resetButton = document.createElement('button');
        resetButton.className = 'stream-reset-button';
        resetButton.innerHTML = '<i class="fas fa-undo"></i>';
        resetButton.title = 'リセット';
        resetButton.addEventListener('click', () => resetStream(streamId));
        resetButtonContainer.appendChild(resetButton);
        streamContainer.appendChild(resetButtonContainer);
        
        // メイン入力フィールドを更新
        if (mainInput) {
            const platformSelect = mainInput.querySelector('.platform-select');
            const channelInput = mainInput.querySelector('input');
            if (platformSelect) platformSelect.value = platform;
            if (channelInput) channelInput.value = channelId;
            
            // 非表示状態を解除
            mainInput.classList.remove('hidden');
            updateVisibleStreamInputs();
        }
        
        // 状態を更新
        currentState.streams[streamId] = { platform, channelId: normalizedChannelId };
        saveStateToURL();
    }
    
    // プラットフォームに応じたスタイルを適用
    function applyPlatformStyles() {
        const platformSelects = document.querySelectorAll('.platform-select');
        platformSelects.forEach(select => {
            const streamInput = select.closest('.stream-input');
            const loadButton = streamInput.querySelector('.load-stream');
            
            // すべての読み込みボタンに統一したスタイルを適用
            if (loadButton) {
                loadButton.style.background = 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)';
            }
        });
    }
    
    // プラットフォーム選択時にスタイルを更新
    document.querySelectorAll('.platform-select').forEach(select => {
        select.addEventListener('change', applyPlatformStyles);
    });
    
    // 初期スタイルを適用
    applyPlatformStyles();
    
    // 共有URLを更新する関数
    function updateShareUrl() {
        const shareUrlInput = document.getElementById('share-url');
        if (shareUrlInput) {
            // 現在のURLからクエリパラメータを取得
            const params = new URLSearchParams(window.location.search);
            const stateParam = params.get('state');
            
            if (stateParam) {
                // ステートパラメータのみを含む短いURLを生成
                shareUrlInput.value = `${window.location.origin}${window.location.pathname}?state=${stateParam}`;
            } else {
                // ステートがない場合はベースURLのみ
                shareUrlInput.value = `${window.location.origin}${window.location.pathname}`;
            }
        }
    }

    // 全体をリセットする関数
    function resetAll() {
        // すべてのストリームをリセット
        for (let i = 1; i <= 8; i++) {
            resetStream(i);
        }
        
        // レイアウトを2x2に戻す
        document.getElementById('layout-2x2').click();
        
        // 入力フィールドを初期状態に
        visibleStreamInputs = 1;
        document.querySelectorAll('.stream-input').forEach((input, index) => {
            if (index === 0) {
                input.classList.remove('hidden');
            } else {
                input.classList.add('hidden');
            }
        });
        
        // 状態をリセット
        currentState = {
            layout: 'layout-2x2',
            streams: {}
        };

        // URLをクリア（クエリパラメータを削除）
        const newURL = window.location.pathname;
        window.history.pushState({}, '', newURL);
        
        // 「追加」ボタンを表示
        addStreamButton.classList.remove('hidden');

        // 共有URLを更新
        updateShareUrl();
    }

    // 初期化時に共有URLコンテナを作成
    function createShareUrlContainer() {
        const container = document.createElement('div');
        container.className = 'share-url-container';
        container.innerHTML = `
            <h3><i class="fas fa-share-alt"></i> 共有</h3>
            <div class="share-url-input-container">
                <input type="text" id="share-url" readonly>
                <button class="copy-url-button">
                    <i class="fas fa-copy"></i> コピー
                </button>
            </div>
        `;
        
        // コピーボタンのイベントリスナーを追加
        const copyButton = container.querySelector('.copy-url-button');
        copyButton.addEventListener('click', () => {
            const shareUrlInput = container.querySelector('#share-url');
            shareUrlInput.select();
            document.execCommand('copy');
            
            // コピー成功のフィードバック
            const originalText = copyButton.innerHTML;
            copyButton.innerHTML = '<i class="fas fa-check"></i> コピーしました！';
            copyButton.style.background = 'var(--success-color)';
            
            setTimeout(() => {
                copyButton.innerHTML = originalText;
                copyButton.style.background = '';
            }, 2000);
        });
        
        // メニューの適切な位置に挿入
        const streamControls = document.querySelector('.stream-controls');
        if (streamControls) {
            streamControls.appendChild(container);
            
            // リセットボタンを追加
            const resetContainer = document.createElement('div');
            resetContainer.className = 'reset-all-container';
            resetContainer.innerHTML = `
                <button class="reset-all-button">
                    <i class="fas fa-undo-alt"></i> すべてリセット
                </button>
            `;
            
            const resetButton = resetContainer.querySelector('.reset-all-button');
            resetButton.addEventListener('click', resetAll);
            
            streamControls.appendChild(resetContainer);
        }
    }

    // 初期化時に実行
    createShareUrlContainer();
    
    // ストリームプレーヤーのホバーエフェクト
    document.querySelectorAll('.stream-player').forEach(player => {
        player.addEventListener('mouseenter', () => {
            const placeholder = player.querySelector('.placeholder-icon');
            if (placeholder) {
                placeholder.style.transform = 'scale(1.1)';
                placeholder.style.opacity = '1';
            }
        });
        
        player.addEventListener('mouseleave', () => {
            const placeholder = player.querySelector('.placeholder-icon');
            if (placeholder) {
                placeholder.style.transform = 'scale(1)';
                placeholder.style.opacity = '0.7';
            }
        });
    });

    // 初期化
    if (window.location.search) {
        // URLからステートがある場合のみ復元
        loadStateFromURL();
    } else {
        // URLにステートがない場合は、URLを変更せずに2x2レイアウトを適用
        
        // まず他のボタンからactiveクラスを削除（念のため）
        layoutButtons.forEach(btn => btn.classList.remove('active'));
        
        // 2x2ボタンにactiveクラスを追加
        document.getElementById('layout-2x2').classList.add('active');
        
        // レイアウトクラスの設定
        streamsContainer.className = 'streams-container layout-2x2';
        currentState.layout = 'layout-2x2';
        
        // レイアウトに応じてストリームプレーヤーの表示/非表示を設定
        const streamPlayers = document.querySelectorAll('.stream-player');
        streamPlayers.forEach((player, index) => {
            player.style.display = index < 4 ? 'flex' : 'none';
        });
    }

    initializeStreamPlayers();

    function createLayoutButtons() {
        const layoutButtons = document.querySelector('.layout-buttons');
        layoutButtons.innerHTML = `
            <button id="layout-2x2" title="2x2レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-1x2" title="1x2レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-2x1" title="2x1レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-1x3" title="1x3レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-3x1" title="3x1レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-2x3" title="2x3レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-3x2" title="3x2レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-1x4" title="1x4レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-4x1" title="4x1レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-4x2" title="4x2レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-2x4" title="2x4レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-5x2" title="5x2レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
            <button id="layout-2x5" title="2x5レイアウト">
                <div class="layout-icon">
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                    <div class="grid-cell"></div>
                </div>
            </button>
        `;

        // レイアウトボタンのイベントリスナーを再設定
        const buttons = layoutButtons.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                
                // アクティブクラスの切り替え
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // レイアウトクラスの切り替え
                const layoutClass = button.id;
                streamsContainer.className = 'streams-container ' + layoutClass;
                
                // 状態を更新
                currentState.layout = layoutClass;
                saveStateToURL();
                
                // レイアウトに応じてストリームプレーヤーの表示/非表示を切り替え
                const streamPlayers = document.querySelectorAll('.stream-player');
                
                switch (layoutClass) {
                    case 'layout-1x2':
                    case 'layout-2x1':
                        streamPlayers.forEach((player, index) => {
                            player.style.display = index < 2 ? 'flex' : 'none';
                        });
                        break;
                    case 'layout-1x3':
                    case 'layout-3x1':
                        streamPlayers.forEach((player, index) => {
                            player.style.display = index < 3 ? 'flex' : 'none';
                        });
                        break;
                    case 'layout-2x3':
                    case 'layout-3x2':
                        streamPlayers.forEach((player, index) => {
                            player.style.display = index < 6 ? 'flex' : 'none';
                        });
                        break;
                    case 'layout-1x4':
                    case 'layout-4x1':
                        streamPlayers.forEach((player, index) => {
                            player.style.display = index < 4 ? 'flex' : 'none';
                        });
                        break;
                    case 'layout-4x2':
                    case 'layout-2x4':
                        streamPlayers.forEach((player, index) => {
                            player.style.display = index < 8 ? 'flex' : 'none';
                        });
                        break;
                    case 'layout-5x2':
                    case 'layout-2x5':
                        streamPlayers.forEach((player, index) => {
                            player.style.display = index < 10 ? 'flex' : 'none';
                        });
                        break;
                    default:
                        streamPlayers.forEach((player, index) => {
                            player.style.display = index < 4 ? 'flex' : 'none';
                        });
                }

                initializeStreamPlayers();
            });
        });
    }

    createLayoutButtons();

    // 全画面表示の切り替え機能
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    
    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            fullscreenToggle.innerHTML = '<i class="fas fa-compress"></i>';
            fullscreenToggle.title = '全画面表示を解除';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
                fullscreenToggle.title = '全画面表示';
            }
        }
    }

    // 全画面表示ボタンのクリックイベント
    fullscreenToggle.addEventListener('click', toggleFullScreen);

    // 全画面表示の変更を監視
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenToggle.title = '全画面表示';
        }
    });

    // F11キーでの全画面表示も同じように処理
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F11') {
            e.preventDefault();
            toggleFullScreen();
        }
    });

    // script.js の最後に追加
    window.addEventListener('load', () => {
        console.log("Window loaded - setting active button");
        if (!window.location.search) {
        const layout2x2Button = document.getElementById('layout-2x2');
        if (layout2x2Button) {
            layout2x2Button.classList.add('active');
            console.log("Active class added to 2x2 button");
        }
        }
    });

    // コメント機能の実装
    class CommentManager {
        constructor() {
            this.commentPanel = document.getElementById('comment-panel');
            this.commentTabs = document.getElementById('comment-tabs');
            this.commentContent = document.getElementById('comment-content');
            this.commentToggle = document.getElementById('comment-toggle');
            this.closeComments = document.getElementById('close-comments');
            
            // 設定要素
            this.displayModeButtons = document.querySelectorAll('.mode-button');
            this.autoScrollToggle = document.getElementById('autoscroll-toggle');
            this.sizeButtons = document.querySelectorAll('.size-button');
            this.opacitySlider = document.getElementById('comment-opacity');
            this.userColorToggles = document.querySelectorAll('.color-toggle input');
            
            // 状態管理
            this.activeTab = null;
            this.autoScroll = true;
            this.displayMode = 'normal';
            this.fontSize = 'medium';
            this.opacity = 70;
            
            // 設定の読み込み
            this.loadSettings();
            
            // イベントリスナーの設定
            this.setupEventListeners();
            
            // コメントの自動更新
            setInterval(() => this.updateComments(), 1000);
            
            // プラットフォーム別のコメント取得インスタンス
            this.commentFetchers = {
                twitch: new TwitchCommentFetcher()
            };
            
            // 絵文字変換用のマッピング
            this.emojiMap = new Map([
                [':smile:', '😊'],
                [':laugh:', '😄'],
                [':cry:', '😢'],
                [':heart:', '❤️'],
                [':fire:', '🔥'],
                [':clap:', '👏']
            ]);
            
            // カスタム絵文字のキャッシュ
            this.customEmojis = new Map();
        }
        
        loadSettings() {
            // LocalStorageから設定を読み込む
            const settings = JSON.parse(localStorage.getItem('commentSettings') || '{}');
            this.displayMode = settings.displayMode || 'normal';
            this.fontSize = settings.fontSize || 'medium';
            this.opacity = settings.opacity || 70;
            this.autoScroll = settings.autoScroll !== undefined ? settings.autoScroll : true;
            
            // 設定を適用
            this.applySettings();
        }
        
        saveSettings() {
            // 設定をLocalStorageに保存
            const settings = {
                displayMode: this.displayMode,
                fontSize: this.fontSize,
                opacity: this.opacity,
                autoScroll: this.autoScroll
            };
            localStorage.setItem('commentSettings', JSON.stringify(settings));
        }
        
        applySettings() {
            // 表示モード
            this.displayModeButtons.forEach(button => {
                button.classList.toggle('active', button.dataset.mode === this.displayMode);
            });
            this.commentContent.className = `comment-content ${this.displayMode} font-${this.fontSize}`;
            
            // 自動スクロール
            this.autoScrollToggle.checked = this.autoScroll;
            
            // 文字サイズ
            this.sizeButtons.forEach(button => {
                button.classList.toggle('active', button.dataset.size === this.fontSize);
            });
            
            // 透明度
            this.opacitySlider.value = this.opacity;
            this.commentPanel.style.opacity = this.opacity / 100;
        }
        
        setupEventListeners() {
            // パネルの開閉
            this.commentToggle.addEventListener('click', () => {
                this.commentPanel.classList.toggle('open');
            });
            
            this.closeComments.addEventListener('click', () => {
                this.commentPanel.classList.remove('open');
            });
            
            // 表示モードの切り替え
            this.displayModeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    this.displayMode = button.dataset.mode;
                    this.applySettings();
                    this.saveSettings();
                });
            });
            
            // 自動スクロール設定
            this.autoScrollToggle.addEventListener('change', () => {
                this.autoScroll = this.autoScrollToggle.checked;
                this.saveSettings();
            });
            
            // 文字サイズ設定
            this.sizeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    this.fontSize = button.dataset.size;
                    this.applySettings();
                    this.saveSettings();
                });
            });
            
            // 透明度設定
            this.opacitySlider.addEventListener('input', () => {
                this.opacity = this.opacitySlider.value;
                this.applySettings();
            });
            
            this.opacitySlider.addEventListener('change', () => {
                this.saveSettings();
            });
            
            // ユーザー種別の色分け設定
            this.userColorToggles.forEach(toggle => {
                toggle.addEventListener('change', () => {
                    const userType = toggle.closest('.color-toggle').querySelector('.color-sample').classList[1];
                    document.querySelectorAll(`.comment-user.${userType}`).forEach(user => {
                        user.style.opacity = toggle.checked ? '1' : '0.5';
                    });
                });
            });
        }
        
        createTab(streamId, platform) {
            const tab = document.createElement('button');
            tab.className = 'comment-tab';
            tab.dataset.streamId = streamId;
            tab.textContent = `配信${streamId}`;
            
            tab.addEventListener('click', () => {
                this.activateTab(streamId);
            });
            
            this.commentTabs.appendChild(tab);
            
            // 最初のタブを自動的にアクティブにする
            if (!this.activeTab) {
                this.activateTab(streamId);
            }
        }
        
        removeTab(streamId) {
            const tab = this.commentTabs.querySelector(`[data-stream-id="${streamId}"]`);
            if (tab) {
                tab.remove();
                
                // アクティブなタブが削除された場合、最初のタブをアクティブにする
                if (this.activeTab === streamId) {
                    const firstTab = this.commentTabs.querySelector('.comment-tab');
                    if (firstTab) {
                        this.activateTab(firstTab.dataset.streamId);
                    } else {
                        this.activeTab = null;
                        this.commentContent.innerHTML = '';
                    }
                }
            }
        }
        
        activateTab(streamId) {
            this.commentTabs.querySelectorAll('.comment-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.streamId === streamId);
            });
            this.activeTab = streamId;
            this.updateComments();
        }
        
        addComment(streamId, comment) {
            if (this.activeTab !== streamId) return;
            
            const commentElement = document.createElement('div');
            commentElement.className = 'comment-item';
            
            const meta = document.createElement('div');
            meta.className = 'comment-meta';
            
            const user = document.createElement('span');
            user.className = `comment-user ${comment.userType || ''}`;
            user.textContent = comment.username;
            
            const time = document.createElement('span');
            time.className = 'comment-time';
            time.textContent = comment.time;
            
            const text = document.createElement('div');
            text.className = 'comment-text';
            text.textContent = comment.text;
            
            meta.appendChild(user);
            meta.appendChild(time);
            commentElement.appendChild(meta);
            commentElement.appendChild(text);
            
            this.commentContent.appendChild(commentElement);
            
            // 自動スクロール
            if (this.autoScroll) {
                this.commentContent.scrollTop = this.commentContent.scrollHeight;
            }
        }
        
        async updateComments() {
            if (!this.activeTab) return;
            
            const streamId = this.activeTab;
            const platform = document.getElementById(`platform-${streamId}`).value;
            const channelId = document.getElementById(`channel-${streamId}`).value;
            
            // Twitchのコメントのみ取得
            if (platform === 'twitch') {
                try {
                    const comments = await this.commentFetchers.twitch.fetchComments(channelId);
                    comments.forEach(comment => {
                        comment.text = this.processEmojis(comment.text);
                        this.addComment(streamId, comment);
                    });
                } catch (error) {
                    console.error(`Error fetching comments for Twitch:`, error);
                }
            }
        }
        
        processEmojis(text) {
            // 標準絵文字の変換
            for (const [code, emoji] of this.emojiMap) {
                text = text.replace(new RegExp(code, 'g'), emoji);
            }
            
            // カスタム絵文字の変換
            for (const [code, url] of this.customEmojis) {
                text = text.replace(new RegExp(code, 'g'), `<img src="${url}" class="custom-emoji" alt="${code}">`);
            }
            
            // Unicode絵文字の処理
            text = twemoji.parse(text);
            
            return text;
        }
    }

    // コメントマネージャーのインスタンスを作成
    const commentManager = new CommentManager();

    // ストリーム関連のイベントとコメント機能の連携
    document.querySelectorAll('.load-stream').forEach(button => {
        button.addEventListener('click', () => {
            const streamId = button.dataset.target;
            const platform = document.getElementById(`platform-${streamId}`).value;
            commentManager.createTab(streamId, platform);
        });
    });

    document.querySelectorAll('.delete-stream').forEach(button => {
        button.addEventListener('click', () => {
            const streamId = button.dataset.target;
            commentManager.removeTab(streamId);
        });
    });
});

// Twitchコメント取得クラス
class TwitchCommentFetcher {
    constructor() {
        this.client = null;
        this.lastMessageIds = new Set();
    }
    
    async connect(channelId) {
        if (!this.client) {
            this.client = new tmi.Client({
                connection: {
                    secure: true,
                    reconnect: true
                },
                channels: [channelId]
            });
            
            await this.client.connect();
        }
    }
    
    async fetchComments(channelId) {
        try {
            await this.connect(channelId);
            
            return new Promise((resolve) => {
                const newMessages = [];
                
                this.client.on('message', (channel, tags, message, self) => {
                    const messageId = tags['id'];
                    
                    if (!this.lastMessageIds.has(messageId)) {
                        this.lastMessageIds.add(messageId);
                        
                        // 最大1000件までメッセージIDを保持
                        if (this.lastMessageIds.size > 1000) {
                            const [firstId] = this.lastMessageIds;
                            this.lastMessageIds.delete(firstId);
                        }
                        
                        newMessages.push({
                            username: tags['display-name'],
                            text: message,
                            time: new Date().toLocaleTimeString(),
                            userType: this.getUserType(tags),
                            emotes: tags['emotes']
                        });
                    }
                });
                
                // 100ms後に新しいメッセージを返す
                setTimeout(() => resolve(newMessages), 100);
            });
        } catch (error) {
            console.error('Twitch comment fetch error:', error);
            return [];
        }
    }
    
    getUserType(tags) {
        if (tags.mod) return 'moderator';
        if (tags.subscriber) return 'subscriber';
        return '';
    }
}

// YouTubeコメント取得クラス
class YouTubeCommentFetcher {
    constructor() {
        this.lastCommentTime = new Date();
    }
    
    async fetchComments(videoId) {
        try {
            // YouTube Data APIを使用してライブチャットIDを取得
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`);
            const data = await response.json();
            
            if (data.items && data.items[0] && data.items[0].liveStreamingDetails) {
                const chatId = data.items[0].liveStreamingDetails.activeLiveChatId;
                
                // ライブチャットメッセージを取得
                const chatResponse = await fetch(`https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${chatId}&part=snippet,authorDetails&key=${YOUTUBE_API_KEY}`);
                const chatData = await chatResponse.json();
                
                return chatData.items.map(item => ({
                    username: item.authorDetails.displayName,
                    text: item.snippet.displayMessage,
                    time: new Date(item.snippet.publishedAt).toLocaleTimeString(),
                    userType: this.getUserType(item.authorDetails)
                }));
            }
            
            return [];
        } catch (error) {
            console.error('YouTube comment fetch error:', error);
            return [];
        }
    }
    
    getUserType(authorDetails) {
        if (authorDetails.isChatOwner) return 'moderator';
        if (authorDetails.isChatSponsor) return 'member';
        return '';
    }
}

// ツイキャスコメント取得クラス
class TwitcastingCommentFetcher {
    constructor() {
        this.lastCommentId = null;
    }
    
    async fetchComments(userId) {
        try {
            const response = await fetch(`https://apiv2.twitcasting.tv/users/${userId}/current_live/comments?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${TWITCASTING_API_KEY}`
                }
            });
            
            const data = await response.json();
            
            if (data.comments) {
                return data.comments
                    .filter(comment => !this.lastCommentId || comment.id > this.lastCommentId)
                    .map(comment => {
                        this.lastCommentId = Math.max(this.lastCommentId || 0, comment.id);
                        return {
                            username: comment.author.name,
                            text: comment.message,
                            time: new Date(comment.created * 1000).toLocaleTimeString(),
                            userType: ''
                        };
                    });
            }
            
            return [];
        } catch (error) {
            console.error('Twitcasting comment fetch error:', error);
            return [];
        }
    }
}

// OPENRECコメント取得クラス
class OpenrecCommentFetcher {
    constructor() {
        this.lastCommentTime = new Date();
        this.socket = null;
    }
    
    async connect(movieId) {
        if (!this.socket) {
            this.socket = new WebSocket('wss://chat.openrec.tv/socket.io/?EIO=3&transport=websocket');
            
            this.socket.onopen = () => {
                this.socket.send(`42["join_movie","${movieId}"]`);
            };
        }
    }
    
    async fetchComments(movieId) {
        try {
            await this.connect(movieId);
            
            return new Promise((resolve) => {
                const newMessages = [];
                
                this.socket.onmessage = (event) => {
                    if (event.data.startsWith('42["message"')) {
                        const messageData = JSON.parse(event.data.substr(2))[1];
                        
                        newMessages.push({
                            username: messageData.user.name,
                            text: messageData.message,
                            time: new Date().toLocaleTimeString(),
                            userType: this.getUserType(messageData.user)
                        });
                    }
                };
                
                setTimeout(() => resolve(newMessages), 100);
            });
        } catch (error) {
            console.error('OPENREC comment fetch error:', error);
            return [];
        }
    }
    
    getUserType(user) {
        if (user.is_moderator) return 'moderator';
        if (user.is_premium) return 'subscriber';
        return '';
    }
}

