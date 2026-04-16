# 🎵 CloudMusic Pro Player

> 梦幻樱花主题的网易云音乐增强版播放器

![Theme](https://img.shields.io/badge/theme-Sakura%20Pink-FFB7C5?style=for-the-badge)
![API](https://img.shields.io/badge/API-Netease%20Cloud%20Music-ff6b9d?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-4caf50?style=for-the-badge)

---

## ✨ 功能特性

### 🎧 核心播放
- 播放 / 暂停、上一曲 / 下一曲
- 进度条拖拽、音量调节
- 循环模式切换（顺序 / 单曲 / 随机）
- 音质切换（128K / 192K / 320K / FLAC）
- 歌曲下载

### 📋 歌单管理
- 接入网易云 API 获取推荐歌单
- 支持歌单切换
- 搜索歌曲 / 歌手
- 排行榜支持

### 👤 用户登录
- 二维码登录（网易云 APP 扫码）
- 手机验证码登录
- 显示用户信息与歌单数量

### 🎤 歌词功能
- 同步显示歌词
- 支持翻译歌词
- 点击歌词单句循环
- Shift + 点击多行选中循环
- 循环弹窗控制（播放 / 暂停 / 重播）
- 0.5x - 2.0x 倍速调节

### 🎨 背景自定义
- 歌曲封面作为背景
- 本地上传自定义图片
- 背景亮度 / 模糊度 / 透明度调节
- 毛玻璃效果开关

### 📊 音频可视化
- 底部音乐节奏频谱展示
- 樱花主题配色 + 发光效果
- 镜像反射动效

---

## 🚀 快速开始

### 方式一：一键启动器（推荐）

```bash
# 1. 进入启动器目录
cd 音乐播放器/启动器

# 2. 运行启动器
启动API.bat
```

启动器会自动：
- 检测 Node.js 环境
- 启动 API 服务（默认 3000 端口）
- 启动播放器服务（默认 5500 端口）
- 打开控制面板 http://localhost:3001

启动后访问：
- **播放器**: http://localhost:5500
- **API 服务**: http://localhost:3000
- **启动器面板**: http://localhost:3001

### 方式二：手动启动

#### 1. 启动 API 服务

```bash
# 进入项目内置的 api-enhanced-main 目录
cd api-enhanced-main
npm install
node app.js
```

API 服务地址：http://localhost:3000

#### 2. 启动播放器

使用 Python：
```bash
cd 音乐播放器
python -m http.server 5500
```

或使用 VSCode Live Server 扩展打开 index.html。

---

## 📁 项目结构

```
音乐播放器/
├── index.html              # 主页面
├── css/
│   └── style.css          # 樱花主题样式
├── js/
│   ├── app.js              # 主应用入口
│   ├── api.js              # API 封装
│   ├── player.js           # 播放器核心
│   ├── playlist.js          # 歌单管理
│   ├── lyric.js            # 歌词解析
│   ├── visualizer.js       # 音频可视化
│   └── ui.js               # UI 交互
├── 启动器/
│   ├── 启动API.bat         # 一键启动脚本
│   ├── start-api.js        # 启动器服务
│   └── config.json         # 端口配置
├── SPEC.md                 # 项目规范
├── README.md               # 使用说明
└── .gitignore             # Git 忽略配置
```

---

## 🎨 主题说明

### 樱花配色方案

| 颜色 | 色值 | 用途 |
|------|------|------|
| 樱花粉 | `#FFB7C5` | 主色调、按钮、强调 |
| 深樱 | `#E88BA0` | 标题、次要强调 |
| 糖果蜜桃 | `#FFAB76` | 暖色点缀 |
| 糖果玫瑰 | `#FF9AAF` | 交互反馈 |

### 视觉效果

- 毛玻璃效果（`backdrop-filter: blur`）
- 樱花飘落动画
- 卡片悬浮阴影
- 渐变背景流动

---

## ⚙️ 配置说明

### 修改端口

通过启动器面板的「修改端口」功能，或编辑 `启动器/config.json`：

```json
{
  "apiPort": 3000,
  "playerPort": 3002
}
```

### API 地址

如需使用自己的 API，修改 `js/api.js` 中的 `API_BASE`：

```javascript
const API_BASE = 'http://localhost:3000';
```

---

## 🔧 技术栈

- **前端**: HTML5 + CSS3 + ES6+
- **播放器**: Web Audio API
- **API**: [网易云音乐增强版 API](https://github.com/neteasecloudmusicapienhanced/api-enhanced)
- **主题**: 梦幻樱花（Dream Sakura）

---

## ⚠️ 注意事项

1. 部分歌曲可能因版权原因无法播放
2. API 接口可能存在频率限制
3. 建议登录后获得完整功能体验
4. 音频可视化需要用户交互后才能启动（浏览器策略）
5. 扫码登录需要启动 API 服务

---

## 📄 许可证

MIT License - 仅供学习交流使用，请尊重版权。

---

## 🙏 致谢

- [网易云音乐增强版 API](https://github.com/neteasecloudmusicapienhanced/api-enhanced)
- [Google Fonts](https://fonts.google.com/) - 樱花主题字体
