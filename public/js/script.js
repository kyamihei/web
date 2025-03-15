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
        if (visibleStreamInputs < 8) {
            addStreamButton.classList.remove('hidden');
        } else {
            addStreamButton.classList.add('hidden');
        }
    }

    // 配信入力フィールドを追加する機能
    addStreamButton.addEventListener('click', () => {
        if (visibleStreamInputs < 8) {
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
            
            if (layoutClass === 'layout-1x2') {
                streamPlayers.forEach((player, index) => {
                    player.style.display = index < 2 ? 'flex' : 'none';
                });
            } else if (layoutClass === 'layout-2x1') {
                streamPlayers.forEach((player, index) => {
                    player.style.display = index < 2 ? 'flex' : 'none';
                });
            } else if (layoutClass === 'layout-1x3') {
                streamPlayers.forEach((player, index) => {
                    player.style.display = index < 3 ? 'flex' : 'none';
                });
            } else if (layoutClass === 'layout-3x1') {
                streamPlayers.forEach((player, index) => {
                    player.style.display = index < 3 ? 'flex' : 'none';
                });
            } else if (layoutClass === 'layout-4x2' || layoutClass === 'layout-2x4') {
                streamPlayers.forEach(player => {
                    player.style.display = 'flex';
                });
            } else {
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
                alert('チャンネルIDまたは動画IDを入力してください');
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
        `;

        // レイアウトボタンのイベントリスナーを再設定
        const buttons = layoutButtons.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                 // もしこのボタンがcurrentStateのレイアウトと一致するなら、アクティブにする
                if (button.id === currentState.layout) {
                    button.classList.add('active');
                }
                
                // レイアウトクラスの切り替え
                const layoutClass = button.id;
                streamsContainer.className = 'streams-container ' + layoutClass;
                
                // 状態を更新
                currentState.layout = layoutClass;
                saveStateToURL();
                
                // レイアウトに応じてストリームプレーヤーの表示/非表示を切り替え
                const streamPlayers = document.querySelectorAll('.stream-player');
                
                if (layoutClass === 'layout-1x2') {
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 2 ? 'flex' : 'none';
                    });
                } else if (layoutClass === 'layout-2x1') {
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 2 ? 'flex' : 'none';
                    });
                } else if (layoutClass === 'layout-1x3') {
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 3 ? 'flex' : 'none';
                    });
                } else if (layoutClass === 'layout-3x1') {
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 3 ? 'flex' : 'none';
                    });
                } else if (layoutClass === 'layout-4x2' || layoutClass === 'layout-2x4') {
                    streamPlayers.forEach(player => {
                        player.style.display = 'flex';
                    });
                } else {
                    streamPlayers.forEach((player, index) => {
                        player.style.display = index < 4 ? 'flex' : 'none';
                    });
                }

                initializeStreamPlayers();
            });
        });
    }

    createLayoutButtons();
});

