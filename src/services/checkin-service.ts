/**
 * 重构后的签到服务
 * 支持分群签到，每个群独立统计
 */

import type { 
    UserCheckinData, 
    GroupUserCheckinData, 
    CheckinResult, 
    DailyCheckinStats, 
    GroupCheckinStats, 
    GroupUserInfo,
    PointsBreakdown
} from '../types';
import { pluginState } from '../core/state';
import { calculatePoints } from './points-calculator';
import * as fs from 'fs';
import * as path from 'path';

// 数据文件路径
const USERS_DATA_FILE = 'checkin-users.json';           // 全局用户数据（全服排行）
const DAILY_STATS_FILE = 'checkin-daily.json';          // 每日统计数据
const GROUP_DATA_PREFIX = 'checkin-group-';             // 群数据文件前缀

// 内存缓存
let usersCache: Map<string, UserCheckinData> = new Map();
let dailyStatsCache: Map<string, DailyCheckinStats> = new Map();  // 按群存储今日统计
let groupUsersCache: Map<string, Map<string, GroupUserCheckinData>> = new Map(); // 群用户缓存

/**
 * 获取今天的日期字符串 YYYY-MM-DD（基于配置的刷新时间）
 */
function getTodayStr(): string {
    const now = new Date();
    const config = pluginState.config.checkinRefreshTime;
    
    // 创建刷新时间点（今天）
    const refreshTime = new Date(now);
    refreshTime.setHours(config.hour, config.minute, 0, 0);
    
    // 如果当前时间小于刷新时间，说明还在上一个周期
    if (now < refreshTime) {
        // 返回昨天的日期
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }
    
    // 返回今天的日期
    return now.toISOString().split('T')[0];
}

/**
 * 获取当前周期标识（用于 weekly/monthly 周期判断）
 */
