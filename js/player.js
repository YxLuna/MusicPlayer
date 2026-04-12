/**
 * Player模块 - 音频播放核心
 */

class Player {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.currentSong = null;
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.loopMode = 'sequence'; // sequence, single, random
        this.volume = 70;
        this.quality = 128; // 128, 192, 320
        this.playbackRate = 1;
        this.isLooping = false;
        this.loopStartTime = 0;
        this.loopEndTime = 0;

        this.init();
    }

    init() {
        // 绑定事件
        this.bindEvents();

        // 恢复音量
        this.audio.volume = this.volume / 100;
    }

    bindEvents() {
        // 播放状态变化
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.onPlayStateChange?.(true);
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.onPlayStateChange?.(false);
        });

        // 加载元数据
        this.audio.addEventListener('loadedmetadata', () => {
            this.onLoadedMetadata?.();
        });

        // 播放结束
        this.audio.addEventListener('ended', () => {
            this.onEnded?.();
        });

        // 播放进度更新
        this.audio.addEventListener('timeupdate', () => {
            this.onTimeUpdate?.();
        });

        // 错误处理
        this.audio.addEventListener('error', (e) => {
            console.error('播放错误:', e);
            this.onError?.(e);
        });

        // 缓冲
        this.audio.addEventListener('waiting', () => {
            this.onWaiting?.();
        });

        this.audio.addEventListener('canplay', () => {
            this.onCanPlay?.();
        });
    }

    // 加载歌曲
    async loadSong(song) {
        if (!song || !song.id) return;

        this.currentSong = song;

        try {
            // 获取歌曲URL
            const urlData = await API.getSongUrl(song.id, this.quality * 1000);
            if (!urlData.data || !urlData.data[0] || !urlData.data[0].url) {
                throw new Error('无法获取歌曲URL');
            }

            let songUrl = urlData.data[0].url;
            console.log('[Player] 原始URL:', songUrl);
            // 将HTTP转换为HTTPS，解决混合内容问题
            if (songUrl && songUrl.startsWith('http://')) {
                songUrl = songUrl.replace('http://', 'https://');
                console.log('[Player] 转换后URL:', songUrl);
            }
            this.audio.src = songUrl;
            console.log('[Player] 音频源已设置');

            // 更新音质信息
            song.quality = urlData.data[0].br ? Math.floor(urlData.data[0].br / 1000) + 'k' : '未知';
            song.size = urlData.data[0].size;
            song.type = urlData.data[0].type;

            // 触发歌曲加载完成
            this.onSongLoaded?.(song);

        } catch (error) {
            console.error('加载歌曲失败:', error);
            this.onError?.(error);
        }
    }

    // 播放
    async play() {
        try {
            console.log('[Player] 尝试播放，当前状态:', this.audio.readyState);
            if (this.audio.readyState < 2) {
                console.log('[Player] 音频未准备好，等待...');
                await new Promise(resolve => {
                    this.audio.addEventListener('canplay', resolve, { once: true });
                    setTimeout(resolve, 3000);
                });
            }
            await this.audio.play();
            console.log('[Player] 播放成功');
        } catch (error) {
            console.error('[Player] 播放失败:', error);
            this.onError?.(error);
        }
    }

    // 暂停
    pause() {
        this.audio.pause();
    }

    // 播放/暂停切换
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    // 上一曲
    prev() {
        if (this.playlist.length === 0) return;

        if (this.loopMode === 'single') {
            this.seek(0);
            this.play();
            return;
        }

        if (this.loopMode === 'random') {
            this.currentIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        }

        this.playCurrent();
    }

    // 下一曲
    next() {
        if (this.playlist.length === 0) return;

        if (this.loopMode === 'single') {
            // 单曲循环
            this.seek(0);
            this.play();
            return;
        }

        if (this.loopMode === 'random') {
            this.currentIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        }

        this.playCurrent();
    }

    // 播放当前歌曲
    async playCurrent() {
        if (this.playlist[this.currentIndex]) {
            await this.loadSong(this.playlist[this.currentIndex]);
            this.play();
        }
    }

    // 设置播放列表
    setPlaylist(songs, startIndex = 0) {
        this.playlist = songs;
        this.currentIndex = startIndex;
    }

    // 跳转到指定时间
    seek(time) {
        if (typeof time === 'string') {
            const parts = time.split(':');
            time = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        this.audio.currentTime = time;
    }

    // 设置进度百分比
    seekPercent(percent) {
        const time = (percent / 100) * this.audio.duration;
        this.seek(time);
    }

    // 获取当前时间
    getCurrentTime() {
        return this.audio.currentTime;
    }

    // 获取总时长
    getDuration() {
        return this.audio.duration || 0;
    }

    // 设置音量
    setVolume(value) {
        this.volume = Math.max(0, Math.min(100, value));
        this.audio.volume = this.volume / 100;
    }

    // 切换循环模式
    toggleLoopMode() {
        const modes = ['sequence', 'single', 'random'];
        const currentIndex = modes.indexOf(this.loopMode);
        this.loopMode = modes[(currentIndex + 1) % modes.length];
        return this.loopMode;
    }

    // 设置播放速度
    setPlaybackRate(rate) {
        this.playbackRate = rate;
        this.audio.playbackRate = rate;
    }

    // 设置音质
    setQuality(quality) {
        this.quality = quality;
    }

    // 歌词循环
    startLoop(startTime, endTime) {
        this.isLooping = true;
        this.loopStartTime = startTime;
        this.loopEndTime = endTime;
        this.seek(startTime);
        this.play();
    }

    stopLoop() {
        this.isLooping = false;
    }

    // 下载歌曲
    downloadSong() {
        if (!this.currentSong || !this.audio.src) return;

        const link = document.createElement('a');
        link.href = this.audio.src;
        link.download = `${this.currentSong.name} - ${this.currentSong.ar?.[0]?.name || '未知艺术家'}.${this.currentSong.type || 'mp3'}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 格式化时间
    static formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// 导出
window.Player = Player;
