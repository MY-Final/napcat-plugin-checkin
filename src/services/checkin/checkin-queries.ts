/**
 * 签到查询和统计
 * 包含查询和统计相关的功能
 */

import type { UserCheckinData, GroupUserCheckinData, GroupCheckinStats, GroupUserInfo, DailyCheckinStats } from '../../types';
import { pluginState } from '../../core/state';
import { loadGlobalUsersData, loadGroupUsersData, loadGroupDailyStats, getGroupDataFile } from './checkin-data';
import { getTodayStr } from './checkin-utils';
import fs from 'fs';
import path from 'path';

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

// 导入未定义的函数和常量
import { saveGlobalUsersData } from './checkin-data';
import { GROUP_DATA_PREFIX } from './checkin-data';
