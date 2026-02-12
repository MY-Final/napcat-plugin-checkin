/**
 * 签到日志服务
 * 负责签到日志的记录、查询、统计
 */
import fs from 'fs';
import path from 'path';
import type { CheckinLog, LogQueryParams, LogPageResponse, LogStatsResponse, GroupLogConfig, DailyStats, UserStats, GroupStats } from '../types';
import { pluginState } from '../core/state';

const LOGS_DIR = 'logs';
const LOGS_FILE = 'checkin-logs.json';
const LOG_CONFIG_FILE = 'log-config.json';

// ==================== 日志记录 ====================

/**
 * 创建签到日志
 */
export function createCheckinLog(data: {
    userId: string;
    nickname: string;
    groupId: string;
    groupName: string;
    earnedPoints: number;
    consecutiveDays: number;
    totalPoints: number;
    totalDays: number;
    basePoints: number;
    consecutiveBonus: number;
    weekendBonus: number;
    weekday: number;
    weekdayName: string;
    isWeekend: boolean;
    quote: string;
    replyMode: 'text' | 'image' | 'auto';
    status: 'success' | 'failed';
    errorMessage?: string;
}): CheckinLog {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].substring(0, 8);

    const log: CheckinLog = {
        id: generateLogId(),
        userId: data.userId,
        nickname: data.nickname,
        groupId: data.groupId,
        groupName: data.groupName,
        timestamp: now.getTime(),
        date,
        time,
        earnedPoints: data.earnedPoints,
        consecutiveDays: data.consecutiveDays,
        totalPoints: data.totalPoints,
        totalDays: data.totalDays,
        basePoints: data.basePoints,
        consecutiveBonus: data.consecutiveBonus,
        weekendBonus: data.weekendBonus,
        weekday: data.weekday,
        weekdayName: data.weekdayName,
        isWeekend: data.isWeekend,
        quote: data.quote,
        replyMode: data.replyMode,
        status: data.status,
        errorMessage: data.errorMessage,
    };

    const logs = getAllLogs();
    logs.push(log);
    saveLogs(logs);

    pluginState.logger.info(`[签到日志] ${log.nickname}(${log.userId}) 在 ${log.groupName}(${log.groupId}) 签到，获得 ${log.earnedPoints} 积分`);

    return log;
}

/**
 * 获取所有日志
 */
function getAllLogs(): CheckinLog[] {
    const logsPath = getLogsPath(LOGS_FILE);
    pluginState.logger.debug(`[签到日志] 读取日志文件: ${logsPath}`);
    if (!fs.existsSync(logsPath)) {
        pluginState.logger.debug(`[签到日志] 日志文件不存在`);
        return [];
    }
    try {
        const content = fs.readFileSync(logsPath, 'utf-8');
        const data = JSON.parse(content);
        const logs = Array.isArray(data) ? data : [];
        pluginState.logger.debug(`[签到日志] 读取到 ${logs.length} 条日志`);
        return logs;
    } catch (err) {
        pluginState.logger.error('[签到日志] 读取日志失败:', err);
        return [];
    }
}

/**
 * 保存所有日志
 */
function saveLogs(logs: CheckinLog[]): void {
    const logsPath = getLogsPath(LOGS_FILE);
    fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2), 'utf-8');
    pluginState.logger.debug(`[签到日志] 已保存 ${logs.length} 条日志到: ${logsPath}`);
}

/**
 * 生成日志ID
 */
function generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 获取日志文件路径
 */
function getLogsPath(filename: string): string {
    const dataDir = pluginState.ctx.dataPath;
    const logsDir = path.join(dataDir, LOGS_DIR);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    return path.join(logsDir, filename);
}

// ==================== 日志查询 ====================

/**
 * 分页查询日志
 */
