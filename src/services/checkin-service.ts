/**
 * 签到服务
 * 处理签到逻辑、数据持久化和排名计算
 */

import type { UserCheckinData, CheckinResult, DailyCheckinStats, PluginConfig, GroupCheckinStats, GroupUserInfo } from '../types';
import { pluginState } from '../core/state';
import { calculatePoints } from './points-calculator';

// 数据文件路径
const USERS_DATA_FILE = 'checkin-users.json';
const DAILY_STATS_FILE = 'checkin-daily.json';

// 内存缓存
let usersCache: Map<string, UserCheckinData> = new Map();
let dailyStatsCache: DailyCheckinStats | null = null;

/**
 * 获取今天的日期字符串 YYYY-MM-DD
 */
function getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * 获取当前时间字符串 HH:mm:ss
 */
function getCurrentTimeStr(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
}

/**
 * 计算连续签到天数
 */
function calculateConsecutiveDays(lastCheckinDate: string): number {
    if (!lastCheckinDate) return 0;

    const today = new Date();
    const lastDate = new Date(lastCheckinDate);

    // 检查今天是否已经签到
    if (lastCheckinDate === getTodayStr()) {
        return -1; // 表示今天已经签到
    }

    // 检查昨天是否签到
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastCheckinDate === yesterdayStr) {
        // 昨天签到了，连续签到+1
        return 1; // 返回的是需要增加的天数
    } else if (lastCheckinDate < yesterdayStr) {
        // 断签了，重新开始
        return 0;
    }

    return 0;
}

/**
 * 加载用户数据
 */
function loadUsersData(): Map<string, UserCheckinData> {
    if (usersCache.size === 0) {
        const data = pluginState.loadDataFile<Record<string, UserCheckinData>>(USERS_DATA_FILE, {});
        usersCache = new Map(Object.entries(data));
    }
    return usersCache;
}

/**
 * 保存用户数据
 */
function saveUsersData(): void {
    const data = Object.fromEntries(usersCache);
    pluginState.saveDataFile(USERS_DATA_FILE, data);
}

/**
 * 加载今日统计数据
 */
export function loadDailyStats(): DailyCheckinStats {
    const today = getTodayStr();

    if (!dailyStatsCache || dailyStatsCache.date !== today) {
        const allStats = pluginState.loadDataFile<Record<string, DailyCheckinStats>>(DAILY_STATS_FILE, {});
        dailyStatsCache = allStats[today] || {
            date: today,
            totalCheckins: 0,
            userIds: [],
        };
    }

    return dailyStatsCache;
}

/**
 * 保存今日统计数据
 */
function saveDailyStats(): void {
    if (!dailyStatsCache) return;

    const allStats = pluginState.loadDataFile<Record<string, DailyCheckinStats>>(DAILY_STATS_FILE, {});
    allStats[dailyStatsCache.date] = dailyStatsCache;
    pluginState.saveDataFile(DAILY_STATS_FILE, allStats);
}

/**
 * 执行签到
 */
export async function performCheckin(
    userId: string,
    nickname: string,
    groupId?: string
): Promise<CheckinResult> {
    try {
        const today = getTodayStr();
        const users = loadUsersData();
        const dailyStats = loadDailyStats();

        // 检查今天是否已经签到
        let userData = users.get(userId);
        if (userData && userData.lastCheckinDate === today) {
            return {
                success: false,
                isFirstTime: false,
                userData,
                earnedPoints: 0,
                todayRank: 0,
                checkinTime: getCurrentTimeStr(),
                consecutiveDays: userData.consecutiveDays,
                error: '今天已经签到过了，明天再来吧~',
            };
        }

        // 计算连续签到
        let consecutiveDays = 1;
        if (userData) {
            const lastDate = new Date(userData.lastCheckinDate);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (userData.lastCheckinDate === yesterday.toISOString().split('T')[0]) {
                // 昨天签到了，连续天数+1
                consecutiveDays = userData.consecutiveDays + 1;
            }
        }

        // 计算积分
        const config = pluginState.config.checkinPoints;
        const { totalPoints, breakdown } = calculatePoints(config, consecutiveDays);

        // 更新或创建用户数据
        const isFirstTime = !userData;
        if (!userData) {
            userData = {
                userId,
                nickname,
                totalCheckinDays: 0,
                consecutiveDays: 0,
                totalPoints: 0,
                lastCheckinDate: '',
                checkinHistory: [],
            };
        }

        // 更新用户信息
        userData.nickname = nickname;
        userData.totalCheckinDays += 1;
        userData.consecutiveDays = consecutiveDays;
        userData.totalPoints += totalPoints;
        userData.lastCheckinDate = today;
        
        // 添加到历史记录
        const todayRank = dailyStats.userIds.length + 1;
        userData.checkinHistory.push({
            date: today,
            points: totalPoints,
            time: getCurrentTimeStr(),
            rank: todayRank,
            groupId: groupId || undefined,
        });

        // 限制历史记录长度（保留最近365天）
        if (userData.checkinHistory.length > 365) {
            userData.checkinHistory = userData.checkinHistory.slice(-365);
        }

        // 保存用户数据
        users.set(userId, userData);
        saveUsersData();

        // 更新每日统计
        dailyStats.totalCheckins += 1;
        dailyStats.userIds.push(userId);
        saveDailyStats();

        pluginState.logger.debug(
            `用户 ${nickname}(${userId}) 签到成功，获得 ${totalPoints} 积分，排名 #${todayRank}`
        );

        return {
            success: true,
            isFirstTime,
            userData,
            earnedPoints: totalPoints,
            todayRank,
            checkinTime: getCurrentTimeStr(),
            consecutiveDays,
        };
    } catch (error) {
        pluginState.logger.error('签到失败:', error);
        return {
            success: false,
            isFirstTime: false,
            userData: {} as UserCheckinData,
            earnedPoints: 0,
            todayRank: 0,
            checkinTime: getCurrentTimeStr(),
            consecutiveDays: 0,
            error: '签到处理失败，请稍后重试',
        };
    }
}

