/**
 * CloudMusic Pro Player - 主应用入口
 */

class MusicApp {
    constructor() {
        // 初始化模块
        this.player = new Player();
        this.playlistManager = new PlaylistManager();
        this.lyricParser = new LyricParser();
        this.visualizer = new AudioVisualizer();
        this.ui = new UIManager();

        // 状态
        this.isLoggedIn = false;
        this.user = null;
        this.qrCheckTimer = null;
        this.isLoopPlaying = false;
        this.storageKey = 'musicPlayerState';
        this.persistedState = this.loadPersistedState();
        this.pendingRestoreState = null;
        this.hasRestoredSession = false;
        this.lastPersistedTime = 0;
        this.searchType = this.persistedState.searchType || 1;
        this.searchSuggestTimer = null;

        this.init();
    }

    async init() {
        console.log('CloudMusic Pro Player 初始化中...');

        // 初始化API（恢复登录状态）
        API.init();

        // 恢复已保存的用户信息
        const savedUser = API.getUserInfo();
        if (savedUser) {
            this.isLoggedIn = true;
            this.user = savedUser;
            this.ui.updateUserInfo(this.user);
            // 尝试获取最新用户信息（可能需要刷新）
            this.loadUserInfo().catch(() => {});
        }

        // 绑定事件回调
        this.bindCallbacks();

        // 恢复持久化偏好
        this.applyPersistedPreferences();
        this.ui.setSearchType(this.searchType);

        // 初始化默认歌单
        await this.loadDefaultPlaylists();

        // 恢复上次播放歌单，否则加载第一个歌单
        const restored = await this.tryRestorePlaybackSession();
        if (!restored && this.playlistManager.playlists.length > 0) {
            await this.selectPlaylist(this.playlistManager.playlists[0].id);
        }

        console.log('初始化完成');
    }

    // 绑定回调
    bindCallbacks() {
        // Player回调
        this.player.onPlayStateChange = (isPlaying) => this.handlePlayStateChange(isPlaying);
        this.player.onLoadedMetadata = () => this.handleLoadedMetadata();
        this.player.onTimeUpdate = () => this.handleTimeUpdate();
        this.player.onEnded = () => this.handleEnded();
        this.player.onError = (error) => this.handleError(error);
        this.player.onSongLoaded = (song) => this.handleSongLoaded(song);

        // UI回调
        this.ui.onProgressSeek = (percent) => this.handleProgressSeek(percent);
        this.ui.onProgressSeekComplete = () => this.handleProgressSeekComplete();
        this.ui.onVolumeChange = (percent) => this.handleVolumeChange(percent);
        this.ui.onVolumeToggle = () => this.handleVolumeToggle();
        this.ui.onPlaylistSelect = (id) => this.selectPlaylist(id);
        this.ui.onTrackSelect = (index) => this.playTrack(index);
        this.ui.onLyricClick = (index, isMulti) => this.handleLyricClick(index, isMulti);
        this.ui.onSearch = () => this.handleSearch();
        this.ui.onSearchInput = (keywords) => this.handleSearchInput(keywords);
        this.ui.onSearchTypeChange = (type) => this.handleSearchTypeChange(type);
        this.ui.onSearchSuggestionClick = (keyword) => this.handleSearchSuggestionClick(keyword);
        this.ui.onSearchResultClick = (item) => this.handleSearchResultClick(item);
        this.ui.onLogout = () => this.logout();
        this.ui.onLoginRequest = () => this.requestLogin();
        this.ui.onLoginModalHide = () => this.stopQrLoginCheck();
    }

