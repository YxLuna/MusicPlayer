/**
 * UI模块 - 用户界面交互
 */

class UIManager {
    constructor() {
        // 状态
        this.isLiked = false;
        this.currentSongId = null;
        this.bgObjectUrl = null;
        this.cropFile = null;
        this.backgroundDbPromise = null;

        // 歌词滚动状态
        this.isUserScrolling = false; // 用户是否手动滚动
        this.autoScrollTimeout = null; // 自动滚动恢复的定时器
        this.lyricScrollDetectionBound = false;

        // 缓存DOM元素
        this.cacheElements();

        // 绑定事件
        this.bindEvents();
    }

    cacheElements() {
        // 背景
        this.bgImage = document.getElementById('bgImage');

        // 搜索
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.searchResults = document.getElementById('searchResults');
        this.searchTypeBtns = document.querySelectorAll('.search-type-btn');

        // 歌单
        this.playlistList = document.getElementById('playlistList');

        // 播放器
        this.coverImage = document.getElementById('coverImage');
        this.albumCover = document.getElementById('albumCover');
        this.albumDisc = document.getElementById('albumDisc');
        this.songTitle = document.getElementById('songTitle');
        this.songArtist = document.getElementById('songArtist');
        this.albumName = document.getElementById('albumName');
        this.songDuration = document.getElementById('songDuration');
        this.songQuality = document.getElementById('songQuality');

        // 底部播放栏
        this.playerCover = document.getElementById('playerCover');
        this.playerSongTitle = document.getElementById('playerSongTitle');
        this.playerArtist = document.getElementById('playerArtist');
        this.currentTime = document.getElementById('currentTime');
        this.totalTime = document.getElementById('totalTime');
        this.progressBar = document.getElementById('progressBar');
        this.progressCurrent = document.getElementById('progressCurrent');
        this.progressHandle = document.getElementById('progressHandle');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeCurrent = document.getElementById('volumeCurrent');
        this.volumeIcon = document.getElementById('volumeIcon');
        this.playBtn = document.getElementById('playBtn');
        this.playIcon = document.getElementById('playIcon');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.loopModeBtn = document.getElementById('loopModeBtn');
        this.loopIcon = document.getElementById('loopIcon');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.likeBtn = document.getElementById('likeBtn');

        // 歌词
        this.lyricContent = document.getElementById('lyricContent');
        this.lyricPanel = document.getElementById('lyricPanel');

        // 歌曲列表
        this.trackList = document.getElementById('trackList');

        // 右侧面板
        this.rightPanel = document.getElementById('rightPanel');
        this.panelCover = document.getElementById('panelCover');
        this.panelSongTitle = document.getElementById('panelSongTitle');
        this.panelArtist = document.getElementById('panelArtist');

        // 背景设置
        this.bgSource = document.getElementById('bgSource');
        this.bgUpload = document.getElementById('bgUpload');
        this.bgFileInput = document.getElementById('bgFileInput');
        this.brightness = document.getElementById('brightness');
        this.brightnessValue = document.getElementById('brightnessValue');
        this.blur = document.getElementById('blur');
        this.blurValue = document.getElementById('blurValue');
        this.opacity = document.getElementById('opacity');
        this.opacityValue = document.getElementById('opacityValue');
        this.glassEffect = document.getElementById('glassEffect');

        // 登录
        this.loginBtn = document.getElementById('loginBtn');
        this.userInfo = document.getElementById('userInfo');
        this.loginModal = document.getElementById('loginModal');
        this.closeLoginModal = document.getElementById('closeLoginModal');
        this.qrcodePane = document.getElementById('qrcodePane');
        this.phonePane = document.getElementById('phonePane');
        this.qrcodeImage = document.getElementById('qrcodeImage');
        this.qrcodeStatus = document.getElementById('qrcodeStatus');
        this.phoneInput = document.getElementById('phoneInput');
        this.captchaInput = document.getElementById('captchaInput');
        this.captchaCode = document.getElementById('captchaCode');
        this.sendCaptchaBtn = document.getElementById('sendCaptchaBtn');
        this.phoneLoginBtn = document.getElementById('phoneLoginBtn');
        this.accountInfo = document.getElementById('accountInfo');

        // 歌词循环弹窗
        this.lyricLoopModal = document.getElementById('lyricLoopModal');
        this.closeLoopModal = document.getElementById('closeLoopModal');
        this.loopLyric = document.getElementById('loopLyric');
        this.loopStartTime = document.getElementById('loopStartTime');
        this.loopEndTime = document.getElementById('loopEndTime');
        this.loopPlayBtn = document.getElementById('loopPlayBtn');
        this.loopReplayBtn = document.getElementById('loopReplayBtn');

        // 裁剪模态框
        this.cropModal = document.getElementById('cropModal');
        this.closeCropModal = document.getElementById('closeCropModal');
        this.cropPreview = document.getElementById('cropPreview');
        this.cropPreviewBg = document.getElementById('cropPreviewBg');
        this.cropZoom = document.getElementById('cropZoom');
        this.cropZoomValue = document.getElementById('cropZoomValue');
        this.cropPosX = document.getElementById('cropPosX');
        this.cropPosXValue = document.getElementById('cropPosXValue');
        this.cropPosY = document.getElementById('cropPosY');
        this.cropPosYValue = document.getElementById('cropPosYValue');
        this.cancelCrop = document.getElementById('cancelCrop');
        this.confirmCrop = document.getElementById('confirmCrop');

        // Toast
        this.toastContainer = document.getElementById('toastContainer');

        // 音质切换
        this.qualityBtns = document.querySelectorAll('.quality-btn');

        // 倍速按钮
        this.speedBtns = document.querySelectorAll('.speed-btn');
    }

