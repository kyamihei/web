/**
 * ふくまどくん - ライブマルチビューア
 * メインJavaScriptファイル
 */

document.addEventListener('DOMContentLoaded', () => {
    // 定数と変数の定義
    const CONFIG = {
        MAX_STREAMS: 10,
        DEFAULT_LAYOUT: 'layout-2x2',
        DEFAULT_PLATFORM: 'twitch',
        DEFAULT_CHAT_OPACITY: 70,
        ANIMATION_DELAY: 300 // ミリ秒
    };
    
    // DOM要素の取得
    const elements = {
        streamsContainer: document.querySelector('.streams-container'),
        streamMenu: document.getElementById('stream-menu'),
        menuToggle: document.getElementById('menu-toggle'),
        closeMenu: document.getElementById('close-menu'),
        addStreamButton: document.getElementById('add-stream'),
        layoutButtons: document.querySelector('.layout-buttons'),
        streamInputs: Array.from(document.querySelectorAll('.stream-input')),
        streamPlayers: Array.from(document.querySelectorAll('.stream-player')),
        chatContainers: Array.from(document.querySelectorAll('.chat-container')),
        toggleChatButtons: Array.from(document.querySelectorAll('.toggle-chat')),
        opacityControls: Array.from(document.querySelectorAll('.opacity-control')),
        streamInputTemplate: document.getElementById('stream-input-template'),
        streamPlayerTemplate: document.getElementById('stream-player-template')
    };
    
    // Service Workerを無効化（エラー対策）
    disableServiceWorker();
    
    // 状態管理
    let state = {
        layout: CONFIG.DEFAULT_LAYOUT,
        streams: {},
        visibleStreamInputs: 0
    };
    
    // 初期化
    function initialize() {
        // レイアウトボタンを動的に生成
        createLayoutButtons();
        
        // 初期化時に透過度メニューを非表示にする
        elements.opacityControls.forEach(control => {
            control.style.display = 'none';
        });
        
        // 初期化時にチャットボタンを無効化する
        elements.toggleChatButtons.forEach(button => {
            disableChatButton(button);
        });
        
        // ストリームプレーヤーの初期化
        initializeStreamPlayers();
        
        // 削除ボタンのイベントリスナーを設定
        setupDeleteButtons();
        
        // 配信入力フィールドを追加するボタンのイベントリスナー
        setupAddStreamButton();
        
        // メニュー開閉のイベントリスナー
        setupMenuToggle();
        
        // 全画面表示のイベントリスナー
        setupFullscreenToggle();
        
        // URLからステートを復元
        loadStateFromURL();
        
        // 表示されている入力フィールドの数を更新
        updateVisibleStreamInputs();
    }
    
    // Service Workerを無効化する関数
    function disableServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    registration.unregister();
                    console.log('Service Workerを無効化しました');
                }
            });
        }
    }
    
    // レイアウトボタンを動的に生成する関数
    function createLayoutButtons() {
        const layouts = [
            { id: 'layout-2x2', text: '2x2' },
            { id: 'layout-1x2', text: '1x2' },
            { id: 'layout-2x1', text: '2x1' },
            { id: 'layout-1x3', text: '1x3' },
            { id: 'layout-3x1', text: '3x1' },
            { id: 'layout-2x3', text: '2x3' },
            { id: 'layout-3x2', text: '3x2' },
            { id: 'layout-1x4', text: '1x4' },
            { id: 'layout-4x1', text: '4x1' },
            { id: 'layout-4x2', text: '4x2' },
            { id: 'layout-2x4', text: '2x4' },
            { id: 'layout-5x2', text: '5x2' },
            { id: 'layout-2x5', text: '2x5' }
        ];
        
        layouts.forEach(layout => {
            const button = document.createElement('button');
            button.id = layout.id;
            button.textContent = layout.text;
            button.setAttribute('aria-label', `${layout.text}レイアウト`);
            
            if (layout.id === CONFIG.DEFAULT_LAYOUT) {
                button.classList.add('active');
            }
            
            button.addEventListener('click', () => {
                changeLayout(layout.id);
            });
            
            elements.layoutButtons.appendChild(button);
        });
    }
    
    // チャットボタンを無効化する関数
    function disableChatButton(button) {
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
        button.style.backgroundColor = '#888';
        button.title = 'チャット機能は配信が読み込まれていません';
        button.classList.add('disabled');
    }
    
    // チャットボタンを有効化する関数
    function enableChatButton(button) {
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.style.backgroundColor = '';
        button.title = 'チャットを表示/非表示';
        button.classList.remove('disabled');
    }
    
    // チャット関連のコントロールを非表示にする関数
    function hideChatControls(streamId) {
        const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`);
        const positionButton = document.querySelector(`.toggle-chat-position[data-target="${streamId}"]`);
        const sizeButton = document.querySelector(`.toggle-chat-size[data-target="${streamId}"]`);
        
        if (opacityControl) opacityControl.style.display = 'none';
        if (positionButton) positionButton.style.display = 'none';
        if (sizeButton) sizeButton.style.display = 'none';
    }
    
    // URLからステートを復元する関数
    function loadStateFromURL() {
        const params = new URLSearchParams(window.location.search);
        const stateParam = params.get('state');
        
        if (stateParam) {
            try {
                const decodedState = JSON.parse(atob(stateParam));
                state = { ...state, ...decodedState };
                applyState(state);
            } catch (e) {
                console.error('URLからの状態の読み込みに失敗しました:', e);
            }
        }
    }
    
    // ステートをURLに保存する関数
    function saveStateToURL() {
        const stateString = btoa(JSON.stringify({
            layout: state.layout,
            streams: state.streams
        }));
        
        const newURL = `${window.location.pathname}?state=${stateString}`;
        window.history.pushState({}, '', newURL);
        
        // 共有URLを更新
        updateShareUrl();
    }
    
    // ステートを適用する関数
    function applyState(state) {
        // レイアウトを適用
        if (state.layout) {
            changeLayout(state.layout);
        }
        
        // ストリーム情報を適用
        if (state.streams) {
            Object.entries(state.streams).forEach(([streamId, streamData]) => {
                // ストリーム入力フィールドを表示
                const streamInput = document.getElementById(`stream-input-${streamId}`);
                if (streamInput) {
                    streamInput.classList.remove('hidden');
                    
                    // プラットフォームとチャンネルIDを設定
                    const platformSelect = document.getElementById(`platform-${streamId}`);
                    const channelInput = document.getElementById(`channel-${streamId}`);
                    
                    if (platformSelect && channelInput && streamData.platform && streamData.channelId) {
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
                                }
                                
                                // チャット位置を復元
                                if (streamData.chatPosition === 'left') {
                                    const chatContainer = document.getElementById(`chat-${streamId}`);
                                    const positionButton = document.querySelector(`.toggle-chat-position[data-target="${streamId}"]`);
                                    
                                    if (chatContainer) {
                                        chatContainer.classList.add('left-position');
                                    }
                                    
                                    if (positionButton) {
                                        positionButton.classList.add('left-active');
                                        positionButton.title = '右側に表示';
                                        positionButton.style.display = 'flex';
                                    }
                                }
                                
                                // チャットサイズを復元
                                if (streamData.chatSize) {
                                    applyChatSize(streamId, streamData.chatSize);
                                }
                            }, 1000);
                        }
                    }
                }
            });
        }
        
        // 表示されている入力フィールドの数を更新
        updateVisibleStreamInputs();
    }
    
    // レイアウトを変更する関数
    function changeLayout(layoutName) {
        // レイアウト名の形式を確認し、必要に応じて修正
        if (!layoutName.startsWith('layout-')) {
            layoutName = `layout-${layoutName}`;
        }
        
        // 他のレイアウトボタンからactiveクラスを削除
        document.querySelectorAll('.layout-buttons button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 選択されたレイアウトボタンにactiveクラスを追加
        const layoutButton = document.getElementById(layoutName);
        if (layoutButton) {
            layoutButton.classList.add('active');
            
            // ストリームコンテナにレイアウトクラスを適用
            elements.streamsContainer.className = 'streams-container';
            elements.streamsContainer.classList.add(layoutName);
            
            // レイアウトに応じてストリームプレーヤーの表示/非表示を切り替え
            updateStreamPlayersVisibility(layoutName);
            
            // 状態を更新
            state.layout = layoutName;
            saveStateToURL();
        }
    }
    
    // レイアウトに応じてストリームプレーヤーの表示/非表示を切り替える関数
    function updateStreamPlayersVisibility(layoutName) {
        const streamPlayers = document.querySelectorAll('.stream-player');
        let visibleCount = 4; // デフォルトは2x2で4つ
        
        switch (layoutName) {
            case 'layout-1x2':
            case 'layout-2x1':
                visibleCount = 2;
                break;
            case 'layout-1x3':
            case 'layout-3x1':
                visibleCount = 3;
                break;
            case 'layout-2x3':
            case 'layout-3x2':
                visibleCount = 6;
                break;
            case 'layout-1x4':
            case 'layout-4x1':
                visibleCount = 4;
                break;
            case 'layout-4x2':
            case 'layout-2x4':
                visibleCount = 8;
                break;
            case 'layout-5x2':
            case 'layout-2x5':
                visibleCount = 10;
                break;
        }
        
        streamPlayers.forEach((player, index) => {
            player.style.display = index < visibleCount ? 'flex' : 'none';
        });
    }
    
    // ストリームプレーヤーの初期化
    function initializeStreamPlayers() {
        elements.streamPlayers.forEach(player => {
            const placeholder = player.querySelector('.placeholder');
            if (placeholder) {
                placeholder.addEventListener('click', () => {
                    const streamId = player.id.split('-')[1];
                    createInlineUrlInput(player, streamId);
                });
            }
        });
    }
    
    // インラインURL入力を作成する関数
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
        platformSelect.setAttribute('aria-label', 'プラットフォーム選択');
        
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.placeholder = 'URLまたはチャンネルIDを入力';
        urlInput.setAttribute('aria-label', 'URL/チャンネルID');
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        const loadButton = document.createElement('button');
        loadButton.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i>';
        loadButton.className = 'load-button';
        loadButton.setAttribute('aria-label', '読み込み');
        
        const resetButton = document.createElement('button');
        resetButton.innerHTML = '<i class="fas fa-trash-alt" aria-hidden="true"></i>';
        resetButton.className = 'reset-button';
        resetButton.setAttribute('aria-label', '削除');
        
        buttonContainer.appendChild(loadButton);
        buttonContainer.appendChild(resetButton);
        
        // 読み込みボタンのイベントリスナー
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
                state.streams[streamId] = { platform, channelId };
                saveStateToURL();
            }
            
            inputContainer.remove();
        });
        
        // リセットボタンのイベントリスナー
        resetButton.addEventListener('click', () => {
            // まずチャットをOFFにする
            const chatContainer = document.getElementById(`chat-${streamId}`);
            const toggleButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
            const streamPlayer = document.getElementById(`stream-${streamId}`);
            
            if (chatContainer && toggleButton && streamPlayer) {
                // チャットが表示されている場合は非表示にする
                if (!chatContainer.classList.contains('hidden')) {
                    chatContainer.classList.add('hidden');
                    toggleButton.classList.remove('active');
                    streamPlayer.classList.remove('with-chat');
                }
            }
            
            // 少し遅延を入れてから削除処理を実行
            setTimeout(() => {
                resetStream(streamId);
            }, CONFIG.ANIMATION_DELAY);
            
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
        if (!streamContainer) return;
        
        // プレースホルダーを表示
        streamContainer.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-plus-circle placeholder-icon" aria-hidden="true"></i>
                <p>ストリーム ${streamId}</p>
                <p>ここをクリックして配信を追加</p>
            </div>
        `;
        
        // プレースホルダーのクリックイベントを追加
        const placeholder = streamContainer.querySelector('.placeholder');
        if (placeholder) {
            placeholder.addEventListener('click', () => {
                createInlineUrlInput(streamContainer, streamId);
            });
        }
        
        // チャットコンテナを追加
        const chatContainer = document.createElement('div');
        chatContainer.id = `chat-${streamId}`;
        chatContainer.className = 'chat-container hidden';
        chatContainer.setAttribute('aria-live', 'polite');
        streamContainer.appendChild(chatContainer);
        
        // 入力フィールドをリセットして非表示にする
        const streamInput = document.getElementById(`stream-input-${streamId}`);
        if (streamInput) {
            const platformSelect = streamInput.querySelector('.platform-select');
            const channelInput = streamInput.querySelector('input[type="text"]');
            const loadButton = streamInput.querySelector('.load-stream');
            
            if (platformSelect) {
                platformSelect.value = CONFIG.DEFAULT_PLATFORM;
                platformSelect.disabled = false;
            }
            if (channelInput) {
                channelInput.value = '';
                channelInput.disabled = false;
            }
            if (loadButton) {
                loadButton.disabled = false;
                loadButton.style.opacity = '1';
                loadButton.style.cursor = 'pointer';
            }
            streamInput.classList.add('hidden');
        }
        
        // チャットボタンを無効化
        const toggleButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
        if (toggleButton) {
            disableChatButton(toggleButton);
        }
        
        // チャット関連のコントロールを非表示
        hideChatControls(streamId);
        
        // 状態を更新
        if (state.streams[streamId]) {
            delete state.streams[streamId];
            saveStateToURL();
        }
        
        updateVisibleStreamInputs();
    }
    
    // 表示されている入力フィールドの数を更新する関数
    function updateVisibleStreamInputs() {
        state.visibleStreamInputs = Array.from(document.querySelectorAll('.stream-input:not(.hidden)')).length;
        
        // "追加"ボタンの表示状態を更新
        if (state.visibleStreamInputs < CONFIG.MAX_STREAMS) {
            elements.addStreamButton.classList.remove('hidden');
        } else {
            elements.addStreamButton.classList.add('hidden');
        }
    }
    
    // 配信入力フィールドを追加するボタンのイベントリスナーを設定
    function setupAddStreamButton() {
        elements.addStreamButton.addEventListener('click', () => {
            if (state.visibleStreamInputs < CONFIG.MAX_STREAMS) {
                // 非表示のストリーム入力フィールドを順番に探す（ストリーム1から優先）
                for (let i = 1; i <= CONFIG.MAX_STREAMS; i++) {
                    const streamInput = document.getElementById(`stream-input-${i}`);
                    if (streamInput && streamInput.classList.contains('hidden')) {
                        streamInput.classList.remove('hidden');
                        updateVisibleStreamInputs();
                        break;
                    }
                }
            }
        });
    }
    
    // 削除ボタンのイベントリスナーを設定
    function setupDeleteButtons() {
        // メニュー内の削除ボタン
        document.querySelectorAll('.delete-stream').forEach(button => {
            button.addEventListener('click', () => {
                const streamId = button.getAttribute('data-target');
                
                // まずチャットをOFFにする
                const chatContainer = document.getElementById(`chat-${streamId}`);
                const toggleButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
                const streamPlayer = document.getElementById(`stream-${streamId}`);
                
                if (chatContainer && toggleButton && streamPlayer) {
                    // チャットが表示されている場合は非表示にする
                    if (!chatContainer.classList.contains('hidden')) {
                        chatContainer.classList.add('hidden');
                        toggleButton.classList.remove('active');
                        streamPlayer.classList.remove('with-chat');
                    }
                }
                
                // 少し遅延を入れてから削除処理を実行
                setTimeout(() => {
                    resetStream(streamId);
                }, CONFIG.ANIMATION_DELAY);
            });
        });
        
        // ストリームプレーヤーのリセットボタン
        document.addEventListener('click', (e) => {
            if (e.target.closest('.stream-reset-button')) {
                const resetButton = e.target.closest('.stream-reset-button');
                const streamId = resetButton.getAttribute('data-target');
                
                // まずチャットをOFFにする
                const chatContainer = document.getElementById(`chat-${streamId}`);
                const toggleButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
                const streamPlayer = document.getElementById(`stream-${streamId}`);
                
                if (chatContainer && toggleButton && streamPlayer) {
                    // チャットが表示されている場合は非表示にする
                    if (!chatContainer.classList.contains('hidden')) {
                        chatContainer.classList.add('hidden');
                        toggleButton.classList.remove('active');
                        streamPlayer.classList.remove('with-chat');
                    }
                }
                
                // 少し遅延を入れてから削除処理を実行
                setTimeout(() => {
                    resetStream(streamId);
                }, CONFIG.ANIMATION_DELAY);
            }
        });
        
        // インラインURL入力の削除ボタン
        document.addEventListener('click', (e) => {
            if (e.target.closest('.reset-button')) {
                const streamContainer = e.target.closest('.stream-player');
                if (streamContainer) {
                    const streamId = streamContainer.id.split('-')[1];
                    
                    // まずチャットをOFFにする
                    const chatContainer = document.getElementById(`chat-${streamId}`);
                    const toggleButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
                    const streamPlayer = document.getElementById(`stream-${streamId}`);
                    
                    if (chatContainer && toggleButton && streamPlayer) {
                        // チャットが表示されている場合は非表示にする
                        if (!chatContainer.classList.contains('hidden')) {
                            chatContainer.classList.add('hidden');
                            toggleButton.classList.remove('active');
                            streamPlayer.classList.remove('with-chat');
                        }
                    }
                    
                    // 少し遅延を入れてから削除処理を実行
                    setTimeout(() => {
                        resetStream(streamId);
                    }, CONFIG.ANIMATION_DELAY);
                }
            }
        });
    }
    
    // メニュー開閉のイベントリスナーを設定
    function setupMenuToggle() {
        elements.menuToggle.addEventListener('click', () => {
            elements.streamMenu.classList.toggle('open');
            const isOpen = elements.streamMenu.classList.contains('open');
            elements.menuToggle.setAttribute('aria-expanded', isOpen);
            elements.streamMenu.setAttribute('aria-hidden', !isOpen);
        });
        
        elements.closeMenu.addEventListener('click', () => {
            elements.streamMenu.classList.remove('open');
            elements.menuToggle.setAttribute('aria-expanded', false);
            elements.streamMenu.setAttribute('aria-hidden', true);
        });
    }
    
    // 全画面表示のイベントリスナーを設定
    function setupFullscreenToggle() {
        const fullscreenToggle = document.getElementById('fullscreen-toggle');
        if (fullscreenToggle) {
            fullscreenToggle.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.error(`全画面表示エラー: ${err.message}`);
                    });
                    fullscreenToggle.innerHTML = '<i class="fas fa-compress" aria-hidden="true"></i>';
                    fullscreenToggle.title = '全画面表示を終了';
                } else {
                    document.exitFullscreen();
                    fullscreenToggle.innerHTML = '<i class="fas fa-expand" aria-hidden="true"></i>';
                    fullscreenToggle.title = '全画面表示';
                }
            });
            
            document.addEventListener('fullscreenchange', () => {
                if (!document.fullscreenElement) {
                    fullscreenToggle.innerHTML = '<i class="fas fa-expand" aria-hidden="true"></i>';
                    fullscreenToggle.title = '全画面表示';
                }
            });
        }
    }
    
    // 共有URLを更新する関数
    function updateShareUrl() {
        const shareUrlInput = document.getElementById('share-url');
        if (shareUrlInput) {
            shareUrlInput.value = window.location.href;
        }
    }

    // 初期化
    initialize();
});