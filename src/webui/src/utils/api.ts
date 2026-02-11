import type { ApiResponse, RankingData, ActiveRankingData, CheckinStats, GroupCheckinStats, UserCheckinData, LeaderboardData, LeaderboardType } from '../types'

function resolvePluginName(): string {
    if (window.__PLUGIN_NAME__) return window.__PLUGIN_NAME__
    try {
        if (window.parent && (window.parent as Window & { __PLUGIN_NAME__?: string }).__PLUGIN_NAME__) {
            return (window.parent as Window & { __PLUGIN_NAME__?: string }).__PLUGIN_NAME__!
        }
    } catch { /* ignore */ }
    const extMatch = location.pathname.match(/\/ext\/([^/]+)/)
    if (extMatch) return extMatch[1]
    const pluginMatch = location.pathname.match(/\/plugin\/([^/]+)/)
    if (pluginMatch) return pluginMatch[1]
    return 'napcat-plugin-template'
}

const PLUGIN_NAME = resolvePluginName()

const API_BASE_NO_AUTH = '/plugin/' + PLUGIN_NAME + '/api'
const API_BASE_AUTH = '/api/Plugin/ext/' + PLUGIN_NAME

function getToken(): string {
    return localStorage.getItem('token') || ''
}

function authHeaders(h: Record<string, string> = {}): Record<string, string> {
    const token = getToken()
    if (token) h['Authorization'] = 'Bearer ' + token
    return h
}

function buildUrl(base: string, path: string): string {
    return new URL(base + path, window.location.origin).toString()
}

/**
 * 无认证 API 请求
 * 用于插件自带 WebUI 页面调用后端 router.getNoAuth / router.postNoAuth 注册的路由
 */
export async function noAuthFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const res = await fetch(buildUrl(API_BASE_NO_AUTH, path), {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
    }
    return res.json()
}

/**
 * 认证 API 请求
 * 用于需要 NapCat WebUI 登录认证的接口
 */
export async function authFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const res = await fetch(buildUrl(API_BASE_AUTH, path), {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers, ...authHeaders() }
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
    }
    return res.json()
}

// ==================== 签到数据 API ====================

/** 获取全服排行榜（按积分） */
export async function getRanking(): Promise<ApiResponse<RankingData>> {
    return noAuthFetch('/checkin/ranking')
}

/** 获取活跃排行榜（按使用天数） */
export async function getActiveRanking(): Promise<ApiResponse<ActiveRankingData>> {
    return noAuthFetch('/checkin/active-ranking')
}

/** 获取用户签到数据 */
export async function getUserCheckinData(userId: string): Promise<ApiResponse<UserCheckinData>> {
    return noAuthFetch(`/checkin/user/${userId}`)
}

/** 获取签到统计 */
export async function getCheckinStats(): Promise<ApiResponse<CheckinStats>> {
    return noAuthFetch('/checkin/stats')
}

/** 获取所有群统计 */
export async function getGroupsStats(): Promise<ApiResponse<GroupCheckinStats[]>> {
    return noAuthFetch('/checkin/groups')
}

/** 获取指定群统计 */
export async function getGroupStats(groupId: string): Promise<ApiResponse<GroupCheckinStats>> {
    return noAuthFetch(`/checkin/groups/${groupId}`)
}

// ==================== 排行榜 API ====================

/** 获取排行榜数据 */
export async function getLeaderboard(groupId: string, type: LeaderboardType): Promise<ApiResponse<LeaderboardData>> {
    return noAuthFetch(`/leaderboard/${groupId}?type=${type}`)
}
