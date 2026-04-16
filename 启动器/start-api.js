#!/usr/bin/env node
/**
 * 网易云音乐API启动器 + 播放器服务器
 * 用于同时启动API服务和播放器
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { exec } = require('child_process');

// 获取启动器所在目录（即项目根目录）
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const API_DIR = path.join(PROJECT_ROOT, 'api-enhanced-main');
const PLAYER_DIR = path.join(__dirname, '..'); // 播放器在启动器的上一级目录
const CONFIG_FILE = path.join(__dirname, 'config.json');
const LAUNCHER_PORT = 3001;

let apiProcess = null;
let playerServer = null;
let currentApiPort = 3000;
let currentPlayerPort = 5500;

// 读取配置
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('读取配置失败:', e.message);
    }
    return { apiPort: 3000, playerPort: 5500 };
}

// 保存配置
function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`配置已保存: API端口 = ${config.apiPort}, 播放器端口 = ${config.playerPort}`);
}

function validatePort(port, label) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return `${label}必须是 1-65535 之间的整数`;
    }
    return null;
}

function validatePortSelection(apiPort, playerPort) {
    const apiError = validatePort(apiPort, 'API端口');
    if (apiError) return apiError;

    const playerError = validatePort(playerPort, '播放器端口');
    if (playerError) return playerError;

    if (apiPort === playerPort) {
        return 'API端口和播放器端口不能相同';
    }

    if (apiPort === LAUNCHER_PORT || playerPort === LAUNCHER_PORT) {
        return `端口不能与启动器端口 ${LAUNCHER_PORT} 冲突`;
    }

    return null;
}

function isPortInUse(port) {
    return new Promise((resolve, reject) => {
        const tester = net.createServer();

        tester.once('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                resolve(true);
                return;
            }
            reject(error);
        });

        tester.once('listening', () => {
            tester.close(() => resolve(false));
        });

        tester.listen(port, '127.0.0.1');
    });
}

// 检测并安装所需环境
async function checkEnvironment() {
    console.log('\n正在检测环境...\n');

    // 1. 检测 Node.js 是否安装
    console.log('[1/3] 检测 Node.js...');
    await new Promise((resolve) => {
        exec('node --version', (err, stdout) => {
            if (err) {
                console.error('❌ 未检测到 Node.js，请先安装 Node.js');
                console.error('   下载地址: https://nodejs.org/');
                process.exit(1);
            }
            console.log(`   ✓ Node.js 已安装: ${stdout.trim()}`);
            resolve();
        });
    });

    // 2. 检测 API 目录是否存在
    console.log('[2/3] 检测 API 目录...');
    if (!fs.existsSync(API_DIR)) {
        console.error(`❌ API 目录不存在: ${API_DIR}`);
        process.exit(1);
    }
    console.log(`   ✓ API 目录存在`);

    // 3. 检测并安装 API 依赖
    console.log('[3/3] 检测 API 依赖...');
    const nodeModulesPath = path.join(API_DIR, 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
        console.log('   依赖未安装，正在安装...');
        await new Promise((resolve, reject) => {
            const installProcess = spawn('npm', ['install'], {
                cwd: API_DIR,
                shell: true,
                stdio: 'pipe'
            });

            installProcess.stdout.on('data', (data) => {
                process.stdout.write(data);
            });

            installProcess.stderr.on('data', (data) => {
                process.stderr.write(data);
            });

            installProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('   ✓ 依赖安装完成');
                    resolve();
                } else {
                    console.error(`   ❌ 依赖安装失败 (code: ${code})`);
                    reject(new Error('npm install failed'));
                }
            });

            installProcess.on('error', (err) => {
                console.error(`   ❌ 安装过程出错: ${err.message}`);
                reject(err);
            });
        });
    } else {
        console.log('   ✓ 依赖已安装');
    }

    console.log('\n环境检测完成！\n');
}

// 启动API服务
async function startApiServer(port) {
    console.log(`正在启动网易云API服务 (端口: ${port})...`);

    const env = { ...process.env, PORT: port.toString() };

    apiProcess = spawn(process.execPath, ['app.js'], {
        cwd: API_DIR,
        env: env,
        stdio: 'pipe',
        shell: false
    });

    apiProcess.stdout.on('data', (data) => {
        console.log(data.toString().trim());
    });

    apiProcess.stderr.on('data', (data) => {
        console.error(data.toString().trim());
    });

    apiProcess.on('error', (err) => {
        console.error('启动API服务失败:', err.message);
    });

    apiProcess.on('close', (code) => {
        console.log(`API服务已退出 (code: ${code})`);
    });

    return apiProcess;
}

function stopApiServer() {
    if (!apiProcess) {
        return Promise.resolve();
    }

    const processToStop = apiProcess;
    apiProcess = null;

    return new Promise((resolve) => {
        let finished = false;

        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            resolve();
        };

        processToStop.once('close', () => {
            finish();
        });

        try {
            processToStop.kill();
        } catch (error) {
            console.warn('停止API服务失败:', error.message);
            finish();
            return;
        }

        setTimeout(() => {
            if (finished) {
                return;
            }

            console.warn(`API服务退出超时，尝试结束 PID ${processToStop.pid}`);
            try {
                process.kill(processToStop.pid, 'SIGKILL');
            } catch (error) {
                console.warn('强制结束API服务失败:', error.message);
            }
            finish();
        }, 3000);
    });
}

// 简单的静态文件服务器
function startPlayerServer(port) {
    return new Promise(async (resolve) => {
        console.log(`正在启动音乐播放器服务 (端口: ${port})...`);

        const server = http.createServer((req, res) => {
            if (req.url === '/launcher-config') {
                const config = loadConfig();
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(config));
                return;
            }

            let filePath = path.join(PLAYER_DIR, req.url === '/' ? 'index.html' : req.url);

            // 安全检查：防止路径遍历
            if (!filePath.startsWith(PLAYER_DIR)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            const ext = path.extname(filePath);
            const contentTypes = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
            };

            const contentType = contentTypes[ext] || 'application/octet-stream';

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        // 文件不存在，返回index.html (SPA支持)
                        fs.readFile(path.join(PLAYER_DIR, 'index.html'), (err2, data2) => {
                            if (err2) {
                                res.writeHead(404);
                                res.end('Not Found');
                            } else {
                                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                                res.end(data2);
                            }
                        });
                    } else {
                        res.writeHead(500);
                        res.end('Server Error');
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(data);
                }
            });
        });

        server.listen(port, () => {
            console.log(`音乐播放器已启动: http://localhost:${port}`);
            playerServer = server;
            resolve(server);
        });
    });
}

function stopPlayerServer() {
    if (!playerServer) {
        return Promise.resolve();
    }

    const serverToStop = playerServer;
    playerServer = null;

    return new Promise((resolve, reject) => {
        serverToStop.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

// 创建HTTP服务器显示状态页面
function createStatusServer(apiPort, playerPort) {
    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>♪ CloudMusic Pro 启动器</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans SC', 'Inter', 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #FFF8F5 0%, #FFEEF2 50%, #FFF0F5 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #4A3540;
        }
        .container {
            background: rgba(255,255,255,0.9);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 24px;
            border: 2px solid rgba(255,183,197,0.4);
            text-align: center;
            min-width: 460px;
            box-shadow: 0 8px 32px rgba(255,183,197,0.3);
        }
        h1 {
            font-size: 28px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #FFB7C5, #E88BA0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle {
            font-size: 14px;
            color: #E88BA0;
            margin-bottom: 28px;
        }
        .status {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 28px;
            padding: 14px;
            background: rgba(255,183,197,0.1);
            border-radius: 12px;
            border: 1px solid rgba(255,183,197,0.2);
        }
        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4caf50;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.9); }
        }
        .services {
            margin-bottom: 24px;
            text-align: left;
        }
        .service-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 18px;
            margin-bottom: 10px;
            background: rgba(255,240,245,0.6);
            border-radius: 12px;
            border-left: 4px solid #FFB7C5;
        }
        .service-item .name { font-weight: 600; font-size: 15px; }
        .service-item .port { color: #E88BA0; font-family: monospace; font-size: 14px; }
        .service-item a {
            color: #E88BA0;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            padding: 6px 14px;
            border-radius: 20px;
            background: rgba(255,183,197,0.15);
            transition: all 0.2s;
        }
        .service-item a:hover {
            background: #FFB7C5;
            color: white;
            text-decoration: none;
        }
        .btn {
            padding: 12px 30px;
            margin: 5px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
        }
        .btn-primary {
            background: linear-gradient(135deg, #FFB7C5, #E88BA0);
            color: white;
            box-shadow: 0 4px 15px rgba(255,183,197,0.4);
        }
        .btn-primary:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(255,183,197,0.5);
        }
        .btn-secondary {
            background: rgba(255,183,197,0.15);
            color: #E88BA0;
            border: 1px solid rgba(255,183,197,0.3);
        }
        .btn-secondary:hover { background: rgba(255,183,197,0.25); }
        .form-group {
            margin-bottom: 14px;
            text-align: left;
        }
        .form-group label {
            display: block;
            margin-bottom: 6px;
            color: #8a7080;
            font-size: 13px;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 10px 14px;
            background: rgba(255,240,245,0.6);
            border: 1px solid rgba(255,183,197,0.3);
            border-radius: 10px;
            color: #4A3540;
            font-size: 15px;
        }
        .form-group input:focus {
            outline: none;
            border-color: #FFB7C5;
            background: rgba(255,255,255,0.8);
        }
        .config-form { display: none; margin-top: 20px; }
        .config-form.show { display: block; }
        .msg { margin-top: 14px; padding: 10px; border-radius: 8px; display: none; font-size: 13px; }
        .msg.success { background: rgba(76,175,80,0.15); color: #4caf50; }
        .msg.error { background: rgba(244,67,54,0.15); color: #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <h1>♪ CloudMusic Pro</h1>
        <p class="subtitle">二次元主题音乐播放器</p>
        <div class="status">
            <div class="status-dot"></div>
            <span>所有服务运行中</span>
        </div>
        <div class="services">
            <div class="service-item">
                <span class="name">🎵 播放器</span>
                <span class="port">:${playerPort}</span>
                <a href="http://localhost:${playerPort}" target="_blank">打开</a>
            </div>
            <div class="service-item">
                <span class="name">🔌 API服务</span>
                <span class="port">:${apiPort}</span>
                <a href="http://localhost:${apiPort}" target="_blank">打开</a>
            </div>
        </div>
        <button class="btn btn-secondary" onclick="toggleConfig()">⚙️ 修改端口</button>
        <button class="btn btn-primary" onclick="openPlayer()">🎧 打开播放器</button>
        <div class="config-form" id="configForm" style="margin-top:20px;">
            <div class="form-group">
                <label>API端口</label>
                <input type="number" id="apiPortInput" value="${apiPort}" min="1" max="65535">
            </div>
            <div class="form-group">
                <label>播放器端口</label>
                <input type="number" id="playerPortInput" value="${playerPort}" min="1" max="65535">
            </div>
            <button class="btn btn-primary" onclick="saveAndRestart()">保存并重启</button>
        </div>
        <div class="msg" id="msg"></div>
    </div>
    <script>
        function toggleConfig() {
            document.getElementById('configForm').classList.toggle('show');
        }
        function openPlayer() {
            window.open('http://localhost:${playerPort}', '_blank');
        }
        async function saveAndRestart() {
            const apiPort = document.getElementById('apiPortInput').value;
            const playerPort = document.getElementById('playerPortInput').value;
            const msg = document.getElementById('msg');
            try {
                const res = await fetch('/restart?apiPort=' + apiPort + '&playerPort=' + playerPort);
                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.message || '配置校验失败');
                }
                msg.className = 'msg success';
                msg.style.display = 'block';
                msg.textContent = '正在重启...';
                setTimeout(() => location.reload(), 2000);
            } catch(e) {
                msg.className = 'msg error';
                msg.style.display = 'block';
                msg.textContent = '重启失败: ' + e.message;
            }
        }
    </script>
</body>
</html>
            `);
        } else if (req.url.startsWith('/restart')) {
            const url = new URL(req.url, `http://localhost:${LAUNCHER_PORT}`);
            const newApiPort = Number(url.searchParams.get('apiPort'));
            const newPlayerPort = Number(url.searchParams.get('playerPort'));

            const validationError = validatePortSelection(newApiPort, newPlayerPort);
            if (validationError) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: validationError }));
                return;
            }

            if (newApiPort !== currentApiPort && await isPortInUse(newApiPort)) {
                res.writeHead(409, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: `API端口 ${newApiPort} 已被占用` }));
                return;
            }

            if (newPlayerPort !== currentPlayerPort && await isPortInUse(newPlayerPort)) {
                res.writeHead(409, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: `播放器端口 ${newPlayerPort} 已被占用` }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, apiPort: newApiPort, playerPort: newPlayerPort }));

            console.log(`\n收到重启请求, API端口: ${newApiPort}, 播放器端口: ${newPlayerPort}`);

            // 保存配置
            saveConfig({ apiPort: newApiPort, playerPort: newPlayerPort });

            setTimeout(async () => {
                try {
                    await stopApiServer();
                    await stopPlayerServer();
                    await startApiServer(newApiPort);
                    await startPlayerServer(newPlayerPort);
                    currentApiPort = newApiPort;
                    currentPlayerPort = newPlayerPort;
                } catch (error) {
                    console.error('重启服务失败:', error.message);
                }
            }, 200);
        } else if (req.url === '/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ running: true, apiPort: currentApiPort, playerPort: currentPlayerPort }));
        }
    });

    server.listen(LAUNCHER_PORT, () => {
        console.log(`启动器页面: http://localhost:${LAUNCHER_PORT}`);
        // 自动打开浏览器 (Windows)
        exec(`start http://localhost:${LAUNCHER_PORT}`);
    });

    return server;
}

// 主函数
async function main() {
    // 先检测环境
    await checkEnvironment();

    const config = loadConfig();
    currentApiPort = config.apiPort;
    currentPlayerPort = config.playerPort;

    const validationError = validatePortSelection(currentApiPort, currentPlayerPort);
    if (validationError) {
        throw new Error(`启动器配置无效: ${validationError}`);
    }

    if (await isPortInUse(LAUNCHER_PORT)) {
        throw new Error(`启动器端口 ${LAUNCHER_PORT} 已被占用`);
    }
    if (await isPortInUse(currentApiPort)) {
        throw new Error(`API端口 ${currentApiPort} 已被占用，请修改配置后重试`);
    }
    if (await isPortInUse(currentPlayerPort)) {
        throw new Error(`播放器端口 ${currentPlayerPort} 已被占用，请修改配置后重试`);
    }

    console.log('========================================');
    console.log('   网易云音乐启动器');
    console.log('========================================');
    console.log(`API目录: ${API_DIR}`);
    console.log(`播放器目录: ${PLAYER_DIR}`);
    console.log(`API端口: ${currentApiPort}`);
    console.log(`播放器端口: ${currentPlayerPort}`);
    console.log('========================================\n');

    // 启动API服务
    await startApiServer(currentApiPort);

    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 启动播放器服务
    await startPlayerServer(currentPlayerPort);

    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 启动状态服务器
    const statusServer = createStatusServer(currentApiPort, currentPlayerPort);

    // 优雅退出
    process.on('SIGINT', () => {
        console.log('\n正在关闭...');
        Promise.allSettled([
            stopApiServer(),
            stopPlayerServer(),
            new Promise((resolve) => statusServer.close(resolve))
        ]).finally(() => {
            process.exit(0);
        });
    });
}

main().catch(console.error);