/**
 * 获取用户签到数据
 */
export function getUserCheckinData(userId: string): UserCheckinData | null {
    const users = loadUsersData();
    return users.get(userId) || null;
}

/**
 * 获取今日签到排名
 */
export function getTodayRank(userId: string): number {
    const dailyStats = loadDailyStats();
    const index = dailyStats.userIds.indexOf(userId);
    return index >= 0 ? index + 1 : dailyStats.userIds.length + 1;
}

/**
 * 获取今日签到人数
 */
export function getTodayCheckinCount(): number {
    const dailyStats = loadDailyStats();
    return dailyStats.totalCheckins;
}

/**
 * 获取所有用户数据
 */
export function getAllUsersData(): Map<string, UserCheckinData> {
    return loadUsersData();
}

/**
 * 获取群的签到统计数据
 */
export function getGroupCheckinStats(groupId: string): GroupCheckinStats {
    const allUsers = loadUsersData();
    const today = getTodayStr();
    
    const groupUsers: GroupUserInfo[] = [];
    let totalPoints = 0;
    let todayCheckins = 0;
    
    for (const user of allUsers.values()) {
        // 检查用户是否在该群签到过
        const groupCheckins = user.checkinHistory.filter(record => record.groupId === groupId);
        
        if (groupCheckins.length > 0) {
            const groupPointSum = groupCheckins.reduce((sum, record) => sum + record.points, 0);
            const lastCheckin = groupCheckins[groupCheckins.length - 1];
            
            groupUsers.push({
                userId: user.userId,
                nickname: user.nickname,
                groupPoints: groupPointSum,
                groupCheckinDays: groupCheckins.length,
                lastCheckinDate: lastCheckin.date,
            });
            
            totalPoints += groupPointSum;
            
            // 统计今日签到
            if (lastCheckin.date === today) {
                todayCheckins++;
            }
        }
    }
    
    // 按群内积分排序
    groupUsers.sort((a, b) => b.groupPoints - a.groupPoints);
    
    return {
        groupId,
        totalCheckins: groupUsers.length,
        totalPoints,
        todayCheckins,
        users: groupUsers,
    };
}

/**
 * 获取所有群的签到统计
 */
export function getAllGroupsStats(): GroupCheckinStats[] {
    const allUsers = loadUsersData();
    const groupMap = new Map<string, GroupCheckinStats>();
    const today = getTodayStr();
    
    for (const user of allUsers.values()) {
        for (const record of user.checkinHistory) {
            if (record.groupId) {
                if (!groupMap.has(record.groupId)) {
                    groupMap.set(record.groupId, {
                        groupId: record.groupId,
                        totalCheckins: 0,
                        totalPoints: 0,
                        todayCheckins: 0,
                        users: [],
                    });
                }
                
                const stats = groupMap.get(record.groupId)!;
                
                // 查找用户是否已在列表中
                const existingUser = stats.users.find(u => u.userId === user.userId);
                if (existingUser) {
                    existingUser.groupPoints += record.points;
                    existingUser.groupCheckinDays += 1;
                    if (record.date > existingUser.lastCheckinDate) {
                        existingUser.lastCheckinDate = record.date;
                    }
                } else {
                    stats.users.push({
                        userId: user.userId,
                        nickname: user.nickname,
                        groupPoints: record.points,
                        groupCheckinDays: 1,
                        lastCheckinDate: record.date,
                    });
                    stats.totalCheckins++;
                }
                
                stats.totalPoints += record.points;
                if (record.date === today) {
                    stats.todayCheckins++;
                }
            }
        }
    }
    
    return Array.from(groupMap.values());
}

/**
 * 清理旧数据（保留最近90天的统计数据）
 */
export function cleanupOldData(daysToKeep: number = 90): void {
    const allStats = pluginState.loadDataFile<Record<string, DailyCheckinStats>>(DAILY_STATS_FILE, {});
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let cleanedCount = 0;
    for (const date in allStats) {
        if (date < cutoffStr) {
            delete allStats[date];
            cleanedCount++;
        }
    }

    pluginState.saveDataFile(DAILY_STATS_FILE, allStats);
    pluginState.logger.info(`清理了 ${cleanedCount} 天的旧签到统计数据`);
}
