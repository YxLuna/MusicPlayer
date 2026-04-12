/**
 * Playlist模块 - 歌单管理
 */

class PlaylistManager {
    constructor() {
        this.playlists = [];
        this.currentPlaylist = null;
        this.songs = [];
        this.userId = null;
    }

    // 初始化默认歌单
    async initDefaultPlaylists() {
        try {
            // 获取推荐歌单
            const result = await API.getRecommendPlaylist();
            if (result.recommend) {
                this.playlists = result.recommend.slice(0, 10).map(item => ({
                    id: item.id,
                    name: item.name,
                    cover: item.picUrl || item.coverImgUrl,
                    count: item.trackCount
                }));
            }
        } catch (error) {
            console.error('获取推荐歌单失败:', error);
            // 备用歌单
            this.playlists = [
                { id: 3778678, name: '热歌榜', cover: '', count: 0 },
                { id: 3779629, name: '新歌榜', cover: '', count: 0 },
                { id: 1978921795, name: '飙升榜', cover: '', count: 0 },
                { id: 10536066, name: '网易云音乐UKISS年度歌曲', cover: '', count: 0 }
            ];
        }
    }

    // 获取用户歌单
    async getUserPlaylists(uid) {
        try {
            this.userId = uid;
            const result = await API.getUserPlaylist(uid);
            if (result.playlist) {
                this.playlists = result.playlist.map(item => ({
                    id: item.id,
                    name: item.name,
                    cover: item.coverImgUrl,
                    count: item.trackCount,
                    creator: item.creator?.nickname
                }));
            }
            return this.playlists;
        } catch (error) {
            console.error('获取用户歌单失败:', error);
            return [];
        }
    }

    // 获取歌单详情
    async getPlaylistDetail(playlistId) {
        try {
            const result = await API.getPlaylistDetail(playlistId);
            if (result.playlist && result.playlist.tracks) {
                this.currentPlaylist = {
                    id: playlistId,
                    name: result.playlist.name,
                    cover: result.playlist.coverImgUrl,
                    creator: result.playlist.creator?.nickname,
                    description: result.playlist.description,
                    tags: result.playlist.tags,
                    tracks: result.playlist.tracks.map(track => this.formatSong(track))
                };
                this.songs = this.currentPlaylist.tracks;
                return this.currentPlaylist;
            }
        } catch (error) {
            console.error('获取歌单详情失败:', error);
            return null;
        }
    }

    // 构建网易云图片URL
    buildCoverUrl(picId) {
        if (!picId) return '';
        // 使用 picId 构建封面URL (网易云音乐标准格式)
        return `https://p3.music.126.net/${picId}/${picId}.jpg`;
    }

    // 格式化歌曲信息
    formatSong(track) {
        // 处理艺术家信息
        let artist = '未知艺术家';
        let artists = [];
        if (track.ar && Array.isArray(track.ar)) {
            artists = track.ar;
            artist = track.ar.map(a => a.name).join(', ');
        }

        // 处理专辑信息
        let album = '未知专辑';
        let albumId = null;
        let cover = '';
        if (track.al) {
            album = track.al.name || '未知专辑';
            albumId = track.al.id || null;
            // 优先使用 picUrl，否则使用 picId 构建
            if (track.al.picUrl) {
                cover = track.al.picUrl;
            } else if (track.al.picId) {
                cover = this.buildCoverUrl(track.al.picId);
            } else if (track.al.id) {
                // 备用：使用专辑ID构建
                cover = this.buildCoverUrl(track.al.id);
            }
        }

        // 如果没有封面，尝试从 track 中获取
        if (!cover && track.picUrl) {
            cover = track.picUrl;
        }

        return {
            id: track.id,
            name: track.name,
            artist: artist,
            artists: artists,
            album: album,
            albumId: albumId,
            cover: cover,
            duration: track.dt || track.duration || 0,
            durationStr: Player.formatTime((track.dt || track.duration || 0) / 1000)
        };
    }

    // 获取歌曲详情
    async getSongDetail(songIds) {
        try {
            const result = await API.getSongDetail(songIds);
            if (result.songs) {
                return result.songs.map(song => this.formatSong(song));
            }
        } catch (error) {
            console.error('获取歌曲详情失败:', error);
            return [];
        }
    }

    // 搜索
    async search(keywords, type = 1) {
        try {
            const result = await API.search(keywords, type);
            return result;
        } catch (error) {
            console.error('搜索失败:', error);
            return null;
        }
    }

    // 解析搜索结果
    async parseSearchResult(result, type = 1) {
        const searchResult = result.result;
        switch (type) {
            case 1: // 歌曲
                // 获取歌曲ID列表
                const songIds = searchResult?.songs?.map(song => song.id) || [];
                if (songIds.length > 0) {
                    // 调用歌曲详情API获取完整信息（包括封面）
                    try {
                        const detailResult = await API.getSongDetail(songIds.slice(0, 10));
                        if (detailResult.songs) {
                            return detailResult.songs.map(song => this.formatSong(song));
                        }
                    } catch (e) {
                        console.error('获取歌曲详情失败', e);
                    }
                }
                // 备用：直接解析搜索结果
                const songs = searchResult?.songs?.map(song => {
                    // 搜索API返回的字段可能是 artists/album，需要转换为 ar/al
                    const normalized = {
                        id: song.id,
                        name: song.name,
                        ar: song.artists || song.ar || [],
                        al: song.album || song.al || null,
                        dt: song.duration || song.dt || 0
                    };
                    return this.formatSong(normalized);
                }) || [];
                return songs;
            case 10: // 专辑
                return searchResult?.albums || [];
            case 100: // 歌手
                return searchResult?.artists || [];
            case 1000: // 歌单
                return searchResult?.playlists || [];
            default:
                return [];
        }
    }

    // 获取排行榜
    async getTopList(listId) {
        try {
            const result = await API.getTopList(listId);
            if (result.playlist && result.playlist.tracks) {
                this.currentPlaylist = {
                    id: listId,
                    name: result.playlist.name,
                    cover: result.playlist.coverImgUrl,
                    tracks: result.playlist.tracks.map(track => this.formatSong(track))
                };
                this.songs = this.currentPlaylist.tracks;
                return this.currentPlaylist;
            }
        } catch (error) {
            console.error('获取排行榜失败:', error);
            return null;
        }
    }

    // 热门歌单分类
    async getTopPlaylists(cat = '全部', limit = 20) {
        try {
            const result = await API.getTopPlaylist(cat, limit);
            return result.playlists || [];
        } catch (error) {
            console.error('获取热门歌单失败:', error);
            return [];
        }
    }
}

// 导出
window.PlaylistManager = PlaylistManager;