    loadPersistedState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('读取播放状态失败:', error);
            return {};
        }
    }

    persistPlaybackState(extra = {}) {
        try {
            const currentPlaylistId = Number.isFinite(Number(this.playlistManager.currentPlaylist?.id))
                ? Number(this.playlistManager.currentPlaylist.id)
                : null;
            const hasExplicitPlaylistId = Object.prototype.hasOwnProperty.call(extra, 'playlistId');
            const playlistId = currentPlaylistId !== null
                ? currentPlaylistId
                : (hasExplicitPlaylistId ? extra.playlistId : (this.persistedState.playlistId ?? null));
            const currentIndex = playlistId !== null
                ? this.player.currentIndex
                : (this.persistedState.currentIndex ?? null);
            const currentSongId = playlistId !== null
                ? (this.player.currentSong?.id || null)
                : (this.persistedState.currentSongId ?? null);
            const currentTime = playlistId !== null
                ? Math.floor(this.player.getCurrentTime() || 0)
                : (this.persistedState.currentTime ?? 0);

            const state = {
                ...this.persistedState,
                volume: this.player.volume,
                loopMode: this.player.loopMode,
                quality: this.player.quality,
                playbackRate: this.player.playbackRate,
                playlistId,
                currentIndex,
                currentSongId,
                currentTime,
                searchType: this.searchType,
                ...extra
            };

            localStorage.setItem(this.storageKey, JSON.stringify(state));
            this.persistedState = state;
        } catch (error) {
            console.error('保存播放状态失败:', error);
        }
    }

    applyPersistedPreferences() {
        const volume = Number(this.persistedState.volume);
        const quality = Number(this.persistedState.quality);
        const playbackRate = Number(this.persistedState.playbackRate);
        const loopMode = this.persistedState.loopMode;

        if (!Number.isNaN(volume)) {
            this.player.setVolume(volume);
            this.ui.updateVolumeUI(volume);
        } else {
            this.ui.updateVolumeUI(this.player.volume);
        }

        if (!Number.isNaN(quality) && [128, 192, 320].includes(quality)) {
            this.player.setQuality(quality);
        }
        this.ui.updateQualityButtons(this.player.quality);

        if (!Number.isNaN(playbackRate) && playbackRate > 0) {
            this.player.setPlaybackRate(playbackRate);
        }

        if (['sequence', 'single', 'random'].includes(loopMode)) {
            this.player.loopMode = loopMode;
        }
        this.ui.updateLoopMode(this.player.loopMode);
    }

    async tryRestorePlaybackSession() {
        if (this.hasRestoredSession) return true;

        const playlistId = Number(this.persistedState.playlistId);
        if (Number.isNaN(playlistId)) return false;
        const savedIndex = Number(this.persistedState.currentIndex);
        const savedTime = Math.max(0, Number(this.persistedState.currentTime) || 0);

        await this.selectPlaylist(playlistId);

        const currentPlaylistId = Number(this.playlistManager.currentPlaylist?.id);
        if (!this.player.playlist.length || currentPlaylistId !== playlistId) {
            return false;
        }

        const safeIndex = Number.isNaN(savedIndex)
            ? 0
            : Math.max(0, Math.min(savedIndex, this.player.playlist.length - 1));

        this.pendingRestoreState = {
            songId: this.player.playlist[safeIndex]?.id,
            time: savedTime
        };

        await this.playTrack(safeIndex, { autoPlay: false });
        this.ui.updatePlayState(false);
        this.hasRestoredSession = true;
        this.ui.showToast('已恢复上次播放状态', 'success');
        return true;
    }

    // 加载默认歌单
    async loadDefaultPlaylists() {
        try {
            await this.playlistManager.initDefaultPlaylists();
            this.ui.renderPlaylists(this.playlistManager.playlists, this.playlistManager.currentPlaylist?.id);
        } catch (error) {
            console.error('加载默认歌单失败:', error);
            // 使用备用歌单
            this.playlistManager.playlists = [
                { id: 3778678, name: '热歌榜', cover: '', count: 0 },
                { id: 3779629, name: '新歌榜', cover: '', count: 0 }
            ];
            this.ui.renderPlaylists(this.playlistManager.playlists, this.playlistManager.currentPlaylist?.id);
        }
    }

    // 选择歌单
    async selectPlaylist(playlistId) {
        this.ui.showToast('加载中...', 'info');

        try {
            const playlist = await this.playlistManager.getPlaylistDetail(playlistId);
            if (playlist) {
                // 设置播放列表
                this.player.setPlaylist(playlist.tracks, 0);
                this.ui.renderPlaylists(this.playlistManager.playlists, playlistId);
                this.ui.renderTrackList(playlist.tracks);
                this.persistPlaybackState({ playlistId, currentIndex: 0, currentSongId: null, currentTime: 0 });

                // 不自动播放，只显示提示
                // 如果当前有播放的歌曲，保持播放状态
                // 清空当前歌曲信息（如果没有在播放）
                if (!this.player.currentSong) {
                    this.ui.updateSongInfo({
                        name: '请选择一首歌曲',
                        artist: '点击列表中的歌曲开始播放',
                        cover: ''
                    });
                }

                this.ui.showToast('已加载: ' + playlist.name + '，点击歌曲播放', 'success');
            }
        } catch (error) {
            console.error('加载歌单失败:', error);
            this.ui.showToast('加载失败: ' + error.message, 'error');
        }
    }

    // 播放歌曲
    async playTrack(index, options = {}) {
        const { autoPlay = true } = options;
        if (index < 0 || index >= this.player.playlist.length) return;

        this.player.currentIndex = index;
        const song = this.player.playlist[index];

        await this.player.loadSong(song);
        if (autoPlay) {
            this.player.play();
        } else {
            this.player.pause();
        }
        this.ui.updateSongInfo(song);

        // 更新列表状态
        this.ui.renderTrackList(this.player.playlist, index);
        this.persistPlaybackState({ currentIndex: index, currentSongId: song.id, currentTime: 0 });
    }

    // 加载歌词
    async loadLyrics(songId) {
        try {
            this.lyricParser.clearSelection();
            const result = await API.getLyric(songId);
            if (result.lrc) {
                this.lyricParser.parseJSON(result);
                this.ui.renderLyrics(this.lyricParser.formatForDisplay());
            } else {
                this.lyricParser.lyrics = [];
                this.ui.renderLyrics([{ time: 0, content: '暂无歌词', translated: '' }]);
            }
        } catch (error) {
            console.error('加载歌词失败:', error);
            this.ui.renderLyrics([{ time: 0, content: '加载歌词失败', translated: '' }]);
        }
    }

    // 播放搜索结果
    async playSearchResult(songId) {
        this.ui.searchResults.classList.remove('active');

        try {
            // 获取歌曲详情
            const songs = await this.playlistManager.getSongDetail([songId]);
            if (songs && songs.length > 0) {
                // 创建临时播放列表
                this.playlistManager.currentPlaylist = null;
                this.player.setPlaylist(songs, 0);
                await this.player.loadSong(songs[0]);
                this.player.play();
                this.ui.updateSongInfo(songs[0]);
                this.ui.renderTrackList(songs, 0);

                this.ui.showToast('已播放: ' + songs[0].name, 'success');
            }
        } catch (error) {
            console.error('播放失败:', error);
            this.ui.showToast('播放失败', 'error');
        }
    }

    // 处理播放状态变化
    handlePlayStateChange(isPlaying) {
        this.ui.updatePlayState(isPlaying);
        this.ui.setDiscRotating(isPlaying);

        if (isPlaying) {
            this.visualizer.init(this.player.audio);
            this.visualizer.start();
        } else {
            this.visualizer.stop();
        }
    }

    // 处理加载元数据
    handleLoadedMetadata() {
        const duration = this.player.getDuration();
        if (this.pendingRestoreState && this.player.currentSong?.id === this.pendingRestoreState.songId) {
            const restoreTime = Math.min(this.pendingRestoreState.time, Math.max(0, duration - 1));
            if (restoreTime > 0) {
                this.player.seek(restoreTime);
                this.ui.updateProgressBar(duration ? (restoreTime / duration) * 100 : 0);
                this.ui.updateTimeDisplay(restoreTime, duration);
            } else {
                this.ui.updateTimeDisplay(0, duration);
            }
            this.pendingRestoreState = null;
            return;
        }

        this.ui.updateTimeDisplay(0, duration);
    }

    // 处理时间更新
    handleTimeUpdate() {
        const current = this.player.getCurrentTime();
        const total = this.player.getDuration();

        // 更新进度条
        const percent = (current / total) * 100;
        this.ui.updateProgressBar(percent);

        // 更新时间
        this.ui.updateTimeDisplay(current, total);

        if (this.playlistManager.currentPlaylist?.id && Math.abs(current - this.lastPersistedTime) >= 5) {
            this.lastPersistedTime = Math.floor(current);
            this.persistPlaybackState({ currentTime: this.lastPersistedTime });
        }

        // 更新歌词高亮
        const lineIndex = this.lyricParser.getCurrentLine(current);
        if (lineIndex !== this.lyricParser.currentLine) {
            this.lyricParser.currentLine = lineIndex;
            this.ui.highlightLyric(lineIndex);
        }

        // 处理歌词循环
        if (this.player.isLooping && current >= this.player.loopEndTime) {
            this.player.seek(this.player.loopStartTime);
        }
    }

    // 处理播放结束
    handleEnded() {
        if (this.player.isLooping) {
            this.player.seek(this.player.loopStartTime);
            this.player.play();
        } else {
            this.player.next();
        }
    }

    // 处理错误
    handleError(error) {
        console.error('播放错误:', error);
        this.ui.showToast('播放出错: ' + error.message, 'error');
    }

    requestLogin() {
        this.ui.showLoginModal();
        this.startQrLogin();
    }

    stopQrLoginCheck() {
        if (this.qrCheckTimer) {
            clearInterval(this.qrCheckTimer);
            this.qrCheckTimer = null;
        }
    }

    // 处理喜欢/取消喜欢
    async handleLike() {
        const currentSong = this.player.currentSong;
        if (!currentSong) {
            this.ui.showToast('请先选择一首歌曲', 'info');
            return;
        }

        // 检查是否已登录
        if (!this.isLoggedIn) {
            this.ui.showToast('请先登录', 'info');
            this.requestLogin();
            return;
        }

        try {
            // 切换喜欢状态
            const liked = this.ui.isLiked ? false : true;
            const result = await API.likeSong(currentSong.id, liked);

            if (result.code === 200) {
                this.ui.isLiked = !this.ui.isLiked;
                this.ui.updateLikeButton(this.ui.isLiked);
                this.ui.showToast(liked ? '已添加到喜欢' : '已取消喜欢', 'success');
            } else {
                this.ui.showToast('操作失败', 'error');
            }
        } catch (error) {
            console.error('喜欢操作失败:', error);
            this.ui.showToast('操作失败: ' + error.message, 'error');
        }
    }

    // 检查当前歌曲是否已喜欢
    async checkLikeStatus(songId) {
        if (!this.isLoggedIn) {
            this.ui.isLiked = false;
            this.ui.updateLikeButton(false);
            return;
        }

        try {
            const result = await API.getLikeList(this.user.id);
            // 网易云API返回格式是 result.data.ids
            const likeIds = result.data?.ids || result.ids || [];
            // 确保 songId 类型一致（转换为数字比较）
            const songIdNum = Number(songId);
            if (likeIds.includes(songIdNum)) {
                this.ui.isLiked = true;
            } else {
                this.ui.isLiked = false;
            }
            this.ui.updateLikeButton(this.ui.isLiked);
        } catch (error) {
            console.error('检查喜欢状态失败:', error);
        }
    }

    // 处理歌曲加载完成（切换歌曲时更新UI）
    handleSongLoaded(song) {
        this.player.stopLoop();
        this.lyricParser.clearSelection();
        this.ui.hideLoopModal();
        this.isLoopPlaying = false;

        // 更新歌曲信息
        this.ui.updateSongInfo(song);
        // 更新列表状态
        this.ui.renderTrackList(this.player.playlist, this.player.currentIndex);
        // 加载歌词
        this.loadLyrics(song.id);
        // 检查喜欢状态
        this.checkLikeStatus(song.id);
    }

    // 处理进度拖拽
    handleProgressSeek(percent) {
        // 预览效果
    }

    // 处理进度拖拽完成
    handleProgressSeekComplete() {
        const percent = parseFloat(this.ui.progressCurrent.style.width) || 0;
        this.player.seekPercent(percent);
    }

    // 处理音量变化
    handleVolumeChange(percent) {
        this.player.setVolume(percent);
        this.ui.updateVolumeIcon(percent);
        this.persistPlaybackState({ volume: this.player.volume });
    }

    // 处理音量切换
    handleVolumeToggle() {
        if (this.player.volume > 0) {
            this.player.setVolume(0);
            this.ui.updateVolumeIcon(0);
        } else {
            this.player.setVolume(70);
            this.ui.updateVolumeIcon(70);
        }
        this.ui.updateVolumeBar(this.player.volume);
        this.persistPlaybackState({ volume: this.player.volume });
    }

    // 处理歌词点击
    handleLyricClick(index, isMultiSelect) {
        const line = this.lyricParser.lyrics[index];
        if (!line) return;

        this.lyricParser.selectLine(index, isMultiSelect);

        // 显示选中状态
        this.ui.renderLyrics(this.lyricParser.formatForDisplay());

        const timeRange = this.lyricParser.getSelectedTimeRange();
        if (timeRange) {
            // 更新弹窗内容
            this.ui.updateLoopModal(this.lyricParser.formatForDisplay(), timeRange);
            this.ui.showLoopModal();

            // 设置循环
            this.player.startLoop(timeRange.startTime, timeRange.endTime);
            this.isLoopPlaying = true;
        }
    }

    // 处理搜索
    async handleSearch() {
        const keywords = this.ui.searchInput.value.trim();
        if (!keywords) return;

        try {
            const result = await this.playlistManager.search(keywords, this.searchType);
            const dataKey = this.searchType === 1000 ? 'playlists' : this.searchType === 100 ? 'artists' : 'songs';
            if (result && result.result && result.result[dataKey]) {
                const items = await this.playlistManager.parseSearchResult(result, this.searchType);
                this.ui.showSearchResults(items, this.searchType);
                this.persistPlaybackState({ searchType: this.searchType });
            } else {
                this.ui.showToast('未找到相关结果', 'info');
            }
        } catch (error) {
            console.error('搜索失败:', error);
            this.ui.showToast('搜索失败', 'error');
        }
    }

    handleSearchInput(keywords) {
        clearTimeout(this.searchSuggestTimer);

        if (!keywords.trim()) {
            this.ui.hideSearchResults();
            return;
        }

        if (keywords.trim().length < 2) return;

        this.searchSuggestTimer = setTimeout(async () => {
            try {
                const result = await API.searchSuggest(keywords.trim());
                const suggestions = (result.result?.allMatch || [])
                    .map(item => item.keyword)
                    .filter(Boolean);

                if (this.ui.searchInput.value.trim() === keywords.trim()) {
                    this.ui.showSearchSuggestions(suggestions);
                }
            } catch (error) {
                console.error('获取搜索建议失败:', error);
            }
        }, 250);
    }

    handleSearchTypeChange(type) {
        this.searchType = type;
        this.ui.setSearchType(type);
        this.persistPlaybackState({ searchType: type });

        if (this.ui.searchInput.value.trim()) {
            this.handleSearch();
        } else {
            this.ui.hideSearchResults();
        }
    }

    handleSearchSuggestionClick(keyword) {
        this.ui.searchInput.value = keyword;
        this.handleSearch();
    }

    async handleSearchResultClick(item) {
        if (!item || !item.id) return;

        if (item.type === 'playlist') {
            this.ui.hideSearchResults();
            await this.selectPlaylist(item.id);
            return;
        }

        if (item.type === 'artist') {
            this.ui.hideSearchResults();
            await this.playArtistTopSongs(item.id, item.name);
            return;
        }

        await this.playSearchResult(item.id);
    }

    async playArtistTopSongs(artistId, artistName = '该歌手') {
        try {
            const songs = await this.playlistManager.getArtistTopSongs(artistId);
            if (!songs.length) {
                this.ui.showToast('未找到该歌手热门歌曲', 'info');
                return;
            }

            this.playlistManager.currentPlaylist = null;
            this.player.setPlaylist(songs, 0);
            await this.playTrack(0);
            this.ui.showToast(`已载入 ${artistName} 热门歌曲`, 'success');
        } catch (error) {
            console.error('载入歌手热门歌曲失败:', error);
            this.ui.showToast('载入歌手热门歌曲失败', 'error');
        }
    }

    // 登录功能
    async startQrLogin() {
        try {
            this.stopQrLoginCheck();

            // 获取二维码key
            const keyResult = await API.getQrKey();
            const key = keyResult.data.unikey;

            // 生成二维码
            const qrResult = await API.createQrCode(key);
            this.ui.qrcodeImage.src = qrResult.data.qrimg;
            this.ui.qrcodeStatus.textContent = '请扫码登录';

            // 轮询检查二维码状态
            this.qrCheckTimer = setInterval(async () => {
                try {
                    const checkResult = await API.checkQrCode(key);

                    console.log('[App] 二维码状态:', checkResult.code, checkResult.message);

                    if (checkResult.code === 200) {
                        // 登录成功
                        this.stopQrLoginCheck();
                        this.ui.qrcodeStatus.textContent = '登录成功';
                        this.ui.hideLoginModal();
                        this.ui.showToast('登录成功', 'success');
                        await this.loadUserInfo();
                    } else if (checkResult.code === 301) {
                        this.stopQrLoginCheck();
                        this.ui.qrcodeStatus.textContent = '二维码已过期';
                        this.ui.showToast('二维码已过期，请重新扫码', 'error');
                    } else if (checkResult.code === 802) {
                        this.ui.qrcodeStatus.textContent = '请在手机上确认';
                    } else if (checkResult.code === 801 || checkResult.code === 800) {
                        this.ui.qrcodeStatus.textContent = '等待扫码中...';
                    }
                } catch (error) {
                    // 只有真正的错误才打印
                    const ignoreMessages = ['登录二维码未扫描', 'waiting', '授权登陆成功', '授权登录成功', '登陆成功', '登录成功'];
                    if (!ignoreMessages.some(msg => error.message.includes(msg))) {
                        console.error('检查二维码失败:', error);
                    }
                }
            }, 2000);
        } catch (error) {
            console.error('二维码登录失败:', error);
            this.ui.showToast('获取二维码失败', 'error');
        }
    }

    // 发送验证码
    async sendCaptcha() {
        const phone = this.ui.phoneInput.value.trim();
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            this.ui.showToast('请输入正确的手机号', 'error');
            return;
        }

        try {
            await API.sendCaptcha(phone);
            this.ui.captchaInput.style.display = 'flex';
            this.ui.phoneLoginBtn.textContent = '登录';
            this.ui.showToast('验证码已发送', 'success');
        } catch (error) {
            this.ui.showToast('发送失败: ' + error.message, 'error');
        }
    }

    // 手机号登录
    async loginWithPhone() {
        const phone = this.ui.phoneInput.value.trim();
        const captcha = this.ui.captchaCode.value.trim();

        if (!/^1[3-9]\d{9}$/.test(phone)) {
            this.ui.showToast('请输入正确的手机号', 'error');
            return;
        }

        if (!captcha || captcha.length !== 4) {
            this.ui.showToast('请输入4位验证码', 'error');
            return;
        }

        try {
            const result = await API.loginWithPhone(phone, captcha);
            if (result.code === 200) {
                this.ui.hideLoginModal();
                this.ui.showToast('登录成功', 'success');
                await this.loadUserInfo();
            } else {
                this.ui.showToast(result.message || '登录失败', 'error');
            }
        } catch (error) {
            this.ui.showToast('登录失败: ' + error.message, 'error');
        }
    }

    // 加载用户信息
    async loadUserInfo() {
        try {
            const account = await API.getUserAccount();
            if (account.account && account.account.id) {
                this.isLoggedIn = true;
                this.user = {
                    id: account.account.id,
                    nickname: account.account.nickname || account.profile?.nickname || '用户',
                    avatarUrl: account.profile?.avatarUrl || account.account.avatarUrl || ''
                };

                // 保存用户信息到 localStorage
                API.setUserInfo(this.user);

                this.ui.updateUserInfo(this.user);

                // 获取用户歌单
                await this.playlistManager.getUserPlaylists(this.user.id);
                this.ui.renderPlaylists(this.playlistManager.playlists, this.playlistManager.currentPlaylist?.id);
                await this.tryRestorePlaybackSession();

                this.ui.showToast('欢迎, ' + this.user.nickname, 'success');
            }
        } catch (error) {
            console.error('加载用户信息失败:', error);
        }
    }

    // 退出登录
    logout() {
        this.stopQrLoginCheck();
        this.isLoggedIn = false;
        this.user = null;
        API.clearCookie();
        this.ui.updateUserInfo(null);
        this.ui.showToast('已退出登录', 'info');

        // 重新加载默认歌单
        this.loadDefaultPlaylists();
    }

    // 绑定播放控制事件
    setupControls() {
        // 播放/暂停
        document.getElementById('playBtn')?.addEventListener('click', () => {
            this.player.togglePlay();
        });

        // 上一曲
        document.getElementById('prevBtn')?.addEventListener('click', () => {
            this.player.prev();
        });

        // 下一曲
        document.getElementById('nextBtn')?.addEventListener('click', () => {
            this.player.next();
        });

        // 循环模式
        document.getElementById('loopModeBtn')?.addEventListener('click', () => {
            const mode = this.player.toggleLoopMode();
            this.ui.updateLoopMode(mode);
            this.persistPlaybackState({ loopMode: mode });
        });

        // 下载
        document.getElementById('downloadBtn')?.addEventListener('click', () => {
            this.player.downloadSong();
        });

        // 喜欢/取消喜欢
        document.getElementById('likeBtn')?.addEventListener('click', () => {
            this.handleLike();
        });

        // 音质切换
        document.querySelectorAll('.quality-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const quality = parseInt(btn.dataset.quality);
                this.player.setQuality(quality);
                this.persistPlaybackState({ quality });

                // 重新加载当前歌曲并播放
                if (this.player.currentSong) {
                    await this.player.loadSong(this.player.currentSong);
                    this.player.play();
                    this.ui.showToast('已切换到 ' + quality + 'k 音质', 'success');
                }
            });
        });

        // 发送验证码
        document.getElementById('sendCaptchaBtn')?.addEventListener('click', () => {
            this.sendCaptcha();
        });

        // 手机登录
        document.getElementById('phoneLoginBtn')?.addEventListener('click', () => {
            if (this.ui.captchaInput.style.display === 'none') {
                this.sendCaptcha();
            } else {
                this.loginWithPhone();
            }
        });

        // 关闭歌词循环弹窗
        document.getElementById('closeLoopModal')?.addEventListener('click', () => {
            this.ui.hideLoopModal();
            this.player.stopLoop();
            this.lyricParser.clearSelection();
            this.ui.renderLyrics(this.lyricParser.formatForDisplay());
            this.isLoopPlaying = false;
        });

        // 循环播放按钮
        document.getElementById('loopPlayBtn')?.addEventListener('click', () => {
            if (this.isLoopPlaying) {
                this.player.pause();
                this.isLoopPlaying = false;
            } else {
                this.player.play();
                this.isLoopPlaying = true;
            }
        });

        // 重播按钮
        document.getElementById('loopReplayBtn')?.addEventListener('click', () => {
            this.player.seek(this.player.loopStartTime);
            this.player.play();
        });

        // 倍速控制
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.player.setPlaybackRate(parseFloat(btn.dataset.speed));
            });
        });
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MusicApp();
    window.app.setupControls();
});
