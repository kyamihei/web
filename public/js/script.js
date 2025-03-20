document.addEventListener('DOMContentLoaded', () => {
    // ... (rest of the code remains the same)

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

    // ストリームプレーヤーのリセットボタンのイベントリスナー
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
            }, 300); // 300ミリ秒の遅延
        }
    });

    createShareUrlContainer();
    
    // ストリームプレーヤーのホバーエフェクト
    document.querySelectorAll('.stream-player').forEach(player => {
        player.addEventListener('mouseenter', () => {
            const resetButton = player.querySelector('.reset-button-container');
            if (resetButton) {
                resetButton.style.opacity = '1';
            }
        });
        
        player.addEventListener('mouseleave', () => {
            const resetButton = player.querySelector('.reset-button-container');
            if (resetButton) {
                resetButton.style.opacity = '0';
            }
        });
    });

    // レイアウト選択ポップアップを表示する関数
    function showLayoutSelectionPopup() {
        // 既存のポップアップがあれば削除
        const existingPopup = document.getElementById('layout-selection-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // ポップアップの背景を作成
        const popupOverlay = document.createElement('div');
        popupOverlay.id = 'layout-popup-overlay';
        popupOverlay.style.position = 'fixed';
        popupOverlay.style.top = '0';
        popupOverlay.style.left = '0';
        popupOverlay.style.width = '100%';
        popupOverlay.style.height = '100%';
        popupOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        popupOverlay.style.zIndex = '2000';
        popupOverlay.style.display = 'flex';
        popupOverlay.style.justifyContent = 'center';
        popupOverlay.style.alignItems = 'center';

        // ポップアップコンテナを作成
        const popup = document.createElement('div');
        popup.id = 'layout-selection-popup';
        popup.style.backgroundColor = 'var(--dark-surface)';
        popup.style.borderRadius = 'var(--border-radius)';
        popup.style.padding = '20px';
        popup.style.boxShadow = 'var(--box-shadow)';
        popup.style.maxWidth = '90%';
        popup.style.maxHeight = '90%';
        popup.style.overflow = 'auto';
        popup.style.zIndex = '2001';

        // タイトルを追加
        const title = document.createElement('h2');
        title.textContent = 'どのレイアウトで複窓する？';
        title.style.marginBottom = '20px';
        title.style.textAlign = 'center';
        title.style.color = 'var(--text-primary)';
        popup.appendChild(title);

        // レイアウトボタンのコンテナを作成
        const layoutButtonsContainer = document.createElement('div');
        layoutButtonsContainer.style.display = 'flex';
        layoutButtonsContainer.style.flexDirection = 'column';
        layoutButtonsContainer.style.gap = '15px';

        // レイアウトグループを取得（layout-controlsと同じものを使用）
        const layoutGroups = document.querySelectorAll('.layout-group');
        
        // レイアウトグループをクローンしてポップアップに追加
        layoutGroups.forEach(group => {
            const clonedGroup = group.cloneNode(true);
            layoutButtonsContainer.appendChild(clonedGroup);
        });

        popup.appendChild(layoutButtonsContainer);
        popupOverlay.appendChild(popup);
        document.body.appendChild(popupOverlay);

        // レイアウトボタンにイベントリスナーを追加
        const layoutButtons = popup.querySelectorAll('button');
        layoutButtons.forEach(button => {
            button.addEventListener('click', () => {
                
                // ポップアップを閉じる
                popupOverlay.remove();
                
                // 選択されたレイアウトを適用
                const layoutId = button.id;
                
                // ボタンが見つからない場合はデフォルトの2x2レイアウトを適用
                const originalButton = document.getElementById(layoutId);
                if (originalButton) {
                    originalButton.click();
                } else {
                    document.getElementById('layout-2x2').click();
                }
            });
        });
    }

    function createLayoutButtons() {
        const layoutButtons = document.querySelector('.layout-buttons');
        layoutButtons.innerHTML = `
            <!-- 基本レイアウト（1～4画面） -->
            <div class="layout-group">
                <div class="layout-group-title">基本レイアウト（1～4画面）</div>
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
                <button id="layout-2x2" title="2x2レイアウト">
                    <div class="layout-icon">
                        <div class="grid-cell"></div>
                        <div class="grid-cell"></div>
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
                <!-- 1x4と4x1ボタンを削除 -->
            </div>
            
            <!-- 中規模レイアウト（6～9画面） -->
            <div class="layout-group">
                <div class="layout-group-title">中規模レイアウト（6～9画面）</div>
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
                <button id="layout-3x3" title="3x3レイアウト">
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
                    </div>
                </button>
            </div>
            
            <!-- 大規模レイアウト（8～10画面） -->
            <div class="layout-group">
                <div class="layout-group-title">大規模レイアウト（8～10画面）</div>
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
                <button id="layout-custom" title="大3小4レイアウト">
                    <div class="layout-icon">
                        <div class="grid-cell"></div>
                        <div class="grid-cell"></div>
                        <div class="grid-cell"></div>
                        <div class="grid-cell"></div>
                        <div class="grid-cell"></div>
                        <div class="grid-cell"></div>
                        <div class="grid-cell"></div>
                    </div>
                </button>
                <button id="layout-custom2" title="大2小8レイアウト">
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
            </div>
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
                    case 'layout-3x3':
                        streamPlayers.forEach((player, index) => {
                            player.style.display = index < 9 ? 'flex' : 'none';
                        });
                        break;
                    case 'layout-2x4':
                        streamPlayers.forEach((player, index) => {
                            player.style.display = index < 8 ? 'flex' : 'none';
                        });
                        break;
                    case 'layout-custom':
                        streamPlayers.forEach((player, index) => {
                            player.style.display = index < 7 ? 'flex' : 'none';
                        });
                        break;
                    case 'layout-custom2':
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

    // 初期化
    if (window.location.search) {
        // URLからステートがある場合のみ復元
        loadStateFromURL();
    } else {
        // URLにステートがない場合は、ポップアップを表示
        showLayoutSelectionPopup();
    }

    initializeStreamPlayers();
});