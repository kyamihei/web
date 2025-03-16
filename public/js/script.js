document.addEventListener('DOMContentLoaded', () => {
    // Service Workerを無効化（エラー対策）
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for (let registration of registrations) {
                registration.unregister();
                console.log('Service Workerを無効化しました');
            }
        });
    }

    // 要素の取得
    const streamsContainer = document.querySelector('.streams-container');
    const layoutButtons = document.querySelectorAll('.layout-controls button');
    const loadButtons = document.querySelectorAll('.load-stream');
    const menuToggle = document.getElementById('menu-toggle');
    const closeMenu = document.getElementById('close-menu');
    const streamMenu = document.getElementById('stream-menu');
    const addStreamButton = document.getElementById('add-stream');
    
    // 初期化時に透過度メニューを非表示にする
    document.querySelectorAll('.opacity-control').forEach(control => {
        control.style.display = 'none';
    });
    
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
        if (state.layout) {
            document.getElementById(state.layout).click();
        }

        // ストリームを読み込み
        if (state.streams) {
            Object.entries(state.streams).forEach(([streamId, streamData]) => {
                const platformSelect = document.getElementById(`platform-${streamId}`);
                const channelInput = document.getElementById(`channel-${streamId}`);
                
                if (platformSelect && channelInput) {
                    platformSelect.value = streamData.platform;
                    channelInput.value = streamData.channelId;
                    
                    // ストリームを読み込む
                    loadStream(streamId, streamData.platform, streamData.channelId);
                    
                    // チャットの表示状態を復元
                    if (streamData.chatVisible) {
                        // ストリームの読み込みが完了してからチャットを表示
                        setTimeout(() => {
                            toggleChat(streamId);
                            
                            // チャットの透過度を復元
                            if (streamData.chatOpacity) {
                                const opacitySlider = document.querySelector(`.chat-opacity[data-target="${streamId}"]`);
                                if (opacitySlider) {
                                    opacitySlider.value = streamData.chatOpacity;
                                    updateChatOpacity(streamId, streamData.chatOpacity);
                                }
                                
                                // 透過度メニューを表示
                                const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`);
                                if (opacityControl) {
                                    opacityControl.style.display = 'flex';
                                }
                            }
                        }, 1000);
                    }
                }
            });
        }
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
            
            // 透過度メニューを非表示にする
            const opacityControl = mainInput.querySelector(`.opacity-control[data-target="${streamId}"]`);
            if (opacityControl) {
                opacityControl.style.display = 'none';
            }
            
            // 配信2以降の場合は非表示に
            if (streamId > 1) {
                mainInput.classList.add('hidden');
                visibleStreamInputs = Math.max(1, visibleStreamInputs - 1);
                updateVisibleStreamInputs();
            }
        }
        
        // チャットをリセット
        const chatContainer = document.getElementById(`chat-${streamId}`);
        const streamPlayer = document.getElementById(`stream-${streamId}`);
        const toggleButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
        
        if (chatContainer) {
            chatContainer.classList.add('hidden');
            while (chatContainer.firstChild) {
                chatContainer.removeChild(chatContainer.firstChild);
            }
        }
        
        if (streamPlayer) {
            streamPlayer.classList.remove('with-chat');
        }
        
        if (toggleButton) {
            toggleButton.classList.remove('active');
        }
        
        // 状態を更新
        delete currentState.streams[streamId];
        saveStateToURL();
        updateShareUrl();
        
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
        
        // チャットコンテナを追加
        const chatContainer = document.createElement('div');
        chatContainer.id = `chat-${streamId}`;
        chatContainer.className = 'chat-container hidden';
        streamContainer.appendChild(chatContainer);
        
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
        currentState.streams[streamId] = { 
            platform, 
            channelId: normalizedChannelId,
            chatVisible: false // チャットの表示状態も保存
        };
        saveStateToURL();
        updateShareUrl();
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
        select.addEventListener('change', () => {
            applyPlatformStyles();
            
            // ツイキャスが選択された場合、チャットボタンを非表示にする
            const streamId = select.id.split('-')[1];
            const toggleChatButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
            const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`);
            
            if (select.value === 'twitcasting') {
                // ツイキャスの場合、チャットボタンと透過度コントロールを非表示
                if (toggleChatButton) toggleChatButton.style.display = 'none';
                if (opacityControl) opacityControl.style.display = 'none';
            } else {
                // 他のプラットフォームの場合は表示
                if (toggleChatButton) toggleChatButton.style.display = '';
                // 透過度コントロールはチャットが表示されている場合のみ表示
                if (opacityControl) {
                    const chatContainer = document.getElementById(`chat-${streamId}`);
                    opacityControl.style.display = chatContainer && !chatContainer.classList.contains('hidden') ? 'flex' : 'none';
                }
            }
        });
    });
    
    // 初期スタイルを適用
    applyPlatformStyles();
    
    // 初期状態でツイキャスのチャットボタンを非表示にする
    document.querySelectorAll('.platform-select').forEach(select => {
        if (select.value === 'twitcasting') {
            const streamId = select.id.split('-')[1];
            const toggleChatButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
            const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`);
            
            if (toggleChatButton) toggleChatButton.style.display = 'none';
            if (opacityControl) opacityControl.style.display = 'none';
        }
    });

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

    // チャットトグルボタンのイベントリスナーを追加
    document.querySelectorAll('.toggle-chat').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const streamId = button.getAttribute('data-target');
            if (streamId) {
                toggleChat(streamId);
            } else {
                console.error('data-target属性が見つかりません');
            }
        });
    });

    // チャット表示を切り替える関数
    function toggleChat(streamId) {
        const streamPlayer = document.getElementById(`stream-${streamId}`);
        const chatContainer = document.getElementById(`chat-${streamId}`);
        const toggleButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
        const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`) || 
                              toggleButton.nextElementSibling;
        
        // 要素が存在するか確認
        if (!streamPlayer || !chatContainer || !toggleButton) {
            console.error(`要素が見つかりません: stream-${streamId}, chat-${streamId}, または toggle-chat[data-target="${streamId}"]`);
            return;
        }
        
        // 現在のストリーム情報を取得
        const platformSelect = document.getElementById(`platform-${streamId}`);
        const channelInput = document.getElementById(`channel-${streamId}`);
        
        if (!platformSelect || !channelInput) {
            console.error(`プラットフォームまたはチャンネル入力が見つかりません: platform-${streamId}, channel-${streamId}`);
            return;
        }
        
        const platform = platformSelect.value;
        const channelValue = channelInput.value;
        
        // ツイキャスの場合はチャット機能を無効化
        if (platform === 'twitcasting') {
            console.log('ツイキャスのチャット機能は現在無効化されています');
            return;
        }
        
        // チャットが既に表示されている場合は非表示にする
        if (chatContainer.classList.contains('hidden')) {
            // チャットが非表示の場合は表示する
            let chatUrl = '';
            let iframe = null;
            
            switch (platform) {
                case 'twitch':
                    if (!channelValue) {
                        alert('Twitchのチャンネルが設定されていません。');
                        return;
                    }
                    
                    // チャンネルIDを抽出
                    let twitchChannelId = channelValue;
                    
                    // URLが入力された場合はチャンネルIDを抽出
                    if (channelValue.includes('twitch.tv/')) {
                        const match = channelValue.match(/twitch\.tv\/([^\/\?]+)/);
                        if (match && match[1]) {
                            twitchChannelId = match[1];
                        }
                    }
                    
                    // 親ドメインパラメータを取得
                    const parentParam = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
                    
                    // Twitchの公式埋め込みチャットを使用
                    chatUrl = `https://www.twitch.tv/embed/${twitchChannelId}/chat?parent=${parentParam}`;
                    break;
                    
                case 'youtube':
                    if (!channelValue) {
                        alert('YouTubeの動画IDが設定されていません。');
                        return;
                    }
                    
                    // YouTube動画IDを抽出
                    let youtubeId = channelValue;
                    
                    if (channelValue.includes('youtube.com/')) {
                        try {
                            const url = new URL(channelValue);
                            if (channelValue.includes('youtube.com/watch')) {
                                youtubeId = url.searchParams.get('v');
                            } else if (channelValue.includes('youtube.com/live/')) {
                                youtubeId = channelValue.split('youtube.com/live/')[1].split('?')[0];
                            }
                        } catch (e) {
                            console.error('Invalid YouTube URL:', e);
                            alert('無効なYouTube URLです');
                            return;
                        }
                    } else if (channelValue.includes('youtu.be/')) {
                        youtubeId = channelValue.split('youtu.be/')[1].split('?')[0];
                    }
                    
                    chatUrl = `https://www.youtube.com/live_chat?v=${youtubeId}&embed_domain=${window.location.hostname}`;
                    break;
                    
                case 'twitcasting':
                    if (!channelValue) {
                        alert('ツイキャスのユーザー名が設定されていません。');
                        return;
                    }
                    
                    // ツイキャスのユーザー名を抽出
                    let twitcastingUser = channelValue;
                    
                    if (channelValue.includes('twitcasting.tv/')) {
                        twitcastingUser = channelValue.split('twitcasting.tv/')[1].split('/')[0];
                    }
                    
                    // 修正：正しいチャット埋め込みURLフォーマットを使用
                    chatUrl = `https://twitcasting.tv/${twitcastingUser}/embeddedplayer/comment?auto_play=false`;
                    break;
                    
                case 'openrec':
                    if (!channelValue) {
                        alert('OPENRECの配信IDが設定されていません。');
                        return;
                    }
                    
                    // OPENRECの配信IDを抽出
                    let openrecId = channelValue;
                    
                    if (channelValue.includes('openrec.tv/')) {
                        const match = channelValue.match(/openrec\.tv\/(?:live|movie)\/([^\/\?]+)/);
                        if (match) {
                            openrecId = match[1];
                        }
                    }
                    
                    // 新しいAPIを使用してチャットを取得
                    createOpenrecChatContainer(chatContainer, openrecId);
                    chatContainer.classList.remove('hidden');
                    streamPlayer.classList.add('with-chat');
                    toggleButton.classList.add('active');
                    
                    // 透過度コントロールを表示
                    if (opacityControl) {
                        opacityControl.style.display = 'flex';
                    }
                    
                    // 透過度を設定
                    const opacitySlider = document.querySelector(`.chat-opacity[data-target="${streamId}"]`);
                    if (opacitySlider) {
                        updateChatOpacity(streamId, opacitySlider.value);
                    }
                    
                    // 状態を更新
                    if (currentState.streams[streamId]) {
                        currentState.streams[streamId].chatVisible = true;
                        currentState.streams[streamId].chatOpacity = opacitySlider ? opacitySlider.value : 70;
                        saveStateToURL();
                        updateShareUrl();
                    }
                    return;
                    
                default:
                    alert('このプラットフォームのチャットはサポートされていません。');
                    return;
            }
            
            // iframeを作成
            iframe = document.createElement('iframe');
            iframe.src = chatUrl;
            iframe.classList.add('chat-iframe');
            
            // 既存のiframeがあれば削除
            while (chatContainer.firstChild) {
                chatContainer.removeChild(chatContainer.firstChild);
            }
            
            // 新しいiframeを追加
            chatContainer.appendChild(iframe);
            chatContainer.classList.remove('hidden');
            streamPlayer.classList.add('with-chat');
            toggleButton.classList.add('active');
            
            // 透過度コントロールを表示
            if (opacityControl) {
                opacityControl.style.display = 'flex';
            }
            
            // 透過度を設定
            const opacitySlider = document.querySelector(`.chat-opacity[data-target="${streamId}"]`);
            if (opacitySlider) {
                updateChatOpacity(streamId, opacitySlider.value);
            }
            
            // 状態を更新
            if (currentState.streams[streamId]) {
                currentState.streams[streamId].chatVisible = true;
                currentState.streams[streamId].chatOpacity = opacitySlider ? opacitySlider.value : 70;
                saveStateToURL();
                updateShareUrl();
            }
        } else {
            // チャットが表示されている場合は非表示にする
            chatContainer.classList.add('hidden');
            streamPlayer.classList.remove('with-chat');
            toggleButton.classList.remove('active');
            
            // 透過度コントロールを非表示
            if (opacityControl) {
                opacityControl.style.display = 'none';
            }
            
            // OPENRECのチャット更新を停止
            if (platform === 'openrec' && chatContainer.openrecChatInterval) {
                clearInterval(chatContainer.openrecChatInterval);
                chatContainer.openrecChatInterval = null;
            }
            
            // 状態を更新
            if (currentState.streams[streamId]) {
                currentState.streams[streamId].chatVisible = false;
                saveStateToURL();
                updateShareUrl();
            }
        }
    }

    // OPENRECのチャットコンテナを作成する関数
    function createOpenrecChatContainer(chatContainer, movieId) {
        // 既存のコンテンツをクリア
        while (chatContainer.firstChild) {
            chatContainer.removeChild(chatContainer.firstChild);
        }
        
        // チャットコンテナのスタイルを設定
        chatContainer.style.overflow = 'auto';
        chatContainer.style.padding = '10px';
        
        // チャットメッセージを表示するコンテナ
        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'openrec-chat-messages';
        messagesContainer.style.display = 'flex';
        messagesContainer.style.flexDirection = 'column';
        messagesContainer.style.gap = '8px';
        chatContainer.appendChild(messagesContainer);
        
        // 最後に取得したチャットのID
        let lastChatId = 0;
        
        // チャットを取得して表示する関数
        const fetchAndDisplayChats = async () => {
            try {
                const response = await fetch(`https://public.openrec.tv/external/api/v5/movies/${movieId}/chats`);
                if (!response.ok) {
                    throw new Error(`APIエラー: ${response.status}`);
                }
                
                const data = await response.json();
                if (data && Array.isArray(data.data)) {
                    // 新しいチャットメッセージのみをフィルタリング
                    const newChats = data.data.filter(chat => chat.id > lastChatId);
                    
                    if (newChats.length > 0) {
                        // 最後のチャットIDを更新
                        lastChatId = Math.max(...newChats.map(chat => chat.id));
                        
                        // 新しいチャットを表示
                        newChats.forEach(chat => {
                            const chatElement = createChatElement(chat);
                            messagesContainer.appendChild(chatElement);
                        });
                        
                        // 自動スクロール（最新のメッセージが見えるように）
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                }
            } catch (error) {
                console.error('OPENRECチャットの取得に失敗しました:', error);
                
                // エラーメッセージを表示
                if (!document.querySelector('.openrec-chat-error')) {
                    const errorElement = document.createElement('div');
                    errorElement.className = 'openrec-chat-error';
                    errorElement.textContent = 'チャットの取得に失敗しました。';
                    errorElement.style.color = 'red';
                    errorElement.style.padding = '10px';
                    errorElement.style.textAlign = 'center';
                    chatContainer.appendChild(errorElement);
                }
            }
        };
        
        // 初回のチャット取得
        fetchAndDisplayChats();
        
        // 定期的にチャットを更新（5秒ごと）
        chatContainer.openrecChatInterval = setInterval(fetchAndDisplayChats, 5000);
    }
    
    // チャットメッセージの要素を作成する関数
    function createChatElement(chat) {
        const chatElement = document.createElement('div');
        chatElement.className = 'openrec-chat-message';
        chatElement.style.padding = '8px';
        chatElement.style.borderRadius = '4px';
        chatElement.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        
        // ユーザー名
        const usernameElement = document.createElement('span');
        usernameElement.className = 'openrec-chat-username';
        usernameElement.textContent = chat.user ? chat.user.nickname : '匿名';
        usernameElement.style.fontWeight = 'bold';
        usernameElement.style.marginRight = '8px';
        usernameElement.style.color = '#4a90e2';
        
        // メッセージ
        const messageElement = document.createElement('span');
        messageElement.className = 'openrec-chat-text';
        messageElement.textContent = chat.message || '';
        
        // 時間
        const timeElement = document.createElement('span');
        timeElement.className = 'openrec-chat-time';
        const chatTime = new Date(chat.created_at);
        timeElement.textContent = `${chatTime.getHours().toString().padStart(2, '0')}:${chatTime.getMinutes().toString().padStart(2, '0')}`;
        timeElement.style.fontSize = '0.8em';
        timeElement.style.color = '#999';
        timeElement.style.marginLeft = 'auto';
        
        // レイアウト
        chatElement.style.display = 'flex';
        chatElement.style.flexWrap = 'wrap';
        chatElement.style.alignItems = 'center';
        
        chatElement.appendChild(usernameElement);
        chatElement.appendChild(messageElement);
        chatElement.appendChild(timeElement);
        
        return chatElement;
    }

    // チャット透過度スライダーのイベントリスナーを追加
    document.querySelectorAll('.chat-opacity').forEach(slider => {
        slider.addEventListener('input', () => {
            const streamId = slider.getAttribute('data-target');
            updateChatOpacity(streamId, slider.value);
        });
    });

    // チャットの透過度を更新する関数
    function updateChatOpacity(streamId, opacityValue) {
        const chatContainer = document.getElementById(`chat-${streamId}`);
        if (!chatContainer) return;
        
        // 透過度を計算（0.01〜1.0の範囲）
        const opacity = Math.max(opacityValue / 100, 0.01);
        
        // 背景色の透過度を設定
        chatContainer.style.backgroundColor = `rgba(26, 26, 46, ${opacity})`;
        
        // iframeの透過度も設定
        const iframe = chatContainer.querySelector('iframe');
        if (iframe) {
            iframe.style.opacity = Math.max(opacity + 0.1, 0.1); // 最低でも0.1の透過度を保持
        }
        
        // 状態を保存
        if (currentState.streams[streamId]) {
            currentState.streams[streamId].chatOpacity = opacityValue;
            saveStateToURL();
            updateShareUrl();
        }
    }
});

