/**
 * 签到核心逻辑
 * 包含核心的签到执行逻辑
 */

import type { CheckinResult, PointsBreakdown, GroupUserCheckinData, CheckinRecord } from '../../types';
import { pluginState } from '../../core/state';
import { loadGlobalUsersData, saveGlobalUsersData, loadGroupUsersData, saveGroupUsersData, loadGroupDailyStats, saveGroupDailyStats, canCheckinToday } from './checkin-data';
import { calculatePoints } from '../points-calculator';
import { PointsCoreService } from '../points/points-core.service';
import { calculateLevel } from '../../config/level-config';
import { getTodayStr, getCurrentTimeStr, formatDateToString } from './checkin-utils';

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