    bindEvents() {
        // 登录弹窗
        this.loginBtn?.addEventListener('click', () => this.onLoginRequest?.());
        this.closeLoginModal?.addEventListener('click', () => this.hideLoginModal());
        this.loginModal?.addEventListener('click', (e) => {
            if (e.target === this.loginModal) this.hideLoginModal();
        });

        // 登录标签切换
        document.querySelectorAll('.login-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchLoginTab(e.target.dataset.tab));
        });

        // 进度条拖拽
        this.setupProgressBar();

        // 音量控制
        this.setupVolumeControl();

        // 恢复毛玻璃设置
        this.initGlassEffect();

        // 恢复背景图片
        this.restoreBackgroundImage().catch((error) => {
            console.error('恢复背景图片失败:', error);
        });

        // 右侧面板
        this.rightPanel?.addEventListener('mouseenter', () => {
            this.rightPanel.classList.add('expanded');
        });
        this.rightPanel?.addEventListener('mouseleave', () => {
            this.rightPanel.classList.remove('expanded');
        });

        // 右侧面板trigger按钮点击展开/收起
        const panelTrigger = this.rightPanel?.querySelector('.panel-trigger');
        panelTrigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.rightPanel.classList.toggle('expanded');
        });

        // 背景设置
        this.bgSource?.addEventListener('change', (e) => {
            this.bgUpload.style.display = e.target.value === 'custom' ? 'block' : 'none';

            // 切换到歌曲封面时，恢复默认背景
            if (e.target.value === 'cover') {
                this.bgImage.style.backgroundImage = '';
                this.bgImage.classList.remove('custom-bg');
                localStorage.setItem('bgSource', 'cover');
                localStorage.removeItem('bgCustomType');
                localStorage.removeItem('bgVideoMime');
            }
        });

        this.brightness?.addEventListener('input', (e) => {
            this.brightnessValue.textContent = e.target.value + '%';
            this.updateBackground();
        });

        this.blur?.addEventListener('input', (e) => {
            this.blurValue.textContent = e.target.value + 'px';
            this.updateBackground();
        });

        this.opacity?.addEventListener('input', (e) => {
            this.opacityValue.textContent = e.target.value + '%';
            // 只有在毛玻璃开启时才更新背景透明度
            if (this.glassEffect?.checked) {
                this.updateBackground();
            }
        });

        // 毛玻璃效果开关
        this.glassEffect?.addEventListener('change', (e) => {
            this.toggleGlassEffect(e.target.checked);
            // 保存设置到 localStorage
            localStorage.setItem('glassEffect', e.target.checked ? 'true' : 'false');
        });

        this.bgFileInput?.addEventListener('change', (e) => this.handleBgUpload(e));

        // 裁剪模态框事件
        this.closeCropModal?.addEventListener('click', () => this.hideCropModal());
        this.cancelCrop?.addEventListener('click', () => this.hideCropModal());
        this.confirmCrop?.addEventListener('click', () => this.applyCrop());

        // 裁剪滑块事件
        this.cropZoom?.addEventListener('input', (e) => this.updateCropPreview());
        this.cropPosX?.addEventListener('input', (e) => this.updateCropPreview());
        this.cropPosY?.addEventListener('input', (e) => this.updateCropPreview());

        this.cropModal?.addEventListener('click', (e) => {
            if (e.target === this.cropModal) this.hideCropModal();
        });

        // 搜索
        this.searchBtn?.addEventListener('click', () => this.onSearch?.());
        this.searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.onSearch?.();
        });
        this.searchInput?.addEventListener('input', (e) => {
            this.onSearchInput?.(e.target.value);
        });
        this.searchTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.onSearchTypeChange?.(parseInt(btn.dataset.type, 10));
            });
        });

        // 点击外部关闭搜索结果
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box')) {
                this.hideSearchResults();
            }
        });
    }

    createFallbackCover(size = 48) {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Crect fill='%231a1a2e' width='${size}' height='${size}'/%3E%3Ccircle cx='${size / 2}' cy='${size / 2}' r='${Math.max(8, Math.floor(size / 4))}' fill='%23333' opacity='0.5'/%3E%3C/svg%3E`;
    }

    sanitizeUrl(value, fallback = '') {
        if (!value) {
            return fallback;
        }

        const raw = String(value).trim();
        if (!raw) {
            return fallback;
        }

        if (raw.startsWith('data:image/') || raw.startsWith('data:video/') || raw.startsWith('blob:')) {
            return raw;
        }

        try {
            const parsed = new URL(raw, window.location.origin);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return parsed.href;
            }
        } catch (error) {
            console.warn('[UI] 非法资源地址已忽略:', raw);
        }

        return fallback;
    }

    createSafeImage(src, alt, className, fallback) {
        const img = document.createElement('img');
        img.className = className;
        img.alt = alt || '';

        const safeFallback = fallback || this.createFallbackCover();
        img.src = this.sanitizeUrl(src, safeFallback);
        img.addEventListener('error', () => {
            img.src = safeFallback;
        }, { once: true });

        return img;
    }

    createDiv(className, text) {
        const div = document.createElement('div');
        if (className) {
            div.className = className;
        }
        if (text !== undefined && text !== null) {
            div.textContent = text;
        }
        return div;
    }

    // 进度条
    setupProgressBar() {
        let isDragging = false;

        const updateProgress = (e) => {
            const rect = this.progressBar.getBoundingClientRect();
            const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            this.updateProgressBar(percent);
            return percent;
        };

        this.progressBar?.addEventListener('mousedown', (e) => {
            isDragging = true;
            const percent = updateProgress(e);
            this.onProgressSeek?.(percent);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updateProgress(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.onProgressSeekComplete?.();
            }
        });
    }

    // 音量控制
    setupVolumeControl() {
        let isDragging = false;

        const updateVolume = (e) => {
            const rect = this.volumeSlider.getBoundingClientRect();
            const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            this.updateVolumeBar(percent);
            return percent;
        };

        this.volumeSlider?.addEventListener('mousedown', (e) => {
            isDragging = true;
            const percent = updateVolume(e);
            this.onVolumeChange?.(percent);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const percent = updateVolume(e);
                this.onVolumeChange?.(percent);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        this.volumeBtn?.addEventListener('click', () => {
            this.onVolumeToggle?.();
        });
    }

    // 更新进度条
    updateProgressBar(percent) {
        if (this.progressCurrent) {
            this.progressCurrent.style.width = percent + '%';
        }
        if (this.progressHandle) {
            this.progressHandle.style.left = percent + '%';
        }
    }

    // 更新音量条
    updateVolumeBar(percent) {
        if (this.volumeCurrent) {
            this.volumeCurrent.style.width = percent + '%';
        }
    }

    // 批量更新音量UI
    updateVolumeUI(volume) {
        this.updateVolumeBar(volume);
        this.updateVolumeIcon(volume);
    }

    // 更新播放状态图标
    updatePlayState(isPlaying) {
        if (!this.playIcon) return;

        if (isPlaying) {
            this.playIcon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        } else {
            this.playIcon.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
        }
    }

    // 更新循环模式图标
    updateLoopMode(mode) {
        if (!this.loopIcon) return;

        const icons = {
            sequence: '<path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>',
            single: '<path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>',
            random: '<path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>'
        };

        this.loopIcon.innerHTML = icons[mode] || icons.sequence;

        // 更新按钮状态
        if (mode === 'single') {
            this.loopModeBtn?.classList.add('active');
        } else {
            this.loopModeBtn?.classList.remove('active');
        }
    }

    // 更新音质按钮状态
    updateQualityButtons(quality) {
        this.qualityBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.quality, 10) === quality);
        });
    }

    // 更新搜索分类
    setSearchType(type) {
        this.searchTypeBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.type, 10) === type);
        });

        if (!this.searchInput) return;

        const placeholders = {
            1: '搜索单曲、歌词关键词...',
            1000: '搜索歌单名称...',
            100: '搜索歌手名称...'
        };
        this.searchInput.placeholder = placeholders[type] || '搜索歌曲、歌手、歌单...';
    }

    // 隐藏搜索结果
    hideSearchResults() {
        this.searchResults?.classList.remove('active');
    }

    // 更新音量图标
    updateVolumeIcon(volume) {
        if (!this.volumeIcon) return;

        let icon;
        if (volume === 0) {
            icon = '<path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
        } else if (volume < 50) {
            icon = '<path fill="currentColor" d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>';
        } else {
            icon = '<path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
        }

        this.volumeIcon.innerHTML = icon;
    }

    // 更新歌曲信息
    updateSongInfo(song) {
        if (!song) return;

        // 封面
        const coverUrl = this.sanitizeUrl(
            song.cover || song.album?.picUrl || song.al?.picUrl,
            this.createFallbackCover(300)
        );

        this.coverImage.src = coverUrl;
        this.playerCover.src = coverUrl;
        this.panelCover.src = coverUrl;

        // 更新背景
        this.updateBackgroundImage(coverUrl);

        // 歌曲信息
        this.songTitle.textContent = song.name || '未知歌曲';
        this.playerSongTitle.textContent = song.name || '未知歌曲';
        this.panelSongTitle.textContent = song.name || '未知歌曲';

        const artist = song.artist || song.artists?.map(a => a.name).join(', ') || '未知艺术家';
        this.songArtist.textContent = artist;
        this.playerArtist.textContent = artist;
        this.panelArtist.textContent = artist;

        this.albumName.textContent = song.album || song.al?.name || '-';

        // 保存当前歌曲ID
        this.currentSongId = song.id;
    }

    // 更新喜欢按钮状态
    updateLikeButton(liked) {
        if (!this.likeBtn) return;

        this.isLiked = liked;
        const path = this.likeBtn.querySelector('path');

        if (liked) {
            // 已喜欢 - 显示红色实心
            if (path) {
                path.setAttribute('d', 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z');
                path.setAttribute('fill', '#ff6b9d');
            }
            this.likeBtn.classList.add('liked');
        } else {
            // 未喜欢 - 显示空心
            if (path) {
                path.setAttribute('d', 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z');
                path.setAttribute('fill', 'currentColor');
            }
            this.likeBtn.classList.remove('liked');
        }
    }

    // 更新时间显示
    updateTimeDisplay(current, total) {
        this.currentTime.textContent = Player.formatTime(current);
        this.totalTime.textContent = Player.formatTime(total);
        this.songDuration.textContent = `${Player.formatTime(current)} / ${Player.formatTime(total)}`;
    }

    // 更新背景图片
    updateBackgroundImage(url) {
        if (this.bgSource?.value !== 'cover') return;

        if (this.bgImage) {
            const safeUrl = this.sanitizeUrl(url);
            this.bgImage.style.backgroundImage = safeUrl ? `url("${safeUrl}")` : '';
        }
    }

    // 更新背景效果
    updateBackground() {
        const brightness = this.brightness?.value ?? 100;  // 亮度 0-200
        const blur = this.blur?.value ?? 0;               // 模糊度 0-30
        const cardOpacity = this.opacity?.value ?? 70;   // 透明度 0-100，作用于卡片背景

        // 亮度：控制背景图片的 brightness filter
        if (this.bgImage) {
            this.bgImage.style.filter = `brightness(${brightness}%) blur(${blur}px)`;
        }

        // 透明度：控制 song-card 和 lyric-panel 的背景透明度
        // 只有在毛玻璃开启时才应用透明度设置，关闭时保持淡色背景
        const isGlassEnabled = this.glassEffect?.checked ?? true;

        if (isGlassEnabled) {
            // 滑块值越大 → 卡片越透明 → 背景越透出
            const minCardOpacity = 0.15;  // 最低15%，保证文字可读
            const maxCardOpacity = 0.95;  // 最高95%
            const normalizedCardOpacity = minCardOpacity + (cardOpacity / 100) * (maxCardOpacity - minCardOpacity);

            const songCard = document.querySelector('.song-card');
            const lyricPanel = document.querySelector('.lyric-panel');

            if (songCard) {
                songCard.style.background = `rgba(255, 255, 255, ${normalizedCardOpacity})`;
            }
            if (lyricPanel) {
                lyricPanel.style.background = `rgba(255, 255, 255, ${normalizedCardOpacity})`;
            }
        }
        // 如果毛玻璃关闭，背景已经由 toggleGlassEffect 设置为淡色，不需要修改

        // 保存效果设置
        this.saveBgEffectSettings();
    }

    // 初始化毛玻璃效果设置
    initGlassEffect() {
        const saved = localStorage.getItem('glassEffect');
        if (saved !== null) {
            const enabled = saved === 'true';
            if (this.glassEffect) {
                this.glassEffect.checked = enabled;
            }
            this.toggleGlassEffect(enabled);
        }
    }

    // 切换毛玻璃效果
    toggleGlassEffect(enabled) {
        const songCard = document.querySelector('.song-card');
        const lyricPanel = document.querySelector('.lyric-panel');

        if (enabled) {
            document.body.classList.remove('no-blur');
            // 恢复毛玻璃时的背景
            const cardOpacity = this.opacity?.value ?? 70;
            const minCardOpacity = 0.15;
            const maxCardOpacity = 0.95;
            const normalizedCardOpacity = minCardOpacity + (cardOpacity / 100) * (maxCardOpacity - minCardOpacity);

            if (songCard) {
                songCard.style.background = `rgba(255, 255, 255, ${normalizedCardOpacity})`;
            }
            if (lyricPanel) {
                lyricPanel.style.background = `rgba(255, 255, 255, ${normalizedCardOpacity})`;
            }
        } else {
            document.body.classList.add('no-blur');
            // 关闭毛玻璃时，背景变得很淡，让背景透出来
            if (songCard) {
                songCard.style.background = 'rgba(255, 255, 255, 0.1)';
            }
            if (lyricPanel) {
                lyricPanel.style.background = 'rgba(255, 255, 255, 0.1)';
            }
        }
    }

    // 处理背景上传
    handleBgUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        this.cropFile = file;

        const reader = new FileReader();

        reader.onload = (event) => {
            const result = event.target.result;

            if (file.type.startsWith('image/')) {
                // 显示裁剪模态框
                this.showCropModal(result);
            } else if (file.type.startsWith('video/')) {
                // 视频
                this.handleVideoBg(result, file.type);
            }
        };

        reader.readAsDataURL(file);
    }

    setCustomBackgroundType(type) {
        if (type) {
            localStorage.setItem('bgCustomType', type);
        } else {
            localStorage.removeItem('bgCustomType');
        }
    }

    revokeBackgroundObjectUrl() {
        if (this.bgObjectUrl) {
            URL.revokeObjectURL(this.bgObjectUrl);
            this.bgObjectUrl = null;
        }
    }

    openBackgroundDatabase() {
        if (this.backgroundDbPromise) {
            return this.backgroundDbPromise;
        }

        this.backgroundDbPromise = new Promise((resolve, reject) => {
            const request = window.indexedDB.open('CloudMusicProPlayer', 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('backgrounds')) {
                    db.createObjectStore('backgrounds');
                }
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error || new Error('打开背景数据库失败'));
            };
        });

        return this.backgroundDbPromise;
    }

    async saveCustomBackgroundBlob(blob) {
        const db = await this.openBackgroundDatabase();

        await new Promise((resolve, reject) => {
            const tx = db.transaction('backgrounds', 'readwrite');
            const store = tx.objectStore('backgrounds');
            store.put(blob, 'custom-image');

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('保存背景图片失败'));
            tx.onabort = () => reject(tx.error || new Error('保存背景图片被中断'));
        });
    }

    async loadCustomBackgroundBlob() {
        const db = await this.openBackgroundDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction('backgrounds', 'readonly');
            const store = tx.objectStore('backgrounds');
            const request = store.get('custom-image');

            request.onsuccess = () => {
                resolve(request.result || null);
            };
            request.onerror = () => {
                reject(request.error || new Error('读取背景图片失败'));
            };
        });
    }

    async clearCustomBackgroundBlob() {
        const db = await this.openBackgroundDatabase();

        await new Promise((resolve, reject) => {
            const tx = db.transaction('backgrounds', 'readwrite');
            const store = tx.objectStore('backgrounds');
            store.delete('custom-image');

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('清理背景图片失败'));
            tx.onabort = () => reject(tx.error || new Error('清理背景图片被中断'));
        });
    }

    dataUrlToBlob(dataUrl) {
        const [header, base64] = String(dataUrl || '').split(',');
        const mimeMatch = header?.match(/data:(.*?);base64/);
        const mimeType = mimeMatch?.[1] || 'image/png';
        const binary = atob(base64 || '');
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }

        return new Blob([bytes], { type: mimeType });
    }

    applyCustomBackgroundImage(imageUrl, settings = {}) {
        if (!this.bgImage) return;

        this.bgImage.style.backgroundImage = `url(${imageUrl})`;
        this.bgImage.style.backgroundSize = `${settings.zoom || 100}%`;
        this.bgImage.style.backgroundPosition = `${settings.posX || 50}% ${settings.posY || 50}%`;
        this.bgImage.classList.add('custom-bg');
    }

    // 保存背景图片到 localStorage
    saveBackgroundImage(dataUrl) {
        try {
            localStorage.setItem('customBgImage', dataUrl);
            localStorage.setItem('bgSource', 'custom');
        } catch (e) {
            console.error('保存背景图片失败:', e);
            this.showToast('图片太大，无法保存', 'error');
        }
    }

    // 保存背景设置
    saveBgSettings(settings) {
        localStorage.setItem('customBgSettings', JSON.stringify(settings));
    }

    // 恢复背景图片
    async restoreBackgroundImage() {
        const bgSource = localStorage.getItem('bgSource');
        const bgCustomType = localStorage.getItem('bgCustomType');
        const bgSettingsStr = localStorage.getItem('customBgSettings');
        const bgSettings = bgSettingsStr ? JSON.parse(bgSettingsStr) : null;

        // 恢复亮度、模糊度、透明度设置
        this.restoreBgEffectSettings();

        const shouldRestoreImage = bgSource === 'custom'
            && (bgCustomType === 'image' || !bgCustomType);

        if (shouldRestoreImage) {
            const legacyImage = bgSettings?.image || '';
            let imageUrl = legacyImage;

            if (!imageUrl) {
                const imageBlob = await this.loadCustomBackgroundBlob().catch(() => null);
                if (imageBlob) {
                    this.revokeBackgroundObjectUrl();
                    this.bgObjectUrl = URL.createObjectURL(imageBlob);
                    imageUrl = this.bgObjectUrl;
                }
            }

            if (!imageUrl) {
                localStorage.setItem('bgSource', 'cover');
                this.setCustomBackgroundType(null);
                this.showToast('自定义背景未找到，已恢复为歌曲封面', 'info');
                return;
            }

            this.applyCustomBackgroundImage(imageUrl, bgSettings || {});

            if (this.bgSource) {
                this.bgSource.value = 'custom';
            }
            if (this.bgUpload) {
                this.bgUpload.style.display = 'block';
            }
        } else if (bgSource === 'custom' && bgCustomType === 'video') {
            localStorage.setItem('bgSource', 'cover');
            if (this.bgSource) {
                this.bgSource.value = 'cover';
            }
            if (this.bgUpload) {
                this.bgUpload.style.display = 'none';
            }
            this.showToast('视频背景暂不支持重启后恢复，已切回歌曲封面', 'info');
        } else if (bgSource === 'custom') {
            // 没有图片数据，检查是否是之前的视频背景（已失效）
            this.checkVideoBg();
        }
    }

    // 恢复背景效果设置（亮度、模糊度、透明度）
    restoreBgEffectSettings() {
        const effectSettings = localStorage.getItem('bgEffectSettings');
        if (effectSettings) {
            const settings = JSON.parse(effectSettings);
            if (this.brightness) {
                this.brightness.value = settings.brightness || 100;
                this.brightnessValue.textContent = (settings.brightness || 100) + '%';
            }
            if (this.blur) {
                this.blur.value = settings.blur || 0;
                this.blurValue.textContent = (settings.blur || 0) + 'px';
            }
            if (this.opacity) {
                this.opacity.value = settings.opacity || 70;
                this.opacityValue.textContent = (settings.opacity || 70) + '%';
            }
            this.updateBackground();
        }
    }

    // 保存背景效果设置
    saveBgEffectSettings() {
        const settings = {
            brightness: this.brightness?.value || 100,
            blur: this.blur?.value || 0,
            opacity: this.opacity?.value || 70
        };
        localStorage.setItem('bgEffectSettings', JSON.stringify(settings));
    }

    // 处理视频背景
    handleVideoBg(dataUrl, mimeType) {
        // 创建视频元素
        let videoEl = this.bgImage.querySelector('video.bg-video');
        if (!videoEl) {
            videoEl = document.createElement('video');
            videoEl.className = 'bg-video';
            videoEl.loop = true;
            videoEl.muted = true;
            videoEl.playsInline = true;
            this.bgImage.appendChild(videoEl);
        }

        videoEl.src = dataUrl;
        videoEl.style.display = 'block';
        this.bgImage.classList.add('custom-bg', 'video-bg');

        // 保存到 localStorage（仅保存设置，不保存视频数据）
        localStorage.setItem('bgSource', 'custom');
        localStorage.setItem('bgVideoMime', mimeType);
        this.setCustomBackgroundType('video');

        // 视频背景无法持久化（localStorage限制），提示用户
        this.showToast('视频背景已更新（注意：刷新页面后视频背景将恢复为封面）', 'info');
    }

    // 检查是否有视频背景设置需要恢复
    checkVideoBg() {
        const bgSource = localStorage.getItem('bgSource');
        const bgVideoMime = localStorage.getItem('bgVideoMime');
        const bgCustomType = localStorage.getItem('bgCustomType');

        if (bgSource === 'custom' && (bgCustomType === 'video' || !localStorage.getItem('customBgSettings'))) {
            // 有 customBgSettings 说明是图片背景，否则检查是否是视频
            // 如果没有图片数据且之前设置过视频背景，提示用户
            if (bgVideoMime) {
                // 之前的视频背景已失效，恢复为封面
                localStorage.setItem('bgSource', 'cover');
                localStorage.removeItem('bgCustomType');
                this.showToast('视频背景已失效，已恢复为歌曲封面', 'info');
            }
        }
    }

    // 显示裁剪模态框
    showCropModal(imageDataUrl) {
        this.cropData = imageDataUrl;

        // 设置预览背景
        if (this.cropPreviewBg) {
            this.cropPreviewBg.style.backgroundImage = `url(${imageDataUrl})`;
        }

        // 重置滑块值
        if (this.cropZoom) this.cropZoom.value = 100;
        if (this.cropPosX) this.cropPosX.value = 50;
        if (this.cropPosY) this.cropPosY.value = 50;

        // 更新显示值
        if (this.cropZoomValue) this.cropZoomValue.textContent = '100%';
        if (this.cropPosXValue) this.cropPosXValue.textContent = '50%';
        if (this.cropPosYValue) this.cropPosYValue.textContent = '50%';

        // 更新预览
        this.updateCropPreview();

        this.cropModal?.classList.add('active');
    }

    // 隐藏裁剪模态框
    hideCropModal() {
        this.cropModal?.classList.remove('active');
        this.cropData = null;
    }

    // 更新裁剪预览
    updateCropPreview() {
        const zoom = this.cropZoom?.value || 100;
        const posX = this.cropPosX?.value || 50;
        const posY = this.cropPosY?.value || 50;

        // 更新显示值
        if (this.cropZoomValue) this.cropZoomValue.textContent = zoom + '%';
        if (this.cropPosXValue) this.cropPosXValue.textContent = posX + '%';
        if (this.cropPosYValue) this.cropPosYValue.textContent = posY + '%';

        // 应用到预览背景
        if (this.cropPreviewBg) {
            this.cropPreviewBg.style.backgroundSize = `${zoom}%`;
            this.cropPreviewBg.style.backgroundPosition = `${posX}% ${posY}%`;
        }
    }

    // 应用裁剪（保存设置）
    async applyCrop() {
        if (!this.cropData) return;

        const zoom = this.cropZoom?.value || 100;
        const posX = this.cropPosX?.value || 50;
        const posY = this.cropPosY?.value || 50;

        // 应用到实际背景
        this.applyCustomBackgroundImage(this.cropData, { zoom, posX, posY });

        const bgSettings = {
            zoom: zoom,
            posX: posX,
            posY: posY
        };

        try {
            localStorage.setItem('customBgSettings', JSON.stringify(bgSettings));
            localStorage.setItem('bgSource', 'custom');
            localStorage.removeItem('bgVideoMime');
            this.setCustomBackgroundType('image');
            const imageBlob = this.cropFile instanceof Blob ? this.cropFile : this.dataUrlToBlob(this.cropData);
            await this.saveCustomBackgroundBlob(imageBlob);
        } catch (error) {
            console.error('保存背景图片失败:', error);
            this.showToast('背景图片保存失败，请重试或换一张图片', 'error');
            return;
        }

        this.hideCropModal();
        this.showToast('背景图片已调整并应用', 'success');
    }

    // 渲染歌单列表（渲染到右侧侧边栏）
    renderPlaylists(playlists, activePlaylistId = null) {
        if (!this.playlistList) return;

        this.playlistList.replaceChildren();

        playlists.forEach((playlist, index) => {
            const item = this.createDiv('panel-playlist-item');
            if ((activePlaylistId ? playlist.id === activePlaylistId : index === 0)) {
                item.classList.add('active');
            }
            item.dataset.id = String(playlist.id);

            const cover = this.createSafeImage(
                playlist.cover,
                playlist.name,
                'panel-playlist-cover',
                this.createFallbackCover(36)
            );

            const info = this.createDiv('panel-playlist-info');
            info.append(
                this.createDiv('panel-playlist-name', playlist.name || '未命名歌单'),
                this.createDiv('panel-playlist-count', `${playlist.count || 0}首`)
            );

            item.append(cover, info);
            item.addEventListener('click', () => {
                this.onPlaylistSelect?.(parseInt(item.dataset.id, 10));
            });

            this.playlistList.appendChild(item);
        });
    }

    // 渲染歌曲列表（渲染到右侧侧边栏）
    renderTrackList(songs, currentIndex = -1) {
        if (!this.trackList) return;

        this.trackList.replaceChildren();

        songs.forEach((song, index) => {
            const item = this.createDiv('panel-track-item');
            if (index === currentIndex) {
                item.classList.add('playing');
            }
            item.dataset.index = String(index);

            const num = document.createElement('span');
            num.className = 'track-num';
            num.textContent = String(index + 1).padStart(2, '0');

            const cover = this.createSafeImage(
                song.cover,
                song.name,
                'track-cover',
                this.createFallbackCover(32)
            );

            const info = this.createDiv('track-info');
            info.append(
                this.createDiv('track-title', song.name || '未知歌曲'),
                this.createDiv('track-artist', song.artist || '未知艺术家')
            );

            const duration = document.createElement('span');
            duration.className = 'track-duration';
            duration.textContent = song.durationStr || '--:--';

            item.append(num, cover, info, duration);
            item.addEventListener('click', () => {
                this.onTrackSelect?.(parseInt(item.dataset.index, 10));
            });

            this.trackList.appendChild(item);
        });
    }

    // 渲染歌词
    renderLyrics(lyrics) {
        if (!this.lyricContent) return;

        this.lyricContent.replaceChildren();

        if (!lyrics || lyrics.length === 0) {
            const emptyLine = this.createDiv('lyric-line', '暂无歌词');
            emptyLine.dataset.time = '0';
            this.lyricContent.appendChild(emptyLine);
            this.initLyricScrollDetection();
            return;
        }

        lyrics.forEach((line, index) => {
            const lineEl = this.createDiv('lyric-line', line.content || '♪');
            if (line.translated) {
                lineEl.classList.add('has-trans');
            }
            if (line.selected) {
                lineEl.classList.add('selected');
            }
            lineEl.dataset.index = String(index);
            lineEl.dataset.time = String(line.time ?? 0);

            if (line.translated) {
                lineEl.appendChild(this.createDiv('lyric-translated', line.translated));
            }

            lineEl.addEventListener('click', (e) => {
                const isMultiSelect = e.shiftKey;
                this.onLyricClick?.(parseInt(lineEl.dataset.index, 10), isMultiSelect);
            });

            this.lyricContent.appendChild(lineEl);
        });

        this.initLyricScrollDetection();
    }

    // 初始化歌词滚动检测
    initLyricScrollDetection() {
        if (!this.lyricContent || this.lyricScrollDetectionBound) return;

        let scrollStartY = 0;
        let scrollStartTop = 0;

        this.lyricContent.addEventListener('mousedown', (e) => {
            scrollStartY = e.clientY;
            scrollStartTop = this.lyricContent.scrollTop;
            this.isUserScrolling = false;
        });

        this.lyricContent.addEventListener('mousemove', (e) => {
            // 只有当鼠标移动超过一定距离才认为是手动滚动
            const diffY = Math.abs(e.clientY - scrollStartY);
            if (diffY > 5) {
                this.isUserScrolling = true;
            }
        });

        this.lyricContent.addEventListener('mouseup', () => {
            // 检测是否真的发生了滚动
            if (Math.abs(this.lyricContent.scrollTop - scrollStartTop) > 5) {
                this.isUserScrolling = true;
                // 设置定时器，3秒后恢复自动滚动
                this.resetAutoScrollTimer();
            }
        });

        // 触摸事件支持（移动端）
        this.lyricContent.addEventListener('touchstart', () => {
            this.isUserScrolling = true;
            this.resetAutoScrollTimer();
        });

        this.lyricContent.addEventListener('wheel', () => {
            this.isUserScrolling = true;
            this.resetAutoScrollTimer();
        });

        this.lyricScrollDetectionBound = true;
    }

    // 重置自动滚动计时器
    resetAutoScrollTimer() {
        if (this.autoScrollTimeout) {
            clearTimeout(this.autoScrollTimeout);
        }
        // 3秒后恢复自动滚动
        this.autoScrollTimeout = setTimeout(() => {
            this.isUserScrolling = false;
        }, 3000);
    }

    // 高亮当前歌词行
    highlightLyric(lineIndex) {
        if (!this.lyricContent || !this.lyricPanel) return;

        // 移除旧的高亮
        this.lyricContent.querySelectorAll('.lyric-line.active').forEach(line => {
            line.classList.remove('active');
        });

        // 添加新的高亮
        const lineEl = this.lyricContent.querySelector(`.lyric-line[data-index="${lineIndex}"]`);
        if (lineEl) {
            lineEl.classList.add('active');

            // 只有在用户没有手动滚动时才自动滚动
            if (!this.isUserScrolling) {
                // 获取歌词面板和歌词容器的信息
                const panelRect = this.lyricPanel.getBoundingClientRect();
                const contentRect = this.lyricContent.getBoundingClientRect();
                const lineRect = lineEl.getBoundingClientRect();

                // 计算让当前行在面板中居中的滚动位置
                // 目标位置 = 行在视口中的中心 - 面板的中心
                const targetScrollTop = this.lyricContent.scrollTop + (lineRect.top + lineRect.height / 2) - (panelRect.top + panelRect.height / 2);

                this.lyricContent.scrollTo({
                    top: Math.max(0, targetScrollTop),
                    behavior: 'smooth'
                });
            }
        }
    }

    // 强制滚动到当前歌词行（用于手动点击或切换歌曲时）
    scrollToCurrentLyric(lineIndex) {
        if (!this.lyricContent || !this.lyricPanel) return;

        const lineEl = this.lyricContent.querySelector(`.lyric-line[data-index="${lineIndex}"]`);
        if (lineEl) {
            const panelRect = this.lyricPanel.getBoundingClientRect();
            const lineRect = lineEl.getBoundingClientRect();

            const targetScrollTop = this.lyricContent.scrollTop + (lineRect.top + lineRect.height / 2) - (panelRect.top + panelRect.height / 2);

            this.lyricContent.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
            });
        }
    }

    // 显示登录弹窗
    showLoginModal() {
        this.loginModal?.classList.add('active');
    }

    // 隐藏登录弹窗
    hideLoginModal() {
        this.loginModal?.classList.remove('active');
        this.onLoginModalHide?.();
    }

    // 切换登录标签
    switchLoginTab(tab) {
        document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.login-tab[data-tab="${tab}"]`)?.classList.add('active');

        if (tab === 'qrcode') {
            this.qrcodePane?.classList.add('active');
            this.phonePane?.classList.remove('active');
        } else {
            this.qrcodePane?.classList.remove('active');
            this.phonePane?.classList.add('active');
        }
    }

    // 显示歌词循环弹窗
    showLoopModal() {
        this.lyricLoopModal?.classList.add('active');
    }

    // 隐藏歌词循环弹窗
    hideLoopModal() {
        this.lyricLoopModal?.classList.remove('active');
    }

    // 更新循环弹窗内容
    updateLoopModal(lyrics, timeRange) {
        if (!this.loopLyric || !timeRange) return;

        const lines = lyrics.filter(l => l.time >= timeRange.startTime && l.time <= timeRange.endTime);
        this.loopLyric.replaceChildren();

        lines.forEach(line => {
            const content = document.createElement('p');
            content.textContent = line.content || '♪';
            this.loopLyric.appendChild(content);

            if (line.translated) {
                const translated = document.createElement('p');
                translated.textContent = line.translated;
                translated.style.color = 'var(--text-secondary)';
                translated.style.fontSize = '14px';
                this.loopLyric.appendChild(translated);
            }
        });

        this.loopStartTime.textContent = Player.formatTime(timeRange.startTime);
        this.loopEndTime.textContent = Player.formatTime(timeRange.endTime);
    }

    // 显示Toast提示
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        this.toastContainer?.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // 更新用户信息
    updateUserInfo(user) {
        if (!this.userInfo || !this.accountInfo) return;

        if (!user) {
            const loginBtn = document.createElement('button');
            loginBtn.id = 'loginBtn';
            loginBtn.className = 'login-btn';
            loginBtn.textContent = '登录';
            loginBtn.addEventListener('click', () => this.onLoginRequest?.());

            const notLogin = document.createElement('p');
            notLogin.className = 'not-login';
            notLogin.textContent = '未登录';

            this.userInfo.replaceChildren(loginBtn);
            this.accountInfo.replaceChildren(notLogin);
            this.loginBtn = loginBtn;
            return;
        }

        const userLogged = this.createDiv('user-logged');
        userLogged.append(
            this.createSafeImage(user.avatarUrl, user.nickname, 'user-avatar', this.createFallbackCover(40)),
            this.createDiv('user-nickname', user.nickname || '用户')
        );

        const accountLogged = this.createDiv('account-logged');
        const accountAvatar = this.createSafeImage(user.avatarUrl, user.nickname, '', this.createFallbackCover(56));
        const nickname = document.createElement('p');
        nickname.className = 'panel-song-title';
        nickname.textContent = user.nickname || '用户';

        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.className = 'logout-btn';
        logoutBtn.textContent = '退出登录';
        logoutBtn.addEventListener('click', () => {
            this.onLogout?.();
        });

        accountLogged.append(accountAvatar, nickname, logoutBtn);
        this.userInfo.replaceChildren(userLogged);
        this.accountInfo.replaceChildren(accountLogged);
    }

    // 搜索结果显示
    showSearchSuggestions(suggestions) {
        if (!this.searchResults) return;

        if (!suggestions || suggestions.length === 0) {
            this.hideSearchResults();
            return;
        }

        this.searchResults.replaceChildren();
        this.searchResults.appendChild(this.createDiv('search-section-title', '搜索建议'));

        suggestions.slice(0, 8).forEach(keyword => {
            const item = this.createDiv('search-result-item suggestion-item');
            item.dataset.keyword = String(keyword || '');

            const icon = this.createDiv('search-result-icon', '⌕');
            const info = this.createDiv('search-result-info');
            info.appendChild(this.createDiv('search-result-title', keyword || ''));

            item.append(icon, info);
            item.addEventListener('click', () => {
                this.onSearchSuggestionClick?.(item.dataset.keyword);
            });

            this.searchResults.appendChild(item);
        });

        this.searchResults.classList.add('active');
    }

    showSearchResults(results, searchType = 1) {
        if (!this.searchResults) return;

        if (!results || results.length === 0) {
            this.searchResults.replaceChildren(this.createDiv('search-empty', '未找到相关结果'));
            this.searchResults.classList.add('active');
            return;
        }

        const titleMap = {
            1: '单曲结果',
            1000: '歌单结果',
            100: '歌手结果'
        };

        this.searchResults.replaceChildren();
        this.searchResults.appendChild(
            this.createDiv('search-section-title', titleMap[searchType] || '搜索结果')
        );

        results.slice(0, 10).forEach(item => {
            const itemType = item.type || (searchType === 100 ? 'artist' : searchType === 1000 ? 'playlist' : 'song');
            const meta = itemType === 'song'
                ? `${item.artist || '未知艺术家'} · ${item.album || '未知专辑'}`
                : (item.subtitle || '');
            const duration = itemType === 'song' ? (item.durationStr || '--:--') : '';
            const icon = itemType === 'artist' ? '♫' : itemType === 'playlist' ? '☰' : '♪';

            const resultItem = this.createDiv('search-result-item');
            resultItem.dataset.id = String(item.id);
            resultItem.dataset.type = itemType;
            resultItem.dataset.name = item.name || '';

            if (item.cover) {
                resultItem.appendChild(
                    this.createSafeImage(item.cover, item.name, 'result-cover', this.createFallbackCover(48))
                );
            } else {
                resultItem.appendChild(this.createDiv('search-result-icon', icon));
            }

            const info = this.createDiv('search-result-info');
            info.appendChild(this.createDiv('search-result-title', item.name || '未命名结果'));
            if (meta) {
                info.appendChild(this.createDiv('search-result-artist', meta));
            }
            resultItem.appendChild(info);

            if (duration) {
                const durationEl = document.createElement('span');
                durationEl.className = 'search-result-duration';
                durationEl.textContent = duration;
                resultItem.appendChild(durationEl);
            }

            resultItem.addEventListener('click', () => {
                this.onSearchResultClick?.({
                    id: parseInt(resultItem.dataset.id, 10),
                    type: resultItem.dataset.type,
                    name: resultItem.dataset.name
                });
            });

            this.searchResults.appendChild(resultItem);
        });

        this.searchResults.classList.add('active');
    }

    // 设置旋转唱片
    setDiscRotating(isPlaying) {
        if (this.albumCover) {
            this.albumCover.classList.toggle('playing', isPlaying);
        }
    }
}

// 导出
window.UIManager = UIManager;