export function queryLogs(params: LogQueryParams = {}): LogPageResponse {
    const {
        page = 1,
        pageSize = 50,
        userId,
        groupId,
        startDate,
        endDate,
        status = 'all',
        order = 'desc',
    } = params;

    let logs = getAllLogs();

    // 筛选
    if (userId) {
        logs = logs.filter(log => log.userId === userId);
    }
    if (groupId) {
        logs = logs.filter(log => log.groupId === groupId);
    }
    if (startDate) {
        logs = logs.filter(log => log.date >= startDate);
    }
    if (endDate) {
        logs = logs.filter(log => log.date <= endDate);
    }
    if (status !== 'all') {
        logs = logs.filter(log => log.status === status);
    }

    // 排序
    logs.sort((a, b) => {
        const diff = order === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
        return diff;
    });

    // 分页
    const total = logs.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedLogs = logs.slice(startIndex, startIndex + pageSize);

    return {
        page,
        pageSize,
        total,
        totalPages,
        logs: paginatedLogs,
    };
}

/**
 * 获取单条日志
 */
export function getLogById(id: string): CheckinLog | null {
    const logs = getAllLogs();
    return logs.find(log => log.id === id) || null;
}

/**
 * 按用户查询日志数量
 */
export function getUserLogCount(userId: string): number {
    const logs = getAllLogs();
    return logs.filter(log => log.userId === userId).length;
}

/**
 * 按群组查询日志数量
 */
export function getGroupLogCount(groupId: string): number {
    const logs = getAllLogs();
    return logs.filter(log => log.groupId === groupId).length;
}

/**
 * 删除日志（按ID）
 */
export function deleteLogById(id: string): boolean {
    const logs = getAllLogs();
    const index = logs.findIndex(log => log.id === id);
    if (index === -1) return false;
    logs.splice(index, 1);
    saveLogs(logs);
    return true;
}

/**
 * 删除旧日志
 */
export function deleteLogsOlderThan(days: number): number {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const logs = getAllLogs();
    const originalCount = logs.length;
    const filteredLogs = logs.filter(log => log.timestamp >= cutoff);
    if (filteredLogs.length !== originalCount) {
        saveLogs(filteredLogs);
        return originalCount - filteredLogs.length;
    }
    return 0;
}

// ==================== 日志统计 ====================

/**
 * 获取日志统计
 */
export function getLogStats(timeRange: 'today' | 'week' | 'month' | 'year' | 'all' = 'all'): LogStatsResponse {
    let logs = getAllLogs();

    // 时间范围筛选
    const now = new Date();
    let startTime: number | undefined;
    switch (timeRange) {
        case 'today':
            const today = now.toISOString().split('T')[0];
            startTime = new Date(today).getTime();
            break;
        case 'week':
            startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
            break;
        case 'month':
            startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
            break;
        case 'year':
            startTime = now.getTime() - 365 * 24 * 60 * 60 * 1000;
            break;
    }
    if (startTime) {
        logs = logs.filter(log => log.timestamp >= startTime!);
    }

    // 基本统计
    const totalCheckins = logs.filter(log => log.status === 'success').length;
    const totalPoints = logs.reduce((sum, log) => sum + (log.status === 'success' ? log.earnedPoints : 0), 0);
    const uniqueUsers = new Set(logs.map(log => log.userId));
    const uniqueGroups = new Set(logs.map(log => log.groupId));

    // 日均签到
    let days = 1;
    if (logs.length > 0) {
        const timestamps = logs.map(log => log.timestamp);
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        days = Math.max(1, Math.ceil((maxTime - minTime) / (24 * 60 * 60 * 1000)));
    }
    const dailyAverage = Math.round(totalCheckins / days * 100) / 100;

    // 按日期统计
    const dailyMap = new Map<string, DailyStats>();
    logs.forEach(log => {
        if (log.status !== 'success') return;
        if (!dailyMap.has(log.date)) {
            dailyMap.set(log.date, {
                date: log.date,
                checkinCount: 0,
                totalPoints: 0,
                userCount: 0,
            });
        }
        const stat = dailyMap.get(log.date)!;
        stat.checkinCount++;
        stat.totalPoints += log.earnedPoints;
    });
    const dailyStats: DailyStats[] = Array.from(dailyMap.values())
        .sort((a, b) => b.date.localeCompare(a.date));

    // 按用户统计TOP10
    const userMap = new Map<string, UserStats>();
    logs.forEach(log => {
        if (log.status !== 'success') return;
        if (!userMap.has(log.userId)) {
            userMap.set(log.userId, {
                userId: log.userId,
                nickname: log.nickname,
                checkinCount: 0,
                totalPoints: 0,
                lastCheckinTime: 0,
            });
        }
        const stat = userMap.get(log.userId)!;
        stat.checkinCount++;
        stat.totalPoints += log.earnedPoints;
        if (log.timestamp > stat.lastCheckinTime) {
            stat.lastCheckinTime = log.timestamp;
        }
    });
    const topUsers: UserStats[] = Array.from(userMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 10);

    // 按群组统计TOP10
    const groupMap = new Map<string, GroupStats>();
    logs.forEach(log => {
        if (log.status !== 'success') return;
        if (!groupMap.has(log.groupId)) {
            groupMap.set(log.groupId, {
                groupId: log.groupId,
                groupName: log.groupName,
                checkinCount: 0,
                userCount: 0,
                totalPoints: 0,
            });
        }
        const stat = groupMap.get(log.groupId)!;
        stat.checkinCount++;
        stat.totalPoints += log.earnedPoints;
    });
    const topGroups: GroupStats[] = Array.from(groupMap.values())
        .sort((a, b) => b.checkinCount - a.checkinCount)
        .slice(0, 10);

    // 计算每日的用户数
    dailyStats.forEach(stat => {
        const dateLogs = logs.filter(log => log.date === stat.date && log.status === 'success');
        stat.userCount = new Set(dateLogs.map(log => log.userId)).size;
    });

    return {
        totalCheckins,
        totalPoints,
        totalUsers: uniqueUsers.size,
        totalGroups: uniqueGroups.size,
        dailyAverage,
        totalLogs: logs.length,
        dailyStats,
        topUsers,
        topGroups,
    };
}

