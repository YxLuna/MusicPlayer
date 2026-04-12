/**
 * Visualizer模块 - 音频可视化（增强版）
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

        // 柱状图参数
        this.barCount = 24;
        this.barWidth = 3;
        this.barGap = 2;
        this.roundRadius = 2;

        // 历史数据用于平滑过渡
        this.previousBars = null;
        this.smoothingFactor = 0.3;  // 平滑因子 0-1，越小越平滑

        // 颜色配置 - 樱花主题
        this.colors = {
            start: '#ff6b9d',      // 粉红
            mid: '#ff9aaf',        // 浅粉
            end: '#ffb7c5',         // 樱花色
            glow: 'rgba(255, 183, 197, 0.5)',
            reflection: 'rgba(255, 183, 197, 0.15)'
        };

        // 频谱包络参数
        this.envelope = {
            attack: 0.4,   // 上升速度
            decay: 0.15    // 下降速度
        };

        // 动画状态
        this.currentBars = [];
        this.targetBars = [];
        for (let i = 0; i < 64; i++) {
            this.currentBars.push(0);
            this.targetBars.push(0);
        }
    }

    // 初始化音频上下文
    init(audioElement) {
        if (this.isInitialized) return;

        try {
            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 创建分析器 - 使用更大的 FFT size 获取更多频率细节
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;  // 增大以获取更细腻的频谱
            this.analyser.smoothingTimeConstant = 0.75;  // 降低平滑度让动效更灵敏

            // 连接音频元素
            const source = this.audioContext.createMediaElementSource(audioElement);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            // 创建数据数组
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            // 初始化历史数据
            this.previousBars = new Array(this.barCount).fill(0);

            this.isInitialized = true;
            console.log('[Visualizer] 音频可视化初始化成功');
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

    // 应用频谱包络（让频谱更自然）
    applyEnvelope(value, index) {
        const prev = this.currentBars[index] || 0;
        const target = value / 255;

        let newValue;
        if (target > prev) {
            // 上升时快速响应
            newValue = prev + (target - prev) * this.envelope.attack;
        } else {
            // 下降时缓慢衰减
            newValue = prev + (target - prev) * this.envelope.decay;
        }

        // 添加一些随机波动让频谱更生动
        const wobble = Math.sin(Date.now() * 0.01 + index * 0.5) * 0.02;
        newValue = Math.max(0, Math.min(1, newValue + wobble));

        return newValue;
    }

    // 绘制频谱
    draw() {
        if (!this.isPlaying) return;

        this.animationId = requestAnimationFrame(() => this.draw());

        // 获取频率数据
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.dataArray);
        }

        // 清空画布
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 保存画布状态
        this.ctx.save();

        // 绘制反射效果（先画在下面）
        this.drawBars(true);

        // 恢复状态绘制主频谱
        this.ctx.restore();
        this.drawBars(false);
    }

    // 绘制柱状图（主频谱和反射）
    drawBars(isReflection = false) {
        if (!this.ctx) return;

        const canvas = this.canvas;
        const totalWidth = canvas.width;
        const totalHeight = canvas.height;
        const availableWidth = totalWidth - (this.barCount - 1) * this.barGap;
        const barWidth = availableWidth / this.barCount;

        // 反射模式下 Y 轴翻转
        if (isReflection) {
            this.ctx.scale(1, -1);
            this.ctx.translate(0, -totalHeight);
        }

        // 绘制每个柱子
        for (let i = 0; i < this.barCount; i++) {
            // 获取频率数据（使用对数分布让低频更明显）
            const dataIndex = Math.floor(Math.pow(i / this.barCount, 1.5) * (this.dataArray?.length || 256));
            const rawValue = this.dataArray ? this.dataArray[dataIndex] : 128;

            // 应用包络
            this.targetBars[i] = rawValue / 255;
            this.currentBars[i] = this.applyEnvelope(rawValue, i);

            // 计算高度
            const maxHeight = totalHeight * (isReflection ? 0.3 : 0.95);  // 反射的高度小一些
            let height = this.currentBars[i] * maxHeight;

            // 添加最小高度，让频谱看起来更活跃
            if (!isReflection) {
                height = Math.max(height, 3);
            }

            const x = i * (barWidth + this.barGap);
            const y = totalHeight - height;

            // 绘制圆角矩形
            this.drawRoundedRect(
                x,
                y,
                barWidth - 1,
                height,
                this.roundRadius,
                isReflection
            );
        }
    }

    // 绘制圆角矩形
    drawRoundedRect(x, y, width, height, radius, isReflection = false) {
        const ctx = this.ctx;

        // 创建渐变
        let gradient;
        if (isReflection) {
            gradient = ctx.createLinearGradient(0, y, 0, y + height);
            gradient.addColorStop(0, this.colors.reflection);
            gradient.addColorStop(1, 'transparent');
        } else {
            gradient = ctx.createLinearGradient(0, y + height, 0, y);
            gradient.addColorStop(0, this.colors.start);
            gradient.addColorStop(0.5, this.colors.mid);
            gradient.addColorStop(1, this.colors.end);
        }

        ctx.fillStyle = gradient;

        // 绘制圆角矩形路径
        ctx.beginPath();
        if (height < radius * 2) {
            // 高度不够画完整圆角，简化处理
            ctx.rect(x, y, width, height);
        } else {
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
        }
        ctx.closePath();
        ctx.fill();

        // 添加发光效果（只在主频谱上）
        if (!isReflection && height > 5) {
            ctx.shadowColor = this.colors.glow;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // 设置颜色
    setColors(startColor, midColor, endColor, glowColor) {
        this.colors.start = startColor;
        this.colors.mid = midColor || startColor;
        this.colors.end = endColor || midColor || startColor;
        this.colors.glow = glowColor || 'rgba(255, 183, 197, 0.5)';
    }

    // 设置柱状图数量
    setBarCount(count) {
        this.barCount = Math.min(Math.max(count, 8), 48);
        this.previousBars = new Array(this.barCount).fill(0);
    }

    // 简单的频谱模拟（当AudioContext不可用时）
    simulate() {
        if (this.isInitialized) return;

        // 初始化当前和目标 bars
        this.currentBars = new Array(64).fill(0);
        this.targetBars = new Array(64).fill(0);

        const draw = () => {
            if (!this.isPlaying) return;

            requestAnimationFrame(draw);

            if (!this.ctx) return;

            // 清空画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // 保存状态
            this.ctx.save();

            // 绘制反射
            this.drawSimulationBars(true);

            // 恢复状态绘制主频谱
            this.ctx.restore();
            this.drawSimulationBars(false);
        };

        this.isPlaying = true;
        draw();
    }

    // 模拟绘制柱状图
    drawSimulationBars(isReflection = false) {
        if (!this.ctx) return;

        const canvas = this.canvas;
        const totalWidth = canvas.width;
        const totalHeight = canvas.height;
        const availableWidth = totalWidth - (this.barCount - 1) * this.barGap;
        const barWidth = availableWidth / this.barCount;

        const time = Date.now() * 0.003;

        if (isReflection) {
            this.ctx.scale(1, -1);
            this.ctx.translate(0, -totalHeight);
        }

        for (let i = 0; i < this.barCount; i++) {
            // 模拟更自然的频谱数据（基于正弦波组合）
            const phase = time + i * 0.3;
            const wave1 = Math.sin(phase) * 0.4;
            const wave2 = Math.sin(phase * 1.7 + i * 0.2) * 0.3;
            const wave3 = Math.sin(phase * 0.5 + i * 0.5) * 0.2;
            const noise = (Math.random() - 0.5) * 0.15;

            this.targetBars[i] = Math.max(0, Math.min(1, 0.3 + wave1 + wave2 + wave3 + noise));

            // 应用包络平滑
            this.currentBars[i] = this.applyEnvelope(this.targetBars[i] * 255, i);

            const maxHeight = totalHeight * (isReflection ? 0.3 : 0.95);
            let height = this.currentBars[i] * maxHeight;

            if (!isReflection) {
                height = Math.max(height, 3);
            }

            const x = i * (barWidth + this.barGap);
            const y = totalHeight - height;

            this.drawRoundedRect(x, y, barWidth - 1, height, this.roundRadius, isReflection);
        }
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
