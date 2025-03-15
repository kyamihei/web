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
    
    // 配信入力フィールドを追加する機能
    addStreamButton.addEventListener('click', () => {
        if (visibleStreamInputs < 8) {
            visibleStreamInputs++;
            document.getElementById(`stream-input-${visibleStreamInputs}`).classList.remove('hidden');
            
            // すべての配信入力フィールドが表示されたら「追加」ボタンを非表示にする
            if (visibleStreamInputs === 8) {
                addStreamButton.classList.add('hidden');
            }
        }
    });
    
    // 削除ボタンのイベントリスナーを追加
    const deleteButtons = document.querySelectorAll('.delete-stream');
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const streamId = parseInt(button.getAttribute('data-target'));
            
            // 削除対象の入力フィールドを非表示にする
            document.getElementById(`stream-input-${streamId}`).classList.add('hidden');
            
            // 削除対象より上の入力フィールドは変更しない
            // 削除対象より下の入力フィールドをすべて1つ上に移動
            for (let i = streamId; i < visibleStreamInputs; i++) {
                const currentField = document.getElementById(`stream-input-${i}`);
                const nextField = document.getElementById(`stream-input-${i + 1}`);
                
                // プラットフォームの選択値をコピー
                const platformSelect = currentField.querySelector('.platform-select');
                const nextPlatformSelect = nextField.querySelector('.platform-select');
                platformSelect.value = nextPlatformSelect.value;
                
                // チャンネルIDをコピー
                const channelInput = currentField.querySelector('input');
                const nextChannelInput = nextField.querySelector('input');
                channelInput.value = nextChannelInput.value;
            }
            
            // 最後の表示されている入力フィールドを非表示にする
            document.getElementById(`stream-input-${visibleStreamInputs}`).classList.add('hidden');
            
            // 表示されている入力フィールドの数を1つ減らす
            visibleStreamInputs--;
            
            // 「追加」ボタンを再表示する
            addStreamButton.classList.remove('hidden');
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
            
            // レイアウトに応じてストリームプレーヤーの表示/非表示を切り替え
            const streamPlayers = document.querySelectorAll('.stream-player');
            
            if (layoutClass === 'layout-1x2') {
                // 1x2レイアウトの場合、最初の2つのプレーヤーのみ表示
                streamPlayers.forEach((player, index) => {
                    player.style.display = index < 2 ? 'flex' : 'none';
                });
            } else if (layoutClass === 'layout-2x1') {
                // 2x1レイアウトの場合、最初の2つのプレーヤーのみ表示
                streamPlayers.forEach((player, index) => {
                    player.style.display = index < 2 ? 'flex' : 'none';
                });
            } else if (layoutClass === 'layout-1x3') {
                // 1x3レイアウトの場合、最初の3つのプレーヤーのみ表示
                streamPlayers.forEach((player, index) => {
                    player.style.display = index < 3 ? 'flex' : 'none';
                });
            } else if (layoutClass === 'layout-3x1') {
                // 3x1レイアウトの場合、最初の3つのプレーヤーのみ表示
                streamPlayers.forEach((player, index) => {
                    player.style.display = index < 3 ? 'flex' : 'none';
                });
            } else if (layoutClass === 'layout-4x2') {
                // 4x2レイアウトの場合、すべてのプレーヤーを表示
                streamPlayers.forEach(player => {
                    player.style.display = 'flex';
                });
            } else if (layoutClass === 'layout-2x4') {
                // 2x4レイアウトの場合、すべてのプレーヤーを表示
                streamPlayers.forEach(player => {
                    player.style.display = 'flex';
                });
            } else {
                // 2x2レイアウトの場合、最初の4つのプレーヤーのみ表示
                streamPlayers.forEach((player, index) => {
                    player.style.display = index < 4 ? 'flex' : 'none';
                });
            }
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
        
        // プラットフォームに応じた埋め込みURLを生成
        let embedUrl = '';
        
        switch (platform) {
            case 'twitch':
                // Twitchの埋め込みURL
                // チャンネル名かビデオIDかを判断
                // localhostの場合は明示的にparentパラメータを設定
                const parentParam = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
                
                if (channelId.startsWith('v')) {
                    // ビデオID
                    embedUrl = `https://player.twitch.tv/?video=${channelId}&parent=${parentParam}`;
                } else {
                    // チャンネル名
                    embedUrl = `https://player.twitch.tv/?channel=${channelId}&parent=${parentParam}`;
                }
                break;
                
            case 'youtube':
                // YouTubeの埋め込みURL
                // 動画IDの抽出（URLが貼られた場合に対応）
                let youtubeId = channelId;
                
                // URLからIDを抽出
                if (channelId.includes('youtube.com/watch?v=')) {
                    const url = new URL(channelId);
                    youtubeId = url.searchParams.get('v');
                } else if (channelId.includes('youtu.be/')) {
                    youtubeId = channelId.split('youtu.be/')[1];
                }
                
                embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
                break;
                
            case 'twitcasting':
                // ツイキャスの埋め込みURL
                embedUrl = `https://twitcasting.tv/${channelId}/embeddedplayer/live?auto_play=true`;
                break;
                
            case 'openrec':
                // OPENRECの埋め込みURL
                // チャンネル名か動画IDかを判断
                if (channelId.includes('/')) {
                    // 完全なURLが入力された場合
                    const match = channelId.match(/openrec\.tv\/(?:live|movie)\/([^\/]+)/);
                    if (match) {
                        embedUrl = `https://www.openrec.tv/embed/${match[1]}`;
                    } else {
                        alert('無効なOPENREC URLです');
                        return;
                    }
                } else {
                    // IDのみが入力された場合
                    embedUrl = `https://www.openrec.tv/embed/${channelId}`;
                }
                break;
                
            default:
                alert('サポートされていないプラットフォームです');
                return;
        }
        
        // iframeを作成して埋め込み
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.setAttribute('allowfullscreen', 'true');
        
        // Twitchの場合、追加の属性が必要
        if (platform === 'twitch') {
            iframe.setAttribute('allow', 'autoplay; fullscreen');
        }
        
        streamContainer.appendChild(iframe);
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
});
