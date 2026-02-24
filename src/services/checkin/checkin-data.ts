/**
 * 签到数据管理
 * 包含数据加载、保存和缓存管理功能
 */

import type { UserCheckinData, GroupUserCheckinData, DailyCheckinStats } from '../../types';
import { pluginState } from '../../core/state';

// 数据文件路径
const USERS_DATA_FILE = 'checkin-users.json';           // 全局用户数据（全服排行）
const DAILY_STATS_FILE = 'checkin-daily.json';          // 每日统计数据
export const GROUP_DATA_PREFIX = 'checkin-group-';             // 群数据文件前缀

// 内存缓存
let usersCache: Map<string, UserCheckinData> = new Map();
let dailyStatsCache: Map<string, DailyCheckinStats> = new Map();  // 按群存储今日统计
let groupUsersCache: Map<string, Map<string, GroupUserCheckinData>> = new Map(); // 群用户缓存

import { getTodayStr, formatDateToString } from './checkin-utils';

/**
 * 获取群数据文件路径
 */
export function getGroupDataFile(groupId: string): string {
    return `${GROUP_DATA_PREFIX}${groupId}.json`;
}

/**
 * 加载全局用户数据（用于全服排行）
 */
export function loadGlobalUsersData(): Map<string, UserCheckinData> {
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
export function saveGlobalUsersData(): void {
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
export function loadGroupDailyStats(groupId: string): DailyCheckinStats {
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
export function saveGroupDailyStats(groupId: string): void {
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
 * 检查今天是否还可以签到（群内独立）
 * 
 * 注意：每个群独立计算签到次数，不再限制全局签到
 */
export function canCheckinToday(userId: string, groupId: string | undefined, todayStr: string): { canCheckin: boolean; checkedInCount: number } {
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
        const cycleId = getCycleIdentifierForDate(new Date(todayStr));
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
    const cycleId = getCycleIdentifierForDate(new Date(todayStr));
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

// 导入未定义的函数
import { getCycleIdentifierForDate } from './checkin-utils';
