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
    GroupUserInfo 
} from '../types';
import { pluginState } from '../core/state';
import { calculatePoints } from './points-calculator';

// 数据文件路径
const USERS_DATA_FILE = 'checkin-users.json';           // 全局用户数据（全服排行）
const DAILY_STATS_FILE = 'checkin-daily.json';          // 每日统计数据
const GROUP_DATA_PREFIX = 'checkin-group-';             // 群数据文件前缀

// 内存缓存
let usersCache: Map<string, UserCheckinData> = new Map();
let dailyStatsCache: Map<string, DailyCheckinStats> = new Map();  // 按群存储今日统计
let groupUsersCache: Map<string, Map<string, GroupUserCheckinData>> = new Map(); // 群用户缓存

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
        const data = pluginState.loadDataFile<Record<string, GroupUserCheckinData>>(fileName, {});
        groupUsersCache.set(groupId, new Map(Object.entries(data)));
    }
    return groupUsersCache.get(groupId)!;
}

/**
 * 保存群内用户数据
 */
function saveGroupUsersData(groupId: string): void {
    const users = groupUsersCache.get(groupId);
    if (!users) return;
    
    const fileName = getGroupDataFile(groupId);
    const data = Object.fromEntries(users);
    pluginState.saveDataFile(fileName, data);
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
    groupId?: string
): Promise<CheckinResult> {
    try {
        const today = getTodayStr();
        const currentTime = getCurrentTimeStr();
        
        // 1. 检查群内是否已经签到（如果指定了群）
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
        
        // 2. 加载全局数据（全服排行用）
        const globalUsers = loadGlobalUsersData();
        let globalUserData = globalUsers.get(userId);
        
        // 3. 计算连续签到天数（全局）
        let globalConsecutiveDays = 1;
        if (globalUserData && globalUserData.lastCheckinDate) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (globalUserData.lastCheckinDate === yesterdayStr) {
                globalConsecutiveDays = globalUserData.consecutiveDays + 1;
            }
        }
        
        // 4. 计算积分
        const config = pluginState.config.checkinPoints;
        const { totalPoints, breakdown } = calculatePoints(config, globalConsecutiveDays);
        
        // 5. 更新全局用户数据
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
            };
        }
        
        globalUserData.nickname = nickname;
        globalUserData.totalCheckinDays += 1;
        globalUserData.consecutiveDays = globalConsecutiveDays;
        globalUserData.totalPoints += totalPoints;
        globalUserData.lastCheckinDate = today;
        
        // 添加到全局历史记录
        const globalDailyStats = loadGroupDailyStats('global');
        const globalRank = globalDailyStats.userIds.length + 1;
        globalUserData.checkinHistory.push({
            date: today,
            points: totalPoints,
            time: currentTime,
            rank: globalRank,
            groupId: groupId || undefined,
        });
        
        // 限制历史记录长度
        if (globalUserData.checkinHistory.length > 365) {
            globalUserData.checkinHistory = globalUserData.checkinHistory.slice(-365);
        }
        
        globalUsers.set(userId, globalUserData);
        saveGlobalUsersData();
        
        // 更新全局每日统计
        globalDailyStats.totalCheckins += 1;
        globalDailyStats.userIds.push(userId);
        saveGroupDailyStats('global');
        
        // 6. 如果指定了群，更新群内数据
        let groupRank = globalRank;
        if (groupId) {
            const groupUsers = loadGroupUsersData(groupId);
            let groupUserData = groupUsers.get(userId);
            
            // 计算群内连续签到
            let groupConsecutiveDays = 1;
            if (groupUserData && groupUserData.lastCheckinDate) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                
                if (groupUserData.lastCheckinDate === yesterdayStr) {
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
            groupUserData.totalPoints += totalPoints;
            groupUserData.lastCheckinDate = today;
            
            // 群内排名
            const groupDailyStats = loadGroupDailyStats(groupId);
            groupRank = groupDailyStats.userIds.length + 1;
            
            groupUserData.checkinHistory.push({
                date: today,
                points: totalPoints,
                time: currentTime,
                rank: groupRank,
                groupId,
            });
            
            // 限制历史记录长度
            if (groupUserData.checkinHistory.length > 365) {
                groupUserData.checkinHistory = groupUserData.checkinHistory.slice(-365);
            }
            
            groupUsers.set(userId, groupUserData);
            saveGroupUsersData(groupId);
            
            // 更新群内每日统计
            groupDailyStats.totalCheckins += 1;
            groupDailyStats.userIds.push(userId);
            saveGroupDailyStats(groupId);
        }
        
        return {
            success: true,
            isFirstTime,
            userData: globalUserData,
            earnedPoints: totalPoints,
            todayRank: groupRank,
            checkinTime: currentTime,
            consecutiveDays: globalConsecutiveDays,
            breakdown,
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
 * 获取所有群内用户数据（用于群内排行）
 */
export function getGroupAllUsersData(groupId: string): Map<string, GroupUserCheckinData> {
    return loadGroupUsersData(groupId);
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
    // 这里需要扫描数据目录获取所有群文件
    // 暂时返回空数组，后续可以实现文件扫描
    return [];
}
