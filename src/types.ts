/**
 * 类型定义文件
 * 定义插件内部使用的接口和类型
 */

// ==================== 插件配置 ====================

/**
 * 特殊日期加成配置
 */
export interface SpecialDayConfig {
    /** 日期 YYYY-MM-DD */
    date: string;
    /** 额外加成点数 */
    bonus: number;
    /** 节日/特殊日名称 */
    name: string;
}

/**
 * 签到积分配置
 */
export interface CheckinPointsConfig {
    /** 最小积分 */
    minPoints: number;
    /** 最大积分 */
    maxPoints: number;
    /** 是否启用连续签到加成 */
    enableConsecutiveBonus: boolean;
    /** 每天连续签到加成点数 */
    consecutiveBonusPerDay: number;
    /** 最大连续签到加成上限 */
    maxConsecutiveBonus: number;
    /** 是否启用周末加成 */
    enableWeekendBonus: boolean;
    /** 周末额外加成点数 */
    weekendBonus: number;
    /** 特殊日期加成列表 */
    specialDays: SpecialDayConfig[];
}

/**
 * 群配置
 */
export interface GroupConfig {
    /** 是否启用此群的功能 */
    enabled?: boolean;
    /** 是否启用签到功能 */
    enableCheckin?: boolean;
}

/**
 * 插件主配置接口
 */
export interface PluginConfig {
    /** 全局开关：是否启用插件功能 */
    enabled: boolean;
    /** 调试模式：启用后输出详细日志 */
    debug: boolean;
    /** 触发命令前缀，默认为 #cmd */
    commandPrefix: string;
    /** 同一命令请求冷却时间（秒），0 表示不限制 */
    cooldownSeconds: number;
    /** 按群的单独配置 */
    groupConfigs: Record<string, GroupConfig>;
    /** 是否启用签到功能 */
    enableCheckin: boolean;
    /** 签到命令关键词列表（支持多个命令触发签到） */
    checkinCommands: string[];
    /** 积分配置 */
    checkinPoints: CheckinPointsConfig;
}

// ==================== API 响应 ====================

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = unknown> {
    /** 状态码，0 表示成功，-1 表示失败 */
    code: number;
    /** 错误信息（仅错误时返回） */
    message?: string;
    /** 响应数据（仅成功时返回） */
    data?: T;
}

// ==================== 签到数据 ====================

/**
 * 用户签到数据
 */
export interface UserCheckinData {
    /** 用户QQ号 */
    userId: string;
    /** 用户昵称 */
    nickname: string;
    /** 累计签到天数 */
    totalCheckinDays: number;
    /** 连续签到天数 */
    consecutiveDays: number;
    /** 总积分 */
    totalPoints: number;
    /** 最后签到日期 YYYY-MM-DD */
    lastCheckinDate: string;
    /** 签到历史记录 */
    checkinHistory: CheckinRecord[];
}

/**
 * 签到记录
 */
export interface CheckinRecord {
    /** 日期 YYYY-MM-DD */
    date: string;
    /** 本次获得积分 */
    points: number;
    /** 签到时间 HH:mm:ss */
    time: string;
    /** 当日排名 */
    rank: number;
    /** 签到群号 */
    groupId?: string;
}

/**
 * 群签到统计
 */
export interface GroupCheckinStats {
    /** 群号 */
    groupId: string;
    /** 群名称 */
    groupName?: string;
    /** 群内签到总人数 */
    totalCheckins: number;
    /** 群内总积分 */
    totalPoints: number;
    /** 今日签到人数 */
    todayCheckins: number;
    /** 签到用户列表 */
    users: GroupUserInfo[];
}

/**
 * 群内用户信息
 */
export interface GroupUserInfo {
    /** 用户ID */
    userId: string;
    /** 用户昵称 */
    nickname: string;
    /** 在群内的累计积分 */
    groupPoints: number;
    /** 在群内的签到次数 */
    groupCheckinDays: number;
    /** 最后签到日期 */
    lastCheckinDate: string;
}

/**
 * 每日签到统计
 */
export interface DailyCheckinStats {
    /** 日期 YYYY-MM-DD */
    date: string;
    /** 今日总签到人数 */
    totalCheckins: number;
    /** 今日签到用户ID列表（按签到顺序） */
    userIds: string[];
}

/**
 * 签到结果
 */
export interface CheckinResult {
    /** 是否成功 */
    success: boolean;
    /** 是否首次签到 */
    isFirstTime: boolean;
    /** 用户数据 */
    userData: UserCheckinData;
    /** 本次获得积分 */
    earnedPoints: number;
    /** 今日排名 */
    todayRank: number;
    /** 签到时间 */
    checkinTime: string;
    /** 连续签到天数 */
    consecutiveDays: number;
    /** 错误信息 */
    error?: string;
}

/**
 * 卡片数据（用于Canvas绘制）
 */
export interface CheckinCardData {
    /** 用户昵称 */
    nickname: string;
    /** 用户ID */
    userId: string;
    /** QQ头像URL */
    avatarUrl: string;
    /** 本次获得积分 */
    earnedPoints: number;
    /** 累计签到天数 */
    totalDays: number;
    /** 总积分 */
    totalPoints: number;
    /** 今日排名 */
    todayRank: number;
    /** 签到时间 */
    checkinTime: string;
    /** 当前日期 */
    currentDate: string;
    /** 励志短句 */
    quote: string;
}
