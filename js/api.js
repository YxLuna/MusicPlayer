/**
 * API模块 - 网易云音乐API封装
 * 优先读取启动器配置，回退到本地3000端口API服务
 */

const DEFAULT_API_BASE = 'http://localhost:3000';
let configuredApiBase = null;
let apiBasePromise = null;
let apiBaseResolved = false;

async function resolveApiBaseFromLauncher() {
    const savedApiBase = localStorage.getItem('musicApiBase');
    const fallbackApiBase = savedApiBase || DEFAULT_API_BASE;

    if (window.location.protocol === 'file:') {
        configuredApiBase = fallbackApiBase;
        apiBaseResolved = true;
        return configuredApiBase;
    }

    try {
        const response = await fetch(`${window.location.origin}/launcher-config`, {
            cache: 'no-store'
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const config = await response.json();
        const apiPort = Number(config.apiPort);
        if (Number.isInteger(apiPort) && apiPort >= 1 && apiPort <= 65535) {
            configuredApiBase = `http://${window.location.hostname || 'localhost'}:${apiPort}`;
            localStorage.setItem('musicApiBase', configuredApiBase);
            apiBaseResolved = true;
            return configuredApiBase;
        }
    } catch (error) {
        console.warn('[API] 读取启动器配置失败，使用回退地址:', error.message);
    }

    configuredApiBase = fallbackApiBase;
    apiBaseResolved = true;
    return configuredApiBase;
}

async function getApiBase() {
    if (apiBaseResolved && configuredApiBase) {
        return configuredApiBase;
    }

    if (!apiBasePromise) {
        apiBasePromise = resolveApiBaseFromLauncher().finally(() => {
            apiBasePromise = null;
        });
    }

    configuredApiBase = await apiBasePromise;
    return configuredApiBase;
}

const API = {
    // 初始化 - 页面重新加载后优先重新读取启动器配置
    init() {
        configuredApiBase = null;
        apiBasePromise = null;
        apiBaseResolved = false;
        return false;
    },

    // 清除登录信息
    clearCookie() {
        localStorage.removeItem('musicUserInfo');
    },

    // 保存用户信息
    setUserInfo(userInfo) {
        localStorage.setItem('musicUserInfo', JSON.stringify(userInfo));
    },

    // 获取用户信息
    getUserInfo() {
        const info = localStorage.getItem('musicUserInfo');
        return info ? JSON.parse(info) : null;
    },

    // 登录相关
    async getQrKey() {
        return this.request('/login/qr/key', { timestamp: Date.now() });
    },

    async createQrCode(key) {
        return this.request('/login/qr/create', { key, qrimg: true });
    },

    async checkQrCode(key) {
        const result = await this.request('/login/qr/check', { key, timestamp: Date.now() });
        return result;
    },

    async loginWithPhone(phone, captcha) {
        return this.request('/login/cellphone', { phone, captcha });
    },

    async sendCaptcha(phone) {
        return this.request('/captcha/sent', { phone });
    },

    async getUserAccount() {
        return this.request('/user/account');
    },

    async getUserDetail(uid) {
        return this.request('/user/detail', { uid });
    },

    // 歌单相关
    async getUserPlaylist(uid) {
        return this.request('/user/playlist', { uid });
    },

    // 喜欢歌曲 - 添加/取消喜欢
    async likeSong(id, like = true) {
        return this.request('/like', { id, like: like ? 'true' : 'false' });
    },

    // 获取用户喜欢的歌曲列表
    async getLikeList(uid) {
        return this.request('/likelist', { uid });
    },

    // 检查歌曲是否已喜欢
    async checkLike(id) {
        return this.request('/song/check/music', { id });
    },

    async getPlaylistDetail(id) {
        return this.request('/playlist/detail', { id });
    },

    async getRecommendPlaylist() {
        return this.request('/recommend/resource');
    },

    async getTopPlaylist(cat = '全部', limit = 30) {
        return this.request('/top/playlist', { cat, limit });
    },

    // 歌曲相关
    async getSongUrl(id, br = 128000) {
        return this.request('/song/url', { id, br });
    },

    async getSongDetail(ids) {
        return this.request('/song/detail', { ids: ids.join(',') });
    },

    async getLyric(id) {
        return this.request('/lyric', { id });
    },

    async getSimilarSongs(id) {
        return this.request('/simi/song', { id });
    },

    async getArtistTopSongs(id) {
        return this.request('/artist/top/song', { id });
    },

    // 搜索相关
    async search(keywords, type = 1, limit = 30, offset = 0) {
        return this.request('/search', { keywords, type, limit, offset });
    },

    async searchSuggest(keywords) {
        return this.request('/search/suggest', { keywords, type: 'mobile' });
    },

    // 排行榜
    async getTopList(id) {
        return this.request('/playlist/detail', { id });
    },

    async getTopLists() {
        return this.request('/toplist');
    },

    // 歌词翻译
    async getLyricTranslation(id) {
        return this.getLyric(id);
    },

    // 请求方法
    async request(endpoint, params = {}) {
        const apiBase = await getApiBase();
        const url = new URL(apiBase + endpoint);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const options = {
            method: 'GET',
            credentials: 'include'
        };

        try {
            const response = await fetch(url.toString(), options);

            const data = await response.json();

            // 打印响应状态
            console.log('[API] 响应:', endpoint, 'code:', data.code);

            if (data.code === 200) {
                return data;
            } else if (endpoint === '/login/qr/check' && data.code === 301) {
                throw new Error('登录二维码已过期，请重新扫码');
            } else if (data.code === 800) {
                // 二维码未扫描，继续轮询（不抛出错误）
                console.log('[API] 二维码等待扫描...');
                return { code: 800, message: 'waiting' };
            } else if (data.code === 801) {
                // 二维码等待扫描，继续轮询
                console.log('[API] 二维码等待扫描中...');
                return { code: 801, message: 'waiting' };
            } else if (data.code === 802) {
                // 二维码已扫描，等待确认
                return { code: 802, message: 'confirmed' };
            } else if (data.message && (data.message.includes('授权') || data.message.includes('登陆') || data.message.includes('登录')) && data.message.includes('成功')) {
                // 授权登录成功，但状态码不是200
                console.log('[API] 登录成功，message:', data.message);
                return { code: 200, message: '登录成功' };
            } else if (data.code === 301 || data.code === -460) {
                throw new Error('请先登录');
            } else {
                throw new Error(data.message || '请求失败');
            }
        } catch (error) {
            console.error('[API] 请求失败:', endpoint, error);
            throw error;
        }
    }
};

// 导出
window.API = API;
