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
import { PointsCoreService } from './points/points-core.service';
import { calculateLevel } from '../config/level-config';
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
        return formatDateToString(yesterday);
    }
    
    // 返回今天的日期（使用本地时区）
    return formatDateToString(now);
}

/**
 * 将 Date 对象格式化为 YYYY-MM-DD 字符串（本地时区）
 */
function formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
 * 检查今天是否还可以签到（群内独立）
 * 
 * 注意：每个群独立计算签到次数，不再限制全局签到
 */
function canCheckinToday(userId: string, groupId: string | undefined, todayStr: string): { canCheckin: boolean; checkedInCount: number } {
    // 如果没有指定群，检查全局签到（向后兼容）
    if (!groupId) {
        const globalUsers = loadGlobalUsersData();
        const globalUserData = globalUsers.get(userId);
        
        if (pluginState.config.checkinRefreshTime.cycleType === 'daily') {
            // 统计今日全局签到次数
            const checkinHistory = globalUserData?.checkinHistory || [];
            const globalCheckinCount = checkinHistory.filter(record => record.date === todayStr).length;
            const maxCount = pluginState.config.checkinRefreshTime.cycleCount || 1;
            
            return {
                canCheckin: globalCheckinCount < maxCount,
                checkedInCount: globalCheckinCount
            };
        }
        
        // weekly/monthly 周期
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
    
    // 群内独立签到：检查该群今天/本周/本月已签到次数
    const groupUsers = loadGroupUsersData(groupId);
    const groupUserData = groupUsers.get(userId);
    const cycleType = pluginState.config.checkinRefreshTime.cycleType || 'daily';
    const maxCount = pluginState.config.checkinRefreshTime.cycleCount || 1;
    
    if (!groupUserData) {
        // 用户在该群没有数据，可以签到
        return { canCheckin: true, checkedInCount: 0 };
    }
    
    if (cycleType === 'daily') {
        // 检查今天在该群签到次数 - 通过统计签到历史
        const checkinHistory = groupUserData.checkinHistory || [];
        const todayCheckinCount = checkinHistory.filter(record => record.date === todayStr).length;
        return {
            canCheckin: todayCheckinCount < maxCount,
            checkedInCount: todayCheckinCount
        };
    }
    
    // weekly/monthly 周期
    const cycleId = getCycleIdentifier();
    const checkinHistory = groupUserData.checkinHistory || [];
    const cycleCheckinCount = checkinHistory.filter(record => {
        const recordDate = new Date(record.date);
        return getCycleIdentifierForDate(recordDate) === cycleId;
    }).length;
    
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
            return formatDateToString(date);
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
        try {
            const data = pluginState.loadDataFile<Record<string, UserCheckinData>>(
                USERS_DATA_FILE, 
                {},
                { validateEmpty: true }  // 启用空数据检测
            );
            usersCache = new Map(Object.entries(data || {}));
        } catch (e) {
            pluginState.logger.error('加载全局用户数据失败:', e);
            usersCache = new Map();
        }
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
export function loadGroupUsersData(groupId: string): Map<string, GroupUserCheckinData> {
    if (!groupUsersCache.has(groupId)) {
        const fileName = getGroupDataFile(groupId);
        const groupData = pluginState.loadDataFile<{
            users?: Record<string, GroupUserCheckinData>;
            dailyStats?: Record<string, DailyCheckinStats>;
        }>(
            fileName, 
            {},
            { validateEmpty: true, dataKey: 'users' }  // 启用空数据检测，检查 users 字段
        );
        groupUsersCache.set(groupId, new Map(Object.entries(groupData.users || {})));
    }
    return groupUsersCache.get(groupId)!;
}

/**
 * 保存群内用户数据
 * 使用增量更新策略，避免覆盖其他字段（如 dailyStats）
 * @param groupId 群号
 * @param groupName 群名称（可选，首次保存时传入）
 */
export function saveGroupUsersData(groupId: string, groupName?: string): void {
    const users = groupUsersCache.get(groupId);
    if (!users) return;
    
    const fileName = getGroupDataFile(groupId);
    // 先读取现有数据，确保不丢失其他字段（如 dailyStats）
    const existingData = pluginState.loadDataFile<{
        groupName?: string;
        users?: Record<string, GroupUserCheckinData>;
        dailyStats?: Record<string, DailyCheckinStats>;
    }>(
        fileName, 
        {},
        { validateEmpty: true, dataKey: 'users' }
    );
    
    // 合并数据：保留现有字段，更新 users
    const groupData = {
        ...existingData,                    // 保留所有现有字段
        groupName: groupName || existingData.groupName,  // 更新群名称
        users: Object.fromEntries(users),   // 更新用户数据
    };
    
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
 * 使用增量更新策略，避免覆盖用户数据
 */
function saveGroupDailyStats(groupId: string): void {
    const today = getTodayStr();
    const cacheKey = `${groupId}-${today}`;
    const stats = dailyStatsCache.get(cacheKey);
    
    if (!stats) return;
    
    const fileName = getGroupDataFile(groupId);
    // 先读取现有数据，确保不丢失用户数据
    const existingData = pluginState.loadDataFile<{
        users?: Record<string, GroupUserCheckinData>;
        dailyStats?: Record<string, DailyCheckinStats>;
    }>(
        fileName, 
        {},
        { validateEmpty: true, dataKey: 'users' }
    );
    
    // 合并数据：保留用户数据，更新今日统计
    const groupData = {
        ...existingData,  // 保留所有现有字段（包括 users）
        dailyStats: {
            ...existingData.dailyStats,  // 保留其他日期的统计
            [today]: stats,              // 更新今日统计
        },
    };
    
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
        
        // 2. 加载全局数据（全服排行用）
        const globalUsers = loadGlobalUsersData();
        let globalUserData = globalUsers.get(userId);
        
        // 4. 检查今天是否已经在全局签到过
        const hasCheckedInToday = globalUserData && globalUserData.lastCheckinDate === today;
        
        // 5. 计算连续签到天数（全局）
        let globalConsecutiveDays = 1;
        if (globalUserData && globalUserData.lastCheckinDate) {
            const config = pluginState.config.checkinRefreshTime;
            
            // 使用本地时区计算
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
            
            const previousCycleStr = formatDateToString(previousCycleDate);
            
            if (globalUserData.lastCheckinDate === previousCycleStr) {
                globalConsecutiveDays = globalUserData.consecutiveDays + 1;
            } else if (hasCheckedInToday) {
                // 今天已经签到过，保持原有连续天数
                globalConsecutiveDays = globalUserData.consecutiveDays;
            }
        }
        
        // 5. 计算积分
        const config = pluginState.config.checkinPoints;
        const pointsResult = calculatePoints(config, globalConsecutiveDays);
        const earnedPoints = pointsResult.totalPoints;
        
        // 6. 更新全局用户数据
        const isFirstTime = !globalUserData;
        if (!globalUserData) {
            globalUserData = {
                userId,
                nickname,
                totalCheckinDays: 0,
                consecutiveDays: 0,
                totalExp: 0,
                balance: 0,
                level: 1,
                levelName: '初来乍到',
                levelIcon: '🌱',
                lastCheckinDate: '',
                checkinHistory: [],
                activeDays: 0,
                lastActiveDate: '',
                transactionLog: [],
                dataVersion: 2,
            };
        }
        
        globalUserData.nickname = nickname;
        
        // 获取全局排名（仅在首次签到时更新）
        const globalDailyStats = loadGroupDailyStats('global');
        
        // 只有今天没签到过才增加积分、天数、历史记录
        if (!hasCheckedInToday) {
            // 双轨制积分：每次首次签到都增加
            globalUserData.totalExp += earnedPoints;  // 累计经验值（只增不减，用于排名）
            globalUserData.balance += earnedPoints;    // 可用余额（可消费）
            
            const globalRank = globalDailyStats.userIds.length + 1;
            
            globalUserData.totalCheckinDays += 1;
            
            // 更新活跃天数（每天首次使用机器人，不管在哪个群）
            globalUserData.activeDays += 1;
            globalUserData.lastActiveDate = today;
            
            // 添加到全局历史记录
            globalUserData.checkinHistory.push({
                date: today,
                points: earnedPoints,
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
        
        // 计算全服等级
        const globalLevelInfo = calculateLevel(globalUserData.totalExp);
        if (globalLevelInfo.level > globalUserData.level) {
            globalUserData.level = globalLevelInfo.level;
            globalUserData.levelName = globalLevelInfo.name;
            globalUserData.levelIcon = globalLevelInfo.icon;
            pluginState.logger.info(
                `[全服升级] 用户 ${nickname}(${userId}) 升级到 Lv.${globalLevelInfo.level} ${globalLevelInfo.name}`
            );
        }
        
        globalUsers.set(userId, globalUserData);
        saveGlobalUsersData();
        
        // 6. 如果指定了群，使用新的双轨制积分系统奖励积分
        // 群内签到：只在群内增加积分，不影响全局数据
        let groupRank = 0;
        let groupUserData: GroupUserCheckinData | undefined = undefined;
        if (groupId) {
            // 先确保群内用户数据存在
            const groupUsersMap = loadGroupUsersData(groupId);
            groupUserData = groupUsersMap.get(userId);
            
            // 如果用户不存在，创建初始数据
            if (!groupUserData) {
                groupUserData = {
                    userId,
                    nickname,
                    totalExp: 0,
                    balance: 0,
                    level: 1,
                    levelName: '初来乍到',
                    levelIcon: '🌱',
                    totalCheckinDays: 0,
                    consecutiveDays: 0,
                    activeDays: 0,
                    lastActiveDate: '',
                    lastCheckinDate: '',
                    checkinHistory: [],
                    transactionLog: [],
                    titles: [],
                    dataVersion: 2,
                };
                groupUsersMap.set(userId, groupUserData);
                saveGroupUsersData(groupId, groupName);
            }
            
            // 使用 PointsCoreService 奖励积分（双轨制）
            // 获取今日已签到次数，用于生成唯一的幂等键
            const todayCheckinCount = groupUserData.checkinHistory.filter(
                record => record.date === today
            ).length;
            const awardResult = await PointsCoreService.awardPoints(
                groupId,
                userId,
                {
                    userId,
                    groupId,
                    amount: earnedPoints,
                    source: 'signin',
                    description: `每日签到奖励 (${today} 第${todayCheckinCount + 1}次)`,
                    applyLevelBonus: true,
                    idempotencyKey: `signin-${groupId}-${userId}-${today}-${todayCheckinCount + 1}`,
                }
            );
            
            if (!awardResult.success) {
                pluginState.logger.error(`签到积分奖励失败: ${awardResult.error}`);
            } else {
                // 重新加载更新后的用户数据
                const updatedGroupUsers = loadGroupUsersData(groupId);
                groupUserData = updatedGroupUsers.get(userId);
            }
            
            // 更新群内连续签到天数
            if (groupUserData) {
                let groupConsecutiveDays = 1;
                if (groupUserData.lastCheckinDate) {
                    const refreshConfig = pluginState.config.checkinRefreshTime;
                    const now = new Date();
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    const currentRefreshTime = new Date(now);
                    currentRefreshTime.setHours(refreshConfig.hour, refreshConfig.minute, 0, 0);
                    
                    let previousCycleDate = yesterday;
                    if (now < currentRefreshTime) {
                        previousCycleDate = new Date(yesterday);
                        previousCycleDate.setDate(previousCycleDate.getDate() - 1);
                    }
                    
                    const previousCycleStr = formatDateToString(previousCycleDate);
                    
                    if (groupUserData.lastCheckinDate === previousCycleStr) {
                        groupConsecutiveDays = groupUserData.consecutiveDays + 1;
                    }
                }
                
                groupUserData.consecutiveDays = groupConsecutiveDays;
                groupUserData.totalCheckinDays += 1;
                
                // 更新群内活跃天数（每天首次签到增加）
                if (groupUserData.lastActiveDate !== today) {
                    groupUserData.activeDays += 1;
                    groupUserData.lastActiveDate = today;
                }
                
                groupUserData.lastCheckinDate = today;
                
                // 添加到签到历史
                groupUserData.checkinHistory.push({
                    date: today,
                    points: earnedPoints,
                    time: currentTime,
                    rank: groupRank,
                    groupId,
                });
                
                // 限制历史记录长度
                if (groupUserData.checkinHistory.length > 365) {
                    groupUserData.checkinHistory = groupUserData.checkinHistory.slice(-365);
                }
                
                // 保存更新后的群内数据
                const groupUsers = loadGroupUsersData(groupId);
                groupUsers.set(userId, groupUserData);
                saveGroupUsersData(groupId, groupName);
            }
            
            // 群内排名
            const groupDailyStats = loadGroupDailyStats(groupId);
            groupRank = groupDailyStats.userIds.length + 1;
            
            // 更新群内每日统计
            groupDailyStats.totalCheckins += 1;
            groupDailyStats.userIds.push(userId);
            saveGroupDailyStats(groupId);
        }

        return {
            success: true,
            isFirstTime,
            userData: globalUserData,
            groupUserData: groupUserData,
            earnedPoints: earnedPoints,
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
    totalExp: number;
    lastActiveDate: string;
}> {
    try {
        const allUsers = loadGlobalUsersData();
        return Array.from(allUsers.values())
            .filter(user => user && typeof user === 'object')
            .sort((a, b) => (b?.activeDays || 0) - (a?.activeDays || 0))
            .slice(0, limit)
            .map(user => ({
                userId: user?.userId || '',
                nickname: user?.nickname || '未知用户',
                activeDays: user?.activeDays || 0,
                totalCheckinDays: user?.totalCheckinDays || 0,
                totalExp: user?.totalExp || 0,
                lastActiveDate: user?.lastActiveDate || '',
            }));
    } catch (e) {
        pluginState.logger.error('获取活跃排行失败:', e);
        return [];
    }
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
 * @returns 用户积分数据（双轨制：totalExp/balance）
 */
export function getGroupUserPoints(groupId: string, userId: string): {
    userId: string;
    nickname: string;
    totalExp: number;
    balance: number;
    totalCheckinDays: number;
} | null {
    const groupUsers = loadGroupUsersData(groupId);
    const userData = groupUsers.get(userId);
    if (!userData) return null;

    return {
        userId: userData.userId,
        nickname: userData.nickname,
        totalExp: userData.totalExp,
        balance: userData.balance,
        totalCheckinDays: userData.totalCheckinDays,
    };
}

/**
 * 修改群用户积分（增加/减少）- 双轨制兼容版
 * @param groupId 群号
 * @param userId 用户ID
 * @param points 变更积分（正数增加，负数减少）
 * @param description 操作说明
 * @param type 操作类型
 * @param operatorId 操作者ID（可选）
 * @returns 变更后的余额
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

        // 计算新余额（使用 balance 字段）
        const newBalance = userData.balance + points;
        if (newBalance < 0) {
            return { success: false, newBalance: userData.balance, error: '积分不足' };
        }

        // 更新余额
        userData.balance = newBalance;

        // 记录变更历史（使用 transactionLog）
        if (!userData.transactionLog) {
            userData.transactionLog = [];
        }

        const now = new Date();
        userData.transactionLog.unshift({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            timestamp: now.getTime(),
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            type: points > 0 ? 'admin' : 'consume',
            expChange: points > 0 ? points : 0,
            balanceChange: points,
            expBefore: userData.totalExp - (points > 0 ? points : 0),
            expAfter: userData.totalExp,
            balanceBefore: newBalance - points,
            balanceAfter: newBalance,
            description: description,
            operatorId: operatorId,
        });

        // 限制历史记录长度（保留最近100条）
        if (userData.transactionLog.length > 100) {
            userData.transactionLog = userData.transactionLog.slice(0, 100);
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

    if (!userData || !userData.transactionLog) {
        return [];
    }

    // 将 transactionLog 转换为旧格式返回（向后兼容）
    return userData.transactionLog
        .slice(0, limit)
        .map(record => ({
            timestamp: record.timestamp,
            date: record.date,
            time: record.time,
            points: record.balanceChange,
            balance: record.balanceAfter,
            type: record.type,
            description: record.description,
            operatorId: record.operatorId,
        }));
}

/**
 * 重置群用户积分（谨慎使用）- 双轨制兼容版
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

        const oldBalance = userData.balance;
        const balanceChange = -oldBalance;

        // 重置余额（totalExp 不受影响）
        userData.balance = 0;

        // 记录变更历史
        if (!userData.transactionLog) {
            userData.transactionLog = [];
        }

        const now = new Date();
        userData.transactionLog.unshift({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            timestamp: now.getTime(),
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            type: 'admin',
            expChange: 0,
            balanceChange: balanceChange,
            expBefore: userData.totalExp,
            expAfter: userData.totalExp,
            balanceBefore: oldBalance,
            balanceAfter: 0,
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
        // 使用 totalExp 作为统计积分（累计经验值）
        totalPoints += userData.totalExp;
        
        if (userData.lastCheckinDate === today) {
            todayCheckins++;
        }
        
        users.push({
            userId,
            nickname: userData.nickname,
            groupPoints: userData.totalExp,
            balance: userData.balance,
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
