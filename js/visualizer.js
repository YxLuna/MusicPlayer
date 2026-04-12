/**
 * Visualizer模块 - 音频可视化
 */

class AudioVisualizer {
    constructor() {
        this.canvas = document.getElementById('visualizerCanvas');
        this.ctx = this.canvas?.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.isInitialized = false;
        this.animationId = null;
        this.isPlaying = false;

        this.barCount = 32;
        this.barWidth = 3;
        this.barGap = 2;
        this.colors = {
            start: '#ff6b9d',
            end: '#c44569'
        };
    }

    // 初始化音频上下文
    init(audioElement) {
        if (this.isInitialized) return;

        try {
            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 创建分析器
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;

            // 连接音频元素
            const source = this.audioContext.createMediaElementSource(audioElement);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            // 创建数据数组
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            this.isInitialized = true;
        } catch (error) {
            console.error('音频可视化初始化失败:', error);
        }
    }

    // 恢复音频上下文（浏览器策略）
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // 开始可视化
    start() {
        if (!this.isInitialized || this.isPlaying) return;

        this.isPlaying = true;
        this.resume();
        this.draw();
    }

    // 停止可视化
    stop() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // 绘制频谱
    draw() {
        if (!this.isPlaying || !this.analyser) return;

        this.animationId = requestAnimationFrame(() => this.draw());

        // 获取频率数据
        this.analyser.getByteFrequencyData(this.dataArray);

        // 清空画布
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 计算柱状图参数
        const totalWidth = this.canvas.width;
        const availableWidth = totalWidth - (this.barCount - 1) * this.barGap;
        this.barWidth = availableWidth / this.barCount;

        // 绘制柱状图
        for (let i = 0; i < this.barCount; i++) {
            const dataIndex = Math.floor(i * this.dataArray.length / this.barCount);
            const value = this.dataArray[dataIndex];
            const height = (value / 255) * this.canvas.height * 0.9;

            const x = i * (this.barWidth + this.barGap);
            const y = this.canvas.height - height;

            // 渐变色
            const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, y);
            gradient.addColorStop(0, this.colors.start);
            gradient.addColorStop(1, this.colors.end);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, this.barWidth - 1, height);
        }
    }

    // 设置颜色
    setColors(startColor, endColor) {
        this.colors.start = startColor;
        this.colors.end = endColor;
    }

    // 设置柱状图数量
    setBarCount(count) {
        this.barCount = Math.min(Math.max(count, 8), 64);
    }

    // 简单的频谱模拟（当AudioContext不可用时）
    simulate() {
        if (this.isInitialized) return;

        const draw = () => {
            if (!this.isPlaying) return;

            requestAnimationFrame(draw);

            if (!this.ctx) return;

            // 清空画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // 模拟频谱数据
            const bars = [];
            for (let i = 0; i < this.barCount; i++) {
                bars.push(Math.random() * 0.7 + 0.1);
            }

            // 绘制
            for (let i = 0; i < this.barCount; i++) {
                const height = bars[i] * this.canvas.height * 0.9;
                const x = i * (this.barWidth + this.barGap);
                const y = this.canvas.height - height;

                const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, y);
                gradient.addColorStop(0, this.colors.start);
                gradient.addColorStop(1, this.colors.end);

                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(x, y, this.barWidth - 1, height);
            }
        };

        this.isPlaying = true;
        draw();
    }

    // 销毁
    destroy() {
        this.stop();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.isInitialized = false;
    }
}

// 导出
window.AudioVisualizer = AudioVisualizer;
