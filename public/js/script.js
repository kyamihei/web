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
        layout: 'layout-4x2',
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

    // ドラッグ&ドロップの実装
    let draggedElement = null;

    function enableDragAndDrop() {
        const streamPlayers = document.querySelectorAll('.stream-player');
        
        streamPlayers.forEach(player => {
            player.setAttribute('draggable', 'true');
            
            player.addEventListener('dragstart', (e) => {
                draggedElement = player;
                e.dataTransfer.setData('text/plain', player.id);
                player.classList.add('dragging');
            });

            player.addEventListener('dragend', () => {
                draggedElement.classList.remove('dragging');
                draggedElement = null;
            });

            player.addEventListener('dragover', (e) => {
                e.preventDefault();
                player.classList.add('drag-over');
            });

            player.addEventListener('dragleave', () => {
                player.classList.remove('drag-over');
            });

            player.addEventListener('drop', (e) => {
                e.preventDefault();
                player.classList.remove('drag-over');
                
                if (draggedElement && draggedElement !== player) {
                    // プレーヤーの位置を交換
                    const draggedContent = draggedElement.innerHTML;
                    const targetContent = player.innerHTML;
                    
                    player.innerHTML = draggedContent;
                    draggedElement.innerHTML = targetContent;

                    // ストリーム情報も交換
                    const draggedId = draggedElement.id.split('-')[1];
                    const targetId = player.id.split('-')[1];
                    const tempStream = currentState.streams[draggedId];
                    currentState.streams[draggedId] = currentState.streams[targetId];
                    currentState.streams[targetId] = tempStream;

                    saveStateToURL();
                }
            });

            // インラインURL入力の実装
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
        
        // 既存のiframeがあれば削除
        const existingIframe = streamContainer.querySelector('iframe');
        if (existingIframe) {
            existingIframe.remove();
        }
        
        // リセットボタンを削除
        const resetButton = streamContainer.querySelector('.reset-button-container');
        if (resetButton) {
            resetButton.remove();
        }
        
        // プレースホルダーを表示
        const placeholder = streamContainer.querySelector('.placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
        
        // インラインURL入力があれば削除
        const inlineInput = streamContainer.querySelector('.inline-url-input');
        if (inlineInput) {
            inlineInput.remove();
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
        enableDragAndDrop();
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
        streamMenu.classList.add('open');
    });
    
    closeMenu.addEventListener('click', () => {
        streamMenu.classList.remove('open');
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

            enableDragAndDrop();
        });
    });
    
    // 初期状態で4x2レイアウトをアクティブに
    document.getElementById('layout-4x2').classList.add('active');
    
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
        
        // 既存のiframeがあれば削除
        const existingIframe = streamContainer.querySelector('iframe');
        if (existingIframe) {
            existingIframe.remove();
        }
        
        // プレースホルダーを非表示
        const placeholder = streamContainer.querySelector('.placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // インラインURL入力があれば削除
        const inlineInput = streamContainer.querySelector('.inline-url-input');
        if (inlineInput) {
            inlineInput.remove();
        }

        // メイン入力フィールドを更新
        if (mainInput) {
            // プラットフォームと入力値を更新
            const platformSelect = mainInput.querySelector('.platform-select');
            const channelInput = mainInput.querySelector('input');
            if (platformSelect) platformSelect.value = platform;
            if (channelInput) channelInput.value = channelId;
            
            // 非表示状態を解除
            mainInput.classList.remove('hidden');
            updateVisibleStreamInputs();
        }
        
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
        
        // 状態を更新
        currentState.streams[streamId] = { platform, channelId: normalizedChannelId };
        saveStateToURL();
        
        // ドラッグ&ドロップを再有効化
        enableDragAndDrop();
    }
    
    // プラットフォームに応じたスタイルを適用
    function applyPlatformStyles() {
        const platformSelects = document.querySelectorAll('.platform-select');
        platformSelects.forEach(select => {
            const streamInput = select.closest('.stream-input');
            const loadButton = streamInput.querySelector('.load-stream');
            
            // プラットフォームに応じたカラーを適用
            switch(select.value) {
                case 'twitch':
                    loadButton.style.background = 'linear-gradient(135deg, #9146FF 0%, #6441a5 100%)';
                    break;
                case 'youtube':
                    loadButton.style.background = 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)';
                    break;
                case 'twitcasting':
                    loadButton.style.background = 'linear-gradient(135deg, #00a0dc 0%, #0077a2 100%)';
                    break;
                case 'openrec':
                    loadButton.style.background = 'linear-gradient(135deg, #eb5528 0%, #c73e1d 100%)';
                    break;
            }
        });
    }
    
    // プラットフォーム選択時にスタイルを更新
    document.querySelectorAll('.platform-select').forEach(select => {
        select.addEventListener('change', applyPlatformStyles);
    });
    
    // 初期スタイルを適用
    applyPlatformStyles();
    
    // メニュー開閉時のアニメーション
    menuToggle.addEventListener('click', () => {
        document.body.style.overflow = 'hidden'; // スクロール防止
        streamMenu.classList.add('open');
        
        // メニューアイテムのフェードインアニメーション
        const menuItems = streamMenu.querySelectorAll('h3, .layout-buttons, .stream-input, .add-stream-button, .url-help');
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
    
    // // file://プロトコルでの実行時のみ警告メッセージを表示
    // if (window.location.protocol === 'file:') {
    //     const warningDiv = document.createElement('div');
    //     warningDiv.className = 'warning-message';
    //     warningDiv.innerHTML = `
    //         <div class="warning-icon"><i class="fas fa-exclamation-triangle"></i></div>
    //         <div class="warning-content">
    //             <h3>注意</h3>
    //             <p>ファイルとして直接開いた場合、Twitchの埋め込みプレーヤーは動作しません。</p>
    //             <p>Twitchの埋め込みプレーヤーを使用するには、以下の手順でローカルサーバーを使用してください：</p>
    //             <ol>
    //                 <li><code>install-server.bat</code>を実行してローカルサーバーをインストール</li>
    //                 <li><code>start-server.bat</code>を実行してサーバーを起動</li>
    //                 <li>ブラウザで<code>http://localhost:8080</code>にアクセス</li>
    //             </ol>
    //         </div>
    //         <button class="close-warning"><i class="fas fa-times"></i></button>
    //     `;
    //     document.body.insertBefore(warningDiv, document.querySelector('.top-bar'));
        
    //     // 警告メッセージを閉じる機能
    //     const closeWarning = warningDiv.querySelector('.close-warning');
    //     closeWarning.addEventListener('click', () => {
    //         warningDiv.style.opacity = '0';
    //         setTimeout(() => {
    //             warningDiv.remove();
    //         }, 300);
    //     });
    // }
    
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
    loadStateFromURL();
    enableDragAndDrop();
});