function getCycleIdentifier(): string {
    const now = new Date();
    const config = pluginState.config.checkinRefreshTime;
    const cycleType = config.cycleType || 'daily';
    
    // 根据周期类型返回不同的标识
    switch (cycleType) {
        case 'weekly': {
            // 返回年份-周数
            const weekStart = new Date(now);
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 调整到周一
            weekStart.setDate(diff);
            return `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
        }
        case 'monthly': {
            // 返回年份-月份
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        case 'daily':
        default: {
            // 使用日期字符串
            return getTodayStr();
        }
    }
}

/**
 * 获取周数
 */
function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * 检查今天是否还可以签到
 */
function canCheckinToday(userId: string, groupId: string | undefined, todayStr: string): { canCheckin: boolean; checkedInCount: number } {
    // 加载全局数据
    const globalUsers = loadGlobalUsersData();
    const globalUserData = globalUsers.get(userId);
    
    // 如果是 daily 周期，按日期判断
    if (pluginState.config.checkinRefreshTime.cycleType === 'daily') {
        const globalCheckinCount = globalUserData?.lastCheckinDate === todayStr ? 1 : 0;
        const maxCount = pluginState.config.checkinRefreshTime.cycleCount || 1;
        
        return {
            canCheckin: globalCheckinCount < maxCount,
            checkedInCount: globalCheckinCount
        };
    }
    
    // weekly/monthly 周期需要统计本周期内签到次数
    const cycleId = getCycleIdentifier();
    const checkinHistory = globalUserData?.checkinHistory || [];
    const cycleCheckinCount = checkinHistory.filter(record => {
        const recordDate = new Date(record.date);
        return getCycleIdentifierForDate(recordDate) === cycleId;
    }).length;
    
    const maxCount = pluginState.config.checkinRefreshTime.cycleCount || 1;
    
    return {
        canCheckin: cycleCheckinCount < maxCount,
        checkedInCount: cycleCheckinCount
    };
}

/**
 * 获取指定日期的周期标识
 */
function getCycleIdentifierForDate(date: Date): string {
    const config = pluginState.config.checkinRefreshTime;
    const cycleType = config.cycleType || 'daily';
    
    switch (cycleType) {
        case 'weekly': {
            const weekStart = new Date(date);
            const dayOfWeek = date.getDay();
            const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            weekStart.setDate(diff);
            return `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
        }
        case 'monthly': {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        case 'daily':
        default: {
            return date.toISOString().split('T')[0];
        }
    }
}

/**
 * 获取当前时间字符串 HH:mm:ss
 */
function getCurrentTimeStr(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
}

/**
 * 获取群数据文件路径
 */
function getGroupDataFile(groupId: string): string {
    return `${GROUP_DATA_PREFIX}${groupId}.json`;
}

/**
 * 加载全局用户数据（用于全服排行）
 */
function loadGlobalUsersData(): Map<string, UserCheckinData> {
    if (usersCache.size === 0) {
        const data = pluginState.loadDataFile<Record<string, UserCheckinData>>(USERS_DATA_FILE, {});
        usersCache = new Map(Object.entries(data));
    }
    return usersCache;
}

/**
 * 保存全局用户数据
 */
function saveGlobalUsersData(): void {
    const data = Object.fromEntries(usersCache);
    pluginState.saveDataFile(USERS_DATA_FILE, data);
}

/**
 * 加载群内用户数据
 */
function loadGroupUsersData(groupId: string): Map<string, GroupUserCheckinData> {
    if (!groupUsersCache.has(groupId)) {
        const fileName = getGroupDataFile(groupId);
        const groupData = pluginState.loadDataFile<{
            users?: Record<string, GroupUserCheckinData>;
            dailyStats?: Record<string, DailyCheckinStats>;
        }>(fileName, {});
        groupUsersCache.set(groupId, new Map(Object.entries(groupData.users || {})));
    }
    return groupUsersCache.get(groupId)!;
}

/**
 * 保存群内用户数据
 * @param groupId 群号
 * @param groupName 群名称（可选，首次保存时传入）
 */
function saveGroupUsersData(groupId: string, groupName?: string): void {
    const users = groupUsersCache.get(groupId);
    if (!users) return;
    
    const fileName = getGroupDataFile(groupId);
    const groupData = pluginState.loadDataFile<{
        groupName?: string;
        users?: Record<string, GroupUserCheckinData>;
        dailyStats?: Record<string, DailyCheckinStats>;
    }>(fileName, {});
    
    // 更新群名称（如果提供了）
    if (groupName) {
        groupData.groupName = groupName;
    }
    
    groupData.users = Object.fromEntries(users);
    pluginState.saveDataFile(fileName, groupData);
}

/**
 * 加载今日统计数据（按群）
 */
function loadGroupDailyStats(groupId: string): DailyCheckinStats {
    const today = getTodayStr();
    const cacheKey = `${groupId}-${today}`;
    
    if (!dailyStatsCache.has(cacheKey)) {
        const fileName = getGroupDataFile(groupId);
        // 从群数据文件中读取今日统计
        const groupData = pluginState.loadDataFile<{
            users?: Record<string, GroupUserCheckinData>;
            dailyStats?: Record<string, DailyCheckinStats>;
        }>(fileName, {});
        
        const todayStats = groupData.dailyStats?.[today] || {
            date: today,
            totalCheckins: 0,
            userIds: [],
        };
        
        dailyStatsCache.set(cacheKey, todayStats);
    }
    
    return dailyStatsCache.get(cacheKey)!;
}

/**
 * 保存今日统计数据（按群）
 */
function saveGroupDailyStats(groupId: string): void {
    const today = getTodayStr();
    const cacheKey = `${groupId}-${today}`;
    const stats = dailyStatsCache.get(cacheKey);
    
    if (!stats) return;
    
    const fileName = getGroupDataFile(groupId);
    const groupData = pluginState.loadDataFile<{
        users?: Record<string, GroupUserCheckinData>;
        dailyStats?: Record<string, DailyCheckinStats>;
    }>(fileName, {});
    
    if (!groupData.dailyStats) {
        groupData.dailyStats = {};
    }
    
    groupData.dailyStats[today] = stats;
    pluginState.saveDataFile(fileName, groupData);
}

/**
 * 执行签到（支持分群）
 */
export async function performCheckin(
    userId: string,
    nickname: string,
    groupId?: string,
    groupName?: string
): Promise<CheckinResult> {
    try {
        const today = getTodayStr();
        const currentTime = getCurrentTimeStr();
        
        // 1. 检查今天是否还可以签到（基于周期配置）
        const checkinStatus = canCheckinToday(userId, groupId, today);
        const maxCount = pluginState.config.checkinRefreshTime.cycleCount || 1;
        
        if (!checkinStatus.canCheckin) {
            const globalUsers = loadGlobalUsersData();
            const globalUserData = globalUsers.get(userId);
            const cycleTypeText = {
                'daily': '今天',
                'weekly': '本周',
                'monthly': '本月'
            }[pluginState.config.checkinRefreshTime.cycleType] || '今天';
            
            return {
                success: false,
                isFirstTime: false,
                userData: globalUserData!,
                earnedPoints: 0,
                todayRank: 0,
                checkinTime: currentTime,
                consecutiveDays: globalUserData?.consecutiveDays || 0,
                error: `${cycleTypeText}已经签到${maxCount}次了，${cycleTypeText}再来吧~`,
            };
        }
        
        // 2. 检查群内是否已经签到（如果指定了群）
        if (groupId) {
            const groupUsers = loadGroupUsersData(groupId);
            const groupUserData = groupUsers.get(userId);
            
            if (groupUserData && groupUserData.lastCheckinDate === today) {
                return {
                    success: false,
                    isFirstTime: false,
                    userData: loadGlobalUsersData().get(userId)!,
                    earnedPoints: 0,
                    todayRank: 0,
                    checkinTime: currentTime,
                    consecutiveDays: groupUserData.consecutiveDays,
                    error: '今天已经在这个群签到过了，明天再来吧~',
                };
            }
        }
        
        // 3. 加载全局数据（全服排行用）
        const globalUsers = loadGlobalUsersData();
        let globalUserData = globalUsers.get(userId);
        
        // 4. 检查今天是否已经在全局签到过
        const hasCheckedInToday = globalUserData && globalUserData.lastCheckinDate === today;
        
        // 5. 计算连续签到天数（全局）
        let globalConsecutiveDays = 1;
        if (globalUserData && globalUserData.lastCheckinDate) {
            const config = pluginState.config.checkinRefreshTime;
            
            // 计算上一个周期的日期
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            
            // 如果今天已经过了刷新时间，昨天就是上一个周期；否则前天才是上一个周期
            const currentRefreshTime = new Date(now);
            currentRefreshTime.setHours(config.hour, config.minute, 0, 0);
            
            let previousCycleDate = yesterday;
            if (now < currentRefreshTime) {
                // 当前时间还没到今天的刷新时间，说明昨天是上一个周期
                previousCycleDate = new Date(yesterday);
                previousCycleDate.setDate(previousCycleDate.getDate() - 1);
            }
            
            const previousCycleStr = previousCycleDate.toISOString().split('T')[0];
            
            if (globalUserData.lastCheckinDate === previousCycleStr) {
                globalConsecutiveDays = globalUserData.consecutiveDays + 1;
            } else if (hasCheckedInToday) {
                // 今天已经签到过，保持原有连续天数
                globalConsecutiveDays = globalUserData.consecutiveDays;
            }
        }
        
        // 5. 计算积分（群内签到始终给分，但全局积分今天已签到过则不再给）
        const config = pluginState.config.checkinPoints;
        const pointsResult = calculatePoints(config, globalConsecutiveDays);
        const groupPoints = pointsResult.totalPoints; // 群内积分始终给
        const globalPoints = hasCheckedInToday ? 0 : pointsResult.totalPoints; // 全局积分今天已签到则不给
        
        // 6. 更新全局用户数据
        const isFirstTime = !globalUserData;
        if (!globalUserData) {
            globalUserData = {
                userId,
                nickname,
                totalCheckinDays: 0,
                consecutiveDays: 0,
                totalPoints: 0,
                lastCheckinDate: '',
                checkinHistory: [],
                activeDays: 0,
                lastActiveDate: '',
            };
        }
        
        globalUserData.nickname = nickname;
        
        // 获取全局排名（即使今天已签到也要用）
        const globalDailyStats = loadGroupDailyStats('global');
        const globalRank = globalDailyStats.userIds.length + 1;
        
        // 只有今天没签到过才增加天数、积分和活跃天数
        if (!hasCheckedInToday) {
            globalUserData.totalCheckinDays += 1;
            globalUserData.totalPoints += globalPoints;
            
            // 更新活跃天数（每天首次使用机器人，不管在哪个群）
            globalUserData.activeDays += 1;
            globalUserData.lastActiveDate = today;
            
            // 添加到全局历史记录
            globalUserData.checkinHistory.push({
                date: today,
                points: globalPoints,
                time: currentTime,
                rank: globalRank,
                groupId: groupId || undefined,
            });
            
            // 限制历史记录长度
            if (globalUserData.checkinHistory.length > 365) {
                globalUserData.checkinHistory = globalUserData.checkinHistory.slice(-365);
            }
            
            // 更新全局每日统计
            globalDailyStats.totalCheckins += 1;
            globalDailyStats.userIds.push(userId);
            saveGroupDailyStats('global');
        }
        
        globalUserData.consecutiveDays = globalConsecutiveDays;
        globalUserData.lastCheckinDate = today;
        
        globalUsers.set(userId, globalUserData);
        saveGlobalUsersData();
        
        // 6. 如果指定了群，更新群内数据
        let groupRank = globalRank;
        let groupUserData: GroupUserCheckinData | undefined = undefined;
        if (groupId) {
            const groupUsers = loadGroupUsersData(groupId);
            groupUserData = groupUsers.get(userId);
            
            // 计算群内连续签到
            let groupConsecutiveDays = 1;
            if (groupUserData && groupUserData.lastCheckinDate) {
                const config = pluginState.config.checkinRefreshTime;
                
                // 计算上一个周期的日期（考虑刷新时间）
                const now = new Date();
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                
                const currentRefreshTime = new Date(now);
                currentRefreshTime.setHours(config.hour, config.minute, 0, 0);
                
                let previousCycleDate = yesterday;
                if (now < currentRefreshTime) {
                    previousCycleDate = new Date(yesterday);
                    previousCycleDate.setDate(previousCycleDate.getDate() - 1);
                }
                
                const previousCycleStr = previousCycleDate.toISOString().split('T')[0];
                
                if (groupUserData.lastCheckinDate === previousCycleStr) {
                    groupConsecutiveDays = groupUserData.consecutiveDays + 1;
                }
            }
            
            if (!groupUserData) {
                groupUserData = {
                    userId,
                    nickname,
                    totalCheckinDays: 0,
                    consecutiveDays: 0,
                    totalPoints: 0,
                    lastCheckinDate: '',
                    checkinHistory: [],
                };
            }
            
            groupUserData.nickname = nickname;
            groupUserData.totalCheckinDays += 1;
            groupUserData.consecutiveDays = groupConsecutiveDays;
            groupUserData.totalPoints += groupPoints; // 使用群内积分
            groupUserData.lastCheckinDate = today;
            
            // 群内排名
            const groupDailyStats = loadGroupDailyStats(groupId);
            groupRank = groupDailyStats.userIds.length + 1;
            
            groupUserData.checkinHistory.push({
                date: today,
                points: groupPoints, // 使用群内积分
                time: currentTime,
                rank: groupRank,
                groupId,
            });

            // 限制历史记录长度
            if (groupUserData.checkinHistory.length > 365) {
                groupUserData.checkinHistory = groupUserData.checkinHistory.slice(-365);
            }

            groupUsers.set(userId, groupUserData);
            saveGroupUsersData(groupId, groupName);

            // 更新群内每日统计
            groupDailyStats.totalCheckins += 1;
            groupDailyStats.userIds.push(userId);
            saveGroupDailyStats(groupId);
        }

        return {
            success: true,
            isFirstTime,
            userData: globalUserData,
            groupUserData: groupUserData, // 返回群内数据（如果有）
            earnedPoints: groupId ? groupPoints : globalPoints, // 群内签到返回群内积分，否则返回全局积分
            todayRank: groupRank,
            checkinTime: currentTime,
            consecutiveDays: globalConsecutiveDays,
            breakdown: pointsResult.breakdown,
        };
        
    } catch (error) {
        pluginState.logger.error('执行签到失败:', error);
        throw error;
    }
}

/**
 * 获取全局用户签到数据
 */
export function getUserCheckinData(userId: string): UserCheckinData | undefined {
    return loadGlobalUsersData().get(userId);
}

/**
 * 获取群内用户签到数据
 */
export function getGroupUserCheckinData(userId: string, groupId: string): GroupUserCheckinData | undefined {
    return loadGroupUsersData(groupId).get(userId);
}

/**
 * 获取所有全局用户数据（用于全服排行）
 */
export function getAllUsersData(): Map<string, UserCheckinData> {
    return loadGlobalUsersData();
}

/**
 * 获取活跃排行（按活跃天数排序）
 * 用于识别最忠实的用户
 */
export function getActiveRanking(limit: number = 100): Array<{
    userId: string;
    nickname: string;
    activeDays: number;
    totalCheckinDays: number;
    totalPoints: number;
    lastActiveDate: string;
}> {
    const allUsers = loadGlobalUsersData();
    return Array.from(allUsers.values())
        .sort((a, b) => b.activeDays - a.activeDays)
        .slice(0, limit)
        .map(user => ({
            userId: user.userId,
            nickname: user.nickname,
            activeDays: user.activeDays || 0,
            totalCheckinDays: user.totalCheckinDays,
            totalPoints: user.totalPoints,
            lastActiveDate: user.lastActiveDate || '',
        }));
}

/**
 * 获取所有群内用户数据（用于群内排行）
 */
export function getGroupAllUsersData(groupId: string): Map<string, GroupUserCheckinData> {
    return loadGroupUsersData(groupId);
}

// ==================== 群用户积分管理（CRUD）====================

/**
 * 获取群用户积分详情
 * @param groupId 群号
 * @param userId 用户ID
 * @returns 用户积分数据
 */
export function getGroupUserPoints(groupId: string, userId: string): {
    userId: string;
    nickname: string;
    totalPoints: number;
    totalCheckinDays: number;
} | null {
    const groupUsers = loadGroupUsersData(groupId);
    const userData = groupUsers.get(userId);
    if (!userData) return null;

    return {
        userId: userData.userId,
        nickname: userData.nickname,
        totalPoints: userData.totalPoints,
        totalCheckinDays: userData.totalCheckinDays,
    };
}

/**
 * 修改群用户积分（增加/减少）
 * @param groupId 群号
 * @param userId 用户ID
 * @param points 变更积分（正数增加，负数减少）
 * @param description 操作说明
 * @param type 操作类型
 * @param operatorId 操作者ID（可选）
 * @returns 变更后的积分
 */
export function updateGroupUserPoints(
    groupId: string,
    userId: string,
    points: number,
    description: string,
    type: 'signin' | 'admin' | 'exchange' | 'other' = 'other',
    operatorId?: string
): { success: boolean; newBalance: number; error?: string } {
    try {
        const groupUsers = loadGroupUsersData(groupId);
        const userData = groupUsers.get(userId);

        if (!userData) {
            return { success: false, newBalance: 0, error: '用户不存在' };
        }

        // 计算新余额
        const newBalance = userData.totalPoints + points;
        if (newBalance < 0) {
            return { success: false, newBalance: userData.totalPoints, error: '积分不足' };
        }

        // 更新积分
        userData.totalPoints = newBalance;

        // 记录变更历史
        if (!userData.pointsHistory) {
            userData.pointsHistory = [];
        }

        const now = new Date();
        userData.pointsHistory.push({
            timestamp: now.getTime(),
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            points: points,
            balance: newBalance,
            type: type,
            description: description,
            operatorId: operatorId,
        });

        // 限制历史记录长度（保留最近100条）
        if (userData.pointsHistory.length > 100) {
            userData.pointsHistory = userData.pointsHistory.slice(-100);
        }

        // 保存数据
        groupUsers.set(userId, userData);
        saveGroupUsersData(groupId);

        return { success: true, newBalance };
    } catch (error) {
        return { success: false, newBalance: 0, error: String(error) };
    }
}

/**
 * 获取群用户积分变更历史
 * @param groupId 群号
 * @param userId 用户ID
 * @param limit 限制条数
 * @returns 积分变更记录列表
 */
export function getGroupUserPointsHistory(
    groupId: string,
    userId: string,
    limit: number = 50
): {
    timestamp: number;
    date: string;
    time: string;
    points: number;
    balance: number;
    type: string;
    description: string;
    operatorId?: string;
}[] {
    const groupUsers = loadGroupUsersData(groupId);
    const userData = groupUsers.get(userId);

    if (!userData || !userData.pointsHistory) {
        return [];
    }

    return userData.pointsHistory.slice(-limit).reverse();
}

/**
 * 重置群用户积分（谨慎使用）
 * @param groupId 群号
 * @param userId 用户ID
 * @param description 操作说明
 * @param operatorId 操作者ID
 * @returns 是否成功
 */
export function resetGroupUserPoints(
    groupId: string,
    userId: string,
    description: string = '积分重置',
    operatorId?: string
): { success: boolean; error?: string } {
    try {
        const groupUsers = loadGroupUsersData(groupId);
        const userData = groupUsers.get(userId);

        if (!userData) {
            return { success: false, error: '用户不存在' };
        }

        const oldPoints = userData.totalPoints;
        const pointsChange = -oldPoints;

        // 重置积分
        userData.totalPoints = 0;

        // 记录变更历史
        if (!userData.pointsHistory) {
            userData.pointsHistory = [];
        }

        const now = new Date();
        userData.pointsHistory.push({
            timestamp: now.getTime(),
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            points: pointsChange,
            balance: 0,
            type: 'admin',
            description: description,
            operatorId: operatorId,
        });

        // 保存数据
        groupUsers.set(userId, userData);
        saveGroupUsersData(groupId);

        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * 获取今日签到数（全局）
 */
export function getTodayCheckinCount(): number {
    const stats = loadGroupDailyStats('global');
    return stats.totalCheckins;
}

/**
 * 获取群内今日签到数
 */
export function getGroupTodayCheckinCount(groupId: string): number {
    const stats = loadGroupDailyStats(groupId);
    return stats.totalCheckins;
}

/**
 * 获取用户今日排名（全局）
 */
export function getUserTodayRank(userId: string): number {
    const stats = loadGroupDailyStats('global');
    return stats.userIds.indexOf(userId) + 1;
}

/**
 * 获取用户群内今日排名
 */
export function getUserGroupTodayRank(userId: string, groupId: string): number {
    const stats = loadGroupDailyStats(groupId);
    return stats.userIds.indexOf(userId) + 1;
}

/**
 * 获取今日排名列表（全局）
 */
export function getTodayRanking(limit: number = 10): { userId: string; rank: number }[] {
    const stats = loadGroupDailyStats('global');
    return stats.userIds.slice(0, limit).map((userId, index) => ({
        userId,
        rank: index + 1,
    }));
}

/**
 * 获取群内今日排名列表
 */
export function getGroupTodayRanking(groupId: string, limit: number = 10): { userId: string; rank: number }[] {
    const stats = loadGroupDailyStats(groupId);
    return stats.userIds.slice(0, limit).map((userId, index) => ({
        userId,
        rank: index + 1,
    }));
}

/**
 * 清理旧数据
 */
export function cleanupOldData(daysToKeep: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    // 清理全局数据
    const globalUsers = loadGlobalUsersData();
    for (const [userId, userData] of globalUsers) {
        userData.checkinHistory = userData.checkinHistory.filter(
            record => record.date >= cutoffStr
        );
    }
    saveGlobalUsersData();
    
    pluginState.logger.info(`已清理 ${daysToKeep} 天前的历史数据`);
}

/**
 * 获取群签到统计数据
 */
export function getGroupCheckinStats(groupId: string): GroupCheckinStats {
    const groupUsers = loadGroupUsersData(groupId);
    const today = getTodayStr();
    const todayStats = loadGroupDailyStats(groupId);
    
    // 读取群名称
    const fileName = getGroupDataFile(groupId);
    const groupData = pluginState.loadDataFile<{
        groupName?: string;
        users?: Record<string, GroupUserCheckinData>;
        dailyStats?: Record<string, DailyCheckinStats>;
    }>(fileName, {});
    
    let totalPoints = 0;
    let todayCheckins = 0;
    const users: GroupUserInfo[] = [];
    
    for (const [userId, userData] of groupUsers) {
        totalPoints += userData.totalPoints;
        
        if (userData.lastCheckinDate === today) {
            todayCheckins++;
        }
        
        users.push({
            userId,
            nickname: userData.nickname,
            groupPoints: userData.totalPoints,
            groupCheckinDays: userData.totalCheckinDays,
            lastCheckinDate: userData.lastCheckinDate,
        });
    }
    
    return {
        groupId,
        groupName: groupData.groupName,
        totalCheckins: groupUsers.size,
        totalPoints,
        todayCheckins,
        users,
    };
}

/**
 * 获取所有群统计数据
 */
export function getAllGroupsStats(): GroupCheckinStats[] {
    try {
        const dataPath = pluginState.ctx.dataPath;
        if (!fs.existsSync(dataPath)) {
            return [];
        }

        const files = fs.readdirSync(dataPath);
        const groupFiles = files.filter(file => file.startsWith(GROUP_DATA_PREFIX) && file.endsWith('.json'));

        const groupsStats: GroupCheckinStats[] = [];
        for (const file of groupFiles) {
            // 从文件名中提取群号
            const groupId = file.replace(GROUP_DATA_PREFIX, '').replace('.json', '');
            if (groupId && groupId !== 'global') {
                const stats = getGroupCheckinStats(groupId);
                groupsStats.push(stats);
            }
        }

        return groupsStats;
    } catch (error) {
        pluginState.logger.error('获取所有群统计数据失败:', error);
        return [];
    }
}
