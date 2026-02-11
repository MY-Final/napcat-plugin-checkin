/** WebUI 前端类型定义 */

export interface PluginStatus {
    pluginName: string
    uptime: number
    uptimeFormatted: string
    config: PluginConfig
    stats: {
        processed: number
        todayProcessed: number
        lastUpdateDay: string
    }
}

export interface PluginConfig {
    enabled: boolean
    debug: boolean
    commandPrefix: string
    cooldownSeconds: number
    groupConfigs?: Record<string, GroupConfig>
    // 签到配置
    enableCheckin: boolean
    checkinCommands: string  // 逗号分隔的命令列表
    checkinCommand?: string  // 向后兼容
    checkinReplyMode: 'text' | 'image' | 'auto'
    checkinPoints: {
        minPoints: number
        maxPoints: number
        enableConsecutiveBonus: boolean
        consecutiveBonusPerDay: number
        maxConsecutiveBonus: number
        enableWeekendBonus: boolean
        weekendBonus: number
        specialDays: Array<{
            date: string
            name: string
            bonus: number
        }>
    }
}

export interface GroupConfig {
    enabled?: boolean
}

export interface GroupInfo {
    group_id: number
    group_name: string
    member_count: number
    max_member_count: number
    enabled: boolean
    /** 定时推送时间（如 '08:30'），null 表示未设置（模板默认不使用，按需扩展） */
    scheduleTime?: string | null
}

export interface ApiResponse<T = unknown> {
    code: number
    data?: T
    message?: string
}

// ==================== 签到数据类型 ====================

export interface UserRanking {
    userId: string
    nickname: string
    totalPoints: number
    totalCheckinDays: number
    consecutiveDays: number
    lastCheckinDate: string
}

export interface GroupUserInfo {
    userId: string
    nickname: string
    groupPoints: number
    groupCheckinDays: number
    lastCheckinDate: string
}

export interface GroupCheckinStats {
    groupId: string
    groupName?: string
    totalCheckins: number
    totalPoints: number
    todayCheckins: number
    users: GroupUserInfo[]
}

export interface CheckinStats {
    totalUsers: number
    totalCheckins: number
    totalPoints: number
    todayCheckins: number
    activeUsers: number
}

export interface RankingData {
    totalUsers: number
    ranking: UserRanking[]
}
