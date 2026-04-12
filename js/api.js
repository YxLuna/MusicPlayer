/**
 * API模块 - 网易云音乐API封装
 * 使用本地3000端口API服务
 */

const API_BASE = 'http://localhost:3000';

// Cookie管理
let cookie = '';

const API = {
    // 初始化 - 从localStorage恢复登录状态
    init() {
        const savedCookie = localStorage.getItem('musicCookie');
        if (savedCookie) {
            cookie = savedCookie;
            console.log('[API] 已恢复登录状态');
            return true;
        }
        return false;
    },

    // 设置Cookie并持久化
    setCookie(newCookie) {
        if (newCookie) {
            cookie = newCookie;
            // 持久化到 localStorage
            localStorage.setItem('musicCookie', newCookie);
            console.log('[API] Cookie已设置并保存:', cookie.substring(0, 50) + '...');
        }
    },

    // 获取Cookie
    getCookie() {
        return cookie;
    },

    // 清除登录信息
    clearCookie() {
        cookie = '';
        localStorage.removeItem('musicCookie');
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
        // 登录成功后保存cookie
        if (result.code === 200 && result.cookie) {
            console.log('[API] 二维码登录成功，保存cookie');
            this.setCookie(result.cookie);
        }
        return result;
    },

    async loginWithPhone(phone, captcha) {
        const result = await this.request('/login/cellphone', { phone, captcha });
        // 登录成功后保存cookie
        if (result.code === 200 && result.cookie) {
            console.log('[API] 手机登录成功，保存cookie');
            this.setCookie(result.cookie);
        }
        return result;
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
        const url = new URL(API_BASE + endpoint);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const options = {
            method: 'GET',
            credentials: 'include'
        };

        // 如果有cookie，添加到请求头
        if (cookie) {
            options.headers = {
                'Cookie': cookie
            };
            console.log('[API] 请求携带Cookie:', endpoint);
        }

        try {
            const response = await fetch(url.toString(), options);

            // 获取响应头中的cookie
            const setCookieHeader = response.headers.get('set-cookie');
            if (setCookieHeader) {
                console.log('[API] 收到Set-Cookie:', setCookieHeader.substring(0, 80) + '...');
                // 解析cookie，只取第一个分号前的部分
                const cookiePart = setCookieHeader.split(';')[0];
                if (!cookie) {
                    cookie = cookiePart;
                    console.log('[API] 从响应保存Cookie');
                }
            }

            const data = await response.json();

            // 打印响应状态
            console.log('[API] 响应:', endpoint, 'code:', data.code);

            if (data.code === 200) {
                return data;
            } else if (data.code === 301) {
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
                console.log('[API] 登录成功，message:', data.message, 'cookie:', data.cookie ? '有' : '无');
                if (data.cookie) {
                    this.setCookie(data.cookie);
                }
                return { code: 200, message: '登录成功', cookie: data.cookie };
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
