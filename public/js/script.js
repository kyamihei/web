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
    
    // 初期化時にチャットボタンを無効化する
    document.querySelectorAll('.toggle-chat').forEach(button => {
        disableChatButton(button);
    });
    
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
            // レイアウト名の形式を確認し、必要に応じて修正
            let layoutName = state.layout;
            if (!layoutName.startsWith('layout-')) {
                layoutName = `layout-${layoutName}`;
            }
            
            const layoutButton = document.getElementById(layoutName);
            if (layoutButton) {
                // 他のレイアウトボタンからactiveクラスを削除
                document.querySelectorAll('.layout-buttons button').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // 選択されたレイアウトボタンにactiveクラスを追加
                layoutButton.classList.add('active');
                
                // ストリームコンテナにレイアウトクラスを適用
                const streamsContainer = document.querySelector('.streams-container');
                if (streamsContainer) {
                    // 既存のレイアウトクラスを削除
                    streamsContainer.className = 'streams-container';
                    // 新しいレイアウトクラスを追加
                    streamsContainer.classList.add(layoutName);
                    
                    // レイアウトに応じてストリームプレーヤーの表示/非表示を切り替え
                    const streamPlayers = document.querySelectorAll('.stream-player');
                    
                    switch (layoutName) {
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
                }
            } else {
                console.error(`レイアウトボタンが見つかりません: ${layoutName}`);
            }
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
                                    
                                    // 透過度メニューを表示
                                    const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`);
                                    if (opacityControl) {
                                        opacityControl.style.display = 'flex';
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
                                    
                                    // サイズボタンを表示
                                    const sizeButton = document.querySelector(`.toggle-chat-size[data-target="${streamId}"]`);
                                    if (sizeButton) {
                                        sizeButton.style.display = 'flex';
                                    }
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
        loadButton.innerHTML = '<i class="fas fa-play"></i>';
        loadButton.className = 'load-button';
        
        const resetButton = document.createElement('button');
        resetButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
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
                
                // ツイキャスまたはOPENRECの場合、チャットボタンを無効化
                if (platform === 'twitcasting' || platform === 'openrec') {
                    const toggleChatButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
                    const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`);
                    
                    if (toggleChatButton) {
                        disableChatButton(toggleChatButton);
                        toggleChatButton.title = `${platform === 'twitcasting' ? 'ツイキャス' : 'OPENREC'}のチャット機能は現在無効化されています`;
                    }
                    
                    if (opacityControl) {
                        opacityControl.style.display = 'none';
                    }
                }
                
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

    // チャット関連のコントロールを非表示にする関数
    function hideChatControls(streamId) {
        const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`);
        const positionButton = document.querySelector(`.toggle-chat-position[data-target="${streamId}"]`);
        const sizeButton = document.querySelector(`.toggle-chat-size[data-target="${streamId}"]`);
        
        if (opacityControl) opacityControl.style.display = 'none';
        if (positionButton) positionButton.style.display = 'none';
        if (sizeButton) sizeButton.style.display = 'none';
    }

    // ストリームをリセットする関数
    function resetStream(streamId) {
        const streamContainer = document.getElementById(`stream-${streamId}`);
        if (!streamContainer) return;
        
        // プレースホルダーを表示
        streamContainer.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-plus-circle placeholder-icon"></i>
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
        
        // チャットコンテナを削除
        const chatContainer = document.getElementById(`chat-${streamId}`);
        const toggleButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
        
        if (chatContainer) {
            chatContainer.classList.add('hidden');
            while (chatContainer.firstChild) {
                chatContainer.removeChild(chatContainer.firstChild);
            }
            // チャット位置をリセット
            chatContainer.classList.remove('left-position');
            // チャットサイズをリセット
            chatContainer.classList.remove('chat-size-small', 'chat-size-medium', 'chat-size-large');
        }
        
        // チャットボタンを無効化
        if (toggleButton) {
            disableChatButton(toggleButton);
        }
        
        // チャット関連のコントロールを非表示
        hideChatControls(streamId);
        
        // 入力フィールドをリセットして非表示にする
        const streamInput = document.getElementById(`stream-input-${streamId}`);
        if (streamInput) {
            const platformSelect = streamInput.querySelector('.platform-select');
            const channelInput = streamInput.querySelector('input[type="text"]');
            const loadButton = streamInput.querySelector('.load-stream');
            
            if (platformSelect) {
                platformSelect.value = 'twitch';
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
        
        // 状態を更新
        if (currentState.streams[streamId]) {
            delete currentState.streams[streamId];
            saveStateToURL();
        }
        
        updateVisibleStreamInputs();
    }

    // 表示されている入力フィールドの数を更新する関数
    function updateVisibleStreamInputs() {
        visibleStreamInputs = Array.from(document.querySelectorAll('.stream-input:not(.hidden)')).length;
        
        // "追加"ボタンの表示状態を更新
        if (visibleStreamInputs < 10) {
            addStreamButton.classList.remove('hidden');
        } else {
            addStreamButton.classList.add('hidden');
        }
    }
    
    // 配信入力フィールドを追加する機能
    addStreamButton.addEventListener('click', () => {
        if (visibleStreamInputs < 10) {
            // 非表示のストリーム入力フィールドを順番に探す（ストリーム1から優先）
            for (let i = 1; i <= 10; i++) {
                const streamInput = document.getElementById(`stream-input-${i}`);
                if (streamInput && streamInput.classList.contains('hidden')) {
                    streamInput.classList.remove('hidden');
                    updateVisibleStreamInputs();
                    break;
                }
            }
        }
    });
    
    // 削除ボタンのイベントリスナー
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
            }, 300); // 300ミリ秒の遅延
        });
    });

    // インラインURL入力の削除ボタンのイベントリスナー
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
                }, 300); // 300ミリ秒の遅延
            }
        }
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
                    embedUrl = `https://player.twitch.tv/?video=${normalizedChannelId}&parent=${parentParam}&parent=www.${parentParam}&autoplay=true&muted=false&mature=true`;
                } else {
                    // 複数のparentパラメータを追加して互換性を向上
                    embedUrl = `https://player.twitch.tv/?channel=${normalizedChannelId}&parent=${parentParam}&parent=www.${parentParam}&autoplay=true&muted=false&mature=true`;
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
        
        // ストリーム番号を表示する要素を追加
        const streamNumber = document.createElement('div');
        streamNumber.className = 'stream-number';
        streamNumber.textContent = `ストリーム ${streamId}`;
        streamContainer.appendChild(streamNumber);
        
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
        resetButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        resetButton.title = 'リセット';
        resetButton.addEventListener('click', () => resetStream(streamId));
        resetButtonContainer.appendChild(resetButton);
        streamContainer.appendChild(resetButtonContainer);
        
        // メイン入力フィールドを更新
        if (mainInput) {
            const platformSelect = mainInput.querySelector('.platform-select');
            const channelInput = mainInput.querySelector('input');
            const loadButton = mainInput.querySelector('.load-stream');
            
            if (platformSelect) {
                platformSelect.value = platform;
                // 読み込み後はプラットフォーム選択欄を変更不可に設定
                platformSelect.disabled = true;
            }
            if (channelInput) {
                channelInput.value = channelId;
                // URL入力欄を変更不可に設定
                channelInput.disabled = true;
            }
            if (loadButton) {
                // 読み込みボタンを無効化
                loadButton.disabled = true;
                loadButton.style.opacity = '0.5';
                loadButton.style.cursor = 'not-allowed';
            }
            
            // 非表示状態を解除
            mainInput.classList.remove('hidden');
            updateVisibleStreamInputs();
        }
        
        // ツイキャスまたはOPENRECの場合、チャットボタンを無効化
        if (platform === 'twitcasting' || platform === 'openrec') {
            const toggleChatButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
            const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`);
            
            if (toggleChatButton) {
                disableChatButton(toggleChatButton);
                toggleChatButton.title = `${platform === 'twitcasting' ? 'ツイキャス' : 'OPENREC'}のチャット機能は現在無効化されています`;
            }
            
            if (opacityControl) {
                opacityControl.style.display = 'none';
            }
        } else if (platform === 'twitch' || platform === 'youtube') {
            // TwitchまたはYouTubeの場合はチャットボタンを有効化
            const toggleChatButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
            if (toggleChatButton) {
                enableChatButton(toggleChatButton);
            }
        }
        
        // 状態を更新
        currentState.streams[streamId] = { 
            platform, 
            channelId: normalizedChannelId,
            chatVisible: false // チャットの表示状態も保存
        };
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
        select.addEventListener('change', () => {
            applyPlatformStyles();
            
            // ツイキャスまたはOPENRECが選択された場合、チャットボタンをグレーアウト
            const streamId = select.id.split('-')[1];
            const toggleChatButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
            const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`);
            
            if (select.value === 'twitcasting' || select.value === 'openrec') {
                // ツイキャスまたはOPENRECの場合、チャットボタンをグレーアウト
                if (toggleChatButton) {
                    disableChatButton(toggleChatButton);
                    toggleChatButton.title = `${select.value === 'twitcasting' ? 'ツイキャス' : 'OPENREC'}のチャット機能は現在無効化されています`;
                }
                // 透過度コントロールは非表示のまま
                if (opacityControl) opacityControl.style.display = 'none';
            } else {
                // 他のプラットフォームの場合は通常表示
                if (toggleChatButton) {
                    enableChatButton(toggleChatButton);
                }
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
    
    // 初期状態でツイキャスとOPENRECのチャットボタンをグレーアウト
    document.querySelectorAll('.platform-select').forEach(select => {
        if (select.value === 'twitcasting' || select.value === 'openrec') {
            const streamId = select.id.split('-')[1];
            const toggleChatButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
            const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`);
            
            if (toggleChatButton) {
                disableChatButton(toggleChatButton);
                toggleChatButton.title = `${select.value === 'twitcasting' ? 'ツイキャス' : 'OPENREC'}のチャット機能は現在無効化されています`;
            }
            if (opacityControl) opacityControl.style.display = 'none';
        }
    });

    // 共有URLを更新する関数
    function updateShareUrl() {
        const shareUrlInput = document.getElementById('share-url');
        if (shareUrlInput) {
            // 現在の状態から共有用の簡略化された状態を作成
            const shareState = {
                layout: currentState.layout,
                streams: {}
            };
            
            // レイアウト名の形式を確認し、必要に応じて修正
            if (shareState.layout && !shareState.layout.startsWith('layout-')) {
                shareState.layout = `layout-${shareState.layout}`;
            }
            
            // ストリーム情報は配信プラットフォームとチャンネルIDのみを含める
            Object.entries(currentState.streams).forEach(([streamId, streamData]) => {
                if (streamData.platform && streamData.channelId) {
                    shareState.streams[streamId] = {
                        platform: streamData.platform,
                        channelId: streamData.channelId
                        // チャット表示状態、透過度、位置、サイズなどは含めない
                    };
                }
            });
            
            // 簡略化された状態をエンコード
            const stateString = btoa(JSON.stringify(shareState));
            
            // 共有用URLを生成
            shareUrlInput.value = `${window.location.origin}${window.location.pathname}?state=${stateString}`;
        }
    }

    // 全体をリセットする関数
    function resetAll() {
        // まず、すべてのチャットをOFFにする
        const chatContainers = document.querySelectorAll('.chat-container');
        const streamPlayers = document.querySelectorAll('.stream-player');
        const toggleButtons = document.querySelectorAll('.toggle-chat');
        
        chatContainers.forEach((container, index) => {
            if (!container.classList.contains('hidden')) {
                container.classList.add('hidden');
                streamPlayers[index].classList.remove('with-chat');
                toggleButtons[index].classList.remove('active');
            }
        });
        
        // 遅延を入れてからリセット処理を実行
        setTimeout(() => {
            // すべてのストリームをリセット
            for (let i = 1; i <= 10; i++) {
                resetStream(i);
            }
            
            // レイアウトを2x2に戻す
            document.getElementById('layout-2x2').click();
            
            // すべての入力フィールドを非表示に
            document.querySelectorAll('.stream-input').forEach(input => {
                input.classList.add('hidden');
                
                // 入力フィールドの内容をリセット
                const platformSelect = input.querySelector('.platform-select');
                const channelInput = input.querySelector('input[type="text"]');
                if (platformSelect) {
                    platformSelect.value = 'twitch';
                    platformSelect.disabled = false;
                }
                if (channelInput) {
                    channelInput.value = '';
                }
            });
            
            // 表示されている入力フィールドの数を0に
            visibleStreamInputs = 0;
            
            // 状態をリセット
            currentState = {
                layout: 'layout-2x2',
                streams: {}
            };

            // URLをクリア（クエリパラメータを削除）
            const newURL = window.location.pathname;
            window.history.pushState({}, '', newURL);
            
            // "追加"ボタンを表示
            addStreamButton.classList.remove('hidden');

            // 共有URLを更新
            updateShareUrl();
            
            // 表示されている入力フィールドの数を更新
            updateVisibleStreamInputs();
        }, 300); // 300ミリ秒の遅延
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

    // チャット位置切替ボタンのイベントリスナーを追加
    document.querySelectorAll('.toggle-chat-position').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const streamId = button.getAttribute('data-target');
            if (streamId) {
                toggleChatPosition(streamId);
            } else {
                console.error('data-target属性が見つかりません');
            }
        });
        
        // 初期状態では非表示
        button.style.display = 'none';
    });

    // チャットサイズ切替ボタンのイベントリスナーを追加
    document.querySelectorAll('.toggle-chat-size').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // イベントの伝播を停止
            const streamId = button.getAttribute('data-target');
            if (streamId) {
                toggleChatSize(streamId);
            } else {
                console.error('data-target属性が見つかりません');
            }
        });
        
        // 初期状態では非表示
        button.style.display = 'none';
    });

    // チャット表示を切り替える関数
    function toggleChat(streamId) {
        const streamPlayer = document.getElementById(`stream-${streamId}`);
        const chatContainer = document.getElementById(`chat-${streamId}`);
        const toggleButton = document.querySelector(`.toggle-chat[data-target="${streamId}"]`);
        const opacityControl = document.querySelector(`.opacity-control[data-target="${streamId}"]`) || 
                              toggleButton.nextElementSibling;
        const positionButton = document.querySelector(`.toggle-chat-position[data-target="${streamId}"]`);
        const sizeButton = document.querySelector(`.toggle-chat-size[data-target="${streamId}"]`);
        
        // 要素が存在するか確認
        if (!streamPlayer || !chatContainer || !toggleButton) {
            console.error(`要素が見つかりません: stream-${streamId}, chat-${streamId}, または toggle-chat[data-target="${streamId}"]`);
            return;
        }
        
        // ボタンが無効化されている場合は処理を中止
        if (toggleButton.classList.contains('disabled')) {
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
        
        // ツイキャスまたはOPENRECの場合はチャット機能を無効化
        if (platform === 'twitcasting' || platform === 'openrec') {
            console.log(`${platform === 'twitcasting' ? 'ツイキャス' : 'OPENREC'}のチャット機能は現在無効化されています`);
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
                    chatUrl = `https://www.twitch.tv/embed/${twitchChannelId}/chat?parent=${parentParam}&parent=www.${parentParam}&darkpopout=true&transparent=true&mature=true`;
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
                    
                    chatUrl = `https://www.openrec.tv/embed/chat/${openrecId}`;
                    break;
                    
                default:
                    alert('このプラットフォームのチャットはサポートされていません。');
                    return;
            }
            
            // iframeを作成
            iframe = document.createElement('iframe');
            iframe.src = chatUrl;
            iframe.classList.add('chat-iframe');
            
            // 透明な背景を設定
            iframe.style.backgroundColor = 'transparent';
            iframe.setAttribute('allowtransparency', 'true');
            
            // 現在のチャットサイズに応じてiframeの高さを設定
            // if (chatContainer.classList.contains('chat-size-small')) {
            //     iframe.style.height = '100%';
            //     iframe.style.transform = 'scale(1)';
            // } else if (chatContainer.classList.contains('chat-size-medium')) {
            //     iframe.style.height = '100%';
            //     iframe.style.transform = 'scale(1)';
            // } else {
            //     iframe.style.height = '100%';
            //     iframe.style.transform = 'scale(1)';
            // }
            
            // 既存のiframeがあれば削除
            while (chatContainer.firstChild) {
                chatContainer.removeChild(chatContainer.firstChild);
            }
            
            // 新しいiframeを追加
            chatContainer.appendChild(iframe);
            chatContainer.classList.remove('hidden');
            chatContainer.style.backgroundColor = 'transparent';
            streamPlayer.classList.add('with-chat');
            toggleButton.classList.add('active');
            
            // チャット位置を適用
            if (currentState.streams[streamId] && currentState.streams[streamId].chatPosition === 'left') {
                chatContainer.classList.add('left-position');
                if (positionButton) positionButton.classList.add('left-active');
            } else {
                chatContainer.classList.remove('left-position');
                if (positionButton) positionButton.classList.remove('left-active');
            }
            
            // チャットサイズを適用
            if (currentState.streams[streamId] && currentState.streams[streamId].chatSize) {
                applyChatSize(streamId, currentState.streams[streamId].chatSize);
            } else {
                // デフォルトは大サイズ
                applyChatSize(streamId, 'medium');
            }
            
            // 透過度コントロールを表示
            if (opacityControl) {
                opacityControl.style.display = 'flex';
            }
            
            // チャット位置切替ボタンを表示
            if (positionButton) {
                positionButton.style.display = 'flex';
            }
            
            // チャットサイズ切替ボタンを表示
            if (sizeButton) {
                sizeButton.style.display = 'flex';
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
                // チャット位置の状態を保持
                if (!currentState.streams[streamId].hasOwnProperty('chatPosition')) {
                    currentState.streams[streamId].chatPosition = chatContainer.classList.contains('left-position') ? 'left' : 'right';
                }
                // チャットサイズの状態を保持
                if (!currentState.streams[streamId].hasOwnProperty('chatSize')) {
                    currentState.streams[streamId].chatSize = 'large'; // デフォルトは大サイズ
                }
                saveStateToURL();
                updateShareUrl();
            }
        } else {
            // チャットが表示されている場合は非表示にする
            chatContainer.classList.add('hidden');
            streamPlayer.classList.remove('with-chat');
            toggleButton.classList.remove('active');
            
            // チャット関連のコントロールを非表示
            hideChatControls(streamId);
            
            // 状態を更新
            if (currentState.streams[streamId]) {
                currentState.streams[streamId].chatVisible = false;
                saveStateToURL();
                updateShareUrl();
            }
        }
    }

    // チャット位置を切り替える関数
    function toggleChatPosition(streamId) {
        const chatContainer = document.getElementById(`chat-${streamId}`);
        const positionButton = document.querySelector(`.toggle-chat-position[data-target="${streamId}"]`);
        
        if (!chatContainer || !positionButton) {
            console.error(`要素が見つかりません: chat-${streamId} または toggle-chat-position[data-target="${streamId}"]`);
            return;
        }
        
        // チャットが表示されていない場合は何もしない
        if (chatContainer.classList.contains('hidden')) {
            return;
        }
        
        // 位置を切り替え
        if (chatContainer.classList.contains('left-position')) {
            // 左から右へ
            chatContainer.classList.remove('left-position');
            positionButton.classList.remove('left-active');
            positionButton.title = '左側に表示';
            
            // 状態を更新
            if (currentState.streams[streamId]) {
                currentState.streams[streamId].chatPosition = 'right';
            }
        } else {
            // 右から左へ
            chatContainer.classList.add('left-position');
            positionButton.classList.add('left-active');
            positionButton.title = '右側に表示';
            
            // 状態を更新
            if (currentState.streams[streamId]) {
                currentState.streams[streamId].chatPosition = 'left';
            }
        }
        
        // 状態を保存
        saveStateToURL();
        updateShareUrl();
    }

    // チャットサイズを適用する関数
    function applyChatSize(streamId, size) {
        const chatContainer = document.getElementById(`chat-${streamId}`);
        const sizeButton = document.querySelector(`.toggle-chat-size[data-target="${streamId}"]`);
        
        if (!chatContainer || !sizeButton) return;
        
        // 既存のサイズクラスを削除
        chatContainer.classList.remove('chat-size-small', 'chat-size-medium', 'chat-size-large');
        
        // サイズに応じたクラスを追加
        switch (size) {
            case 'small':
                chatContainer.classList.add('chat-size-small');
                sizeButton.innerHTML = '<i class="fas fa-text-height"></i><span>小</span>';
                sizeButton.title = '中サイズに変更';
                break;
            case 'medium':
                chatContainer.classList.add('chat-size-medium');
                sizeButton.innerHTML = '<i class="fas fa-text-height"></i><span>中</span>';
                sizeButton.title = '大サイズに変更';
                break;
            case 'large':
                chatContainer.classList.add('chat-size-large');
                sizeButton.innerHTML = '<i class="fas fa-text-height"></i><span>大</span>';
                sizeButton.title = '小サイズに変更';
                break;
        }
        
        // iframeのスケールを設定
        const iframe = chatContainer.querySelector('iframe');
        if (iframe) {
            switch (size) {
                case 'small':
                    chatContainer.style.width = '20%';
                    break;
                case 'medium':
                    chatContainer.style.width = '25%';
                    break;
                case 'large':
                    chatContainer.style.width = '30%';
                    break;
            }
            iframe.style.width = '100%';
            iframe.style.height = '100%';
        }
        
        // 状態を保存
        if (currentState.streams[streamId]) {
            currentState.streams[streamId].chatSize = size;
            saveStateToURL();
            updateShareUrl();
        }
    }

    // チャットサイズを切り替える関数
    function toggleChatSize(streamId) {
        const chatContainer = document.getElementById(`chat-${streamId}`);
        if (!chatContainer || chatContainer.classList.contains('hidden')) return;
        
        // 現在のサイズを取得
        let currentSize = 'medium'; // デフォルト
        
        if (chatContainer.classList.contains('chat-size-small')) {
            currentSize = 'small';
        } else if (chatContainer.classList.contains('chat-size-large')) {
            currentSize = 'large';
        }
        
        // 次のサイズに切り替え
        let nextSize;
        switch (currentSize) {
            case 'small':
                nextSize = 'medium';
                break;
            case 'medium':
                nextSize = 'large';
                break;
            case 'large':
                nextSize = 'small';
                break;
        }
        
        // 新しいサイズを適用
        applyChatSize(streamId, nextSize);
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
        
        // 背景色を完全に透明に設定
        chatContainer.style.backgroundColor = `rgba(0, 0, 0, 0)`;
        
        // iframeの透過度も設定
        const iframe = chatContainer.querySelector('iframe');
        if (iframe) {
            iframe.style.opacity = Math.max(opacity + 0.1, 0.1); // 最低でも0.1の透過度を保持
            
            // iframeの背景も透明に
            iframe.onload = function() {
                try {
                    // iframeの内部スタイルにアクセスして背景を透明に
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    
                    // スタイルを注入
                    const style = iframeDoc.createElement('style');
                    style.textContent = `
                        body, html, div, section {
                            background: transparent !important;
                            background-color: transparent !important;
                        }
                        .chat-line__message, .chat-line__status, .chat-author__display-name, .text-fragment, .chat-line__message--badges {
                            text-shadow: 0 0 2px #000, 0 0 2px #000 !important;
                        }
                    `;
                    iframeDoc.head.appendChild(style);
                } catch (e) {
                    console.log('iframeへのアクセスが制限されています:', e);
                }
            };
        }
        
        // 状態を更新
        if (currentState.streams[streamId]) {
            currentState.streams[streamId].chatOpacity = opacityValue;
            saveStateToURL();
        }
    }
});