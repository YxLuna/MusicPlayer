/**
 * Lyric模块 - 歌词处理与同步
 */

class LyricParser {
    constructor() {
        this.lyrics = []; // 原始歌词
        this.translatedLyrics = []; // 翻译歌词
        this.romajiLyrics = []; // 罗马音
        this.currentLine = 0;
        this.isEnabled = true;
        this.selectedLines = []; // 选中的歌词行
        this.isSelecting = false;
    }

    // 解析LRC歌词
    parse(lrcText) {
        this.lyrics = [];
        this.translatedLyrics = [];
        this.romajiLyrics = [];
        this.currentLine = 0;

        if (!lrcText) return;

        const lines = lrcText.split('\n');
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

        for (const line of lines) {
            // 匹配时间标签
            let match;
            const times = [];
            while ((match = timeRegex.exec(line)) !== null) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = parseInt(match[3].padEnd(3, '0'));
                const time = minutes * 60 + seconds + milliseconds / 1000;
                times.push(time);
            }

            if (times.length === 0) continue;

            // 获取歌词内容
            const content = line.replace(timeRegex, '').trim();

            if (!content) continue;

            // 检测歌词类型
            if (content.startsWith('[ti:') || content.startsWith('[ar:') ||
                content.startsWith('[al:') || content.startsWith('[by:') ||
                content.startsWith('[offset:')) {
                continue;
            }

            // 判断是否为翻译歌词
            if (content.startsWith('[')) {
                const transMatch = content.match(/\[(.*?)\](.*)/);
                if (transMatch) {
                    const tag = transMatch[1].toLowerCase();
                    const transContent = transMatch[2].trim();
                    if (tag === '中文' || tag === 'translate' || tag === 'tlyric') {
                        // 翻译歌词，尝试与上一行匹配
                        if (this.lyrics.length > 0) {
                            const lastIndex = this.lyrics.length - 1;
                            this.lyrics[lastIndex].translated = transContent;
                        }
                        continue;
                    }
                }
            }

            // 添加到歌词列表
            for (const time of times) {
                this.lyrics.push({
                    time: time,
                    content: content,
                    translated: '',
                    romaji: ''
                });
            }
        }

        // 按时间排序
        this.lyrics.sort((a, b) => a.time - b.time);
    }

    // 解析TLRC歌词（带翻译）
    parseTLRC(lrcText, tlyricText = '') {
        // 先解析原始歌词
        this.parse(lrcText);

        if (!tlyricText) return;

        // 解析翻译歌词
        const tLines = tlyricText.split('\n');
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

        for (const line of tLines) {
            let match;
            const times = [];
            while ((match = timeRegex.exec(line)) !== null) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = parseInt(match[3].padEnd(3, '0'));
                const time = minutes * 60 + seconds + milliseconds / 1000;
                times.push(time);
            }

            if (times.length === 0) continue;

            const content = line.replace(timeRegex, '').trim();
            if (!content) continue;

            // 找到对应的原始歌词行
            for (const lyric of this.lyrics) {
                if (Math.abs(lyric.time - times[0]) < 0.5) {
                    lyric.translated = content;
                    break;
                }
            }
        }
    }

    // 解析JSON格式歌词
    parseJSON(lyricData) {
        this.lyrics = [];

        if (!lyricData || !lyricData.lrc || !lyricData.lrc.lyric) {
            this.parse(lyricData?.lrc?.lyric || '');
            return;
        }

        // 解析LRC
        this.parse(lyricData.lrc.lyric);

        // 解析翻译
        if (lyricData.tlyric && lyricData.tlyric.lyric) {
            this.parseTLRC(lyricData.lrc.lyric, lyricData.tlyric.lyric);
        }
    }

    // 获取当前播放行
    getCurrentLine(currentTime) {
        if (!this.lyrics.length) return -1;

        for (let i = this.lyrics.length - 1; i >= 0; i--) {
            if (currentTime >= this.lyrics[i].time) {
                return i;
            }
        }
        return 0;
    }

    // 格式化歌词用于显示
    formatForDisplay() {
        return this.lyrics.map((line, index) => ({
            index: index,
            time: line.time,
            timeStr: Player.formatTime(line.time),
            content: line.content || '♪',
            translated: line.translated,
            romaji: line.romaji
        }));
    }

    // 获取指定时间范围的歌词
    getLyricsInRange(startTime, endTime) {
        return this.lyrics.filter(line =>
            line.time >= startTime && line.time <= endTime
        );
    }

    // 查找最近的歌词行
    findNearestLine(time) {
        if (!this.lyrics.length) return null;

        let minDiff = Infinity;
        let nearest = null;

        for (const lyric of this.lyrics) {
            const diff = Math.abs(lyric.time - time);
            if (diff < minDiff) {
                minDiff = diff;
                nearest = lyric;
            }
        }

        return nearest;
    }

    // 选择歌词行（用于循环播放）
    selectLine(lineIndex, isMultiSelect = false) {
        if (isMultiSelect) {
            const index = this.selectedLines.indexOf(lineIndex);
            if (index > -1) {
                this.selectedLines.splice(index, 1);
            } else {
                this.selectedLines.push(lineIndex);
                this.selectedLines.sort((a, b) => a - b);
            }
        } else {
            this.selectedLines = [lineIndex];
        }
    }

    // 获取选中歌词的时间范围
    getSelectedTimeRange() {
        if (this.selectedLines.length === 0) return null;

        const startLine = this.lyrics[this.selectedLines[0]];
        const endLine = this.lyrics[this.selectedLines[this.selectedLines.length - 1]];

        // 下一句开始作为结束时间
        const endIndex = this.selectedLines[this.selectedLines.length - 1];
        const endTime = endIndex < this.lyrics.length - 1
            ? this.lyrics[endIndex + 1].time
            : startLine.time + 30; // 默认30秒

        return {
            startTime: startLine.time,
            endTime: endTime,
            startLine: startLine.content,
            endLine: this.lyrics[endIndex].content
        };
    }

    // 清除选择
    clearSelection() {
        this.selectedLines = [];
    }

    // 启用/禁用歌词
    toggle() {
        this.isEnabled = !this.isEnabled;
        return this.isEnabled;
    }
}

// 导出
window.LyricParser = LyricParser;