/**
 * 获取每日签到趋势（用于图表）
 */
export function getDailyTrend(days: number = 30): { date: string; count: number; points: number }[] {
    const logs = getAllLogs().filter(log => log.status === 'success');
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split('T')[0];

    const trendMap = new Map<string, { count: number; points: number }>();

    // 初始化所有日期
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        trendMap.set(dateStr, { count: 0, points: 0 });
    }

    // 填充数据
    logs.forEach(log => {
        if (log.date < startDateStr) return;
        const trend = trendMap.get(log.date);
        if (trend) {
            trend.count++;
            trend.points += log.earnedPoints;
        }
    });

    return Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        ...data,
    }));
}

// ==================== 日志配置 ====================

/**
 * 获取所有群的日志配置
 */
export function getAllLogConfigs(): Record<string, GroupLogConfig> {
    const configPath = getLogsPath(LOG_CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
        return {};
    }
    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return {};
    }
}

/**
 * 获取单个群的日志配置
 */
export function getGroupLogConfig(groupId: string): GroupLogConfig {
    const configs = getAllLogConfigs();
    if (configs[groupId]) {
        return configs[groupId];
    }
    // 默认配置
    return {
        groupId,
        enabled: true,
        enableStats: true,
        retentionDays: 0,
    };
}

/**
 * 保存群的日志配置
 */
export function saveGroupLogConfig(config: GroupLogConfig): void {
    const configs = getAllLogConfigs();
    configs[config.groupId] = config;
    const configPath = getLogsPath(LOG_CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(configs, null, 2), 'utf-8');
}

/**
 * 批量保存群的日志配置
 */
export function saveAllLogConfigs(configs: Record<string, GroupLogConfig>): void {
    const configPath = getLogsPath(LOG_CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(configs, null, 2), 'utf-8');
}

/**
 * 检查群是否启用日志
 */
export function isGroupLogEnabled(groupId: string): boolean {
    const config = getGroupLogConfig(groupId);
    return config.enabled;
}

/**
 * 初始化默认日志配置
 */
export function initDefaultLogConfig(groupId: string, groupName: string): GroupLogConfig {
    return {
        groupId,
        enabled: true,
        enableStats: true,
        retentionDays: 0,
    };
}
