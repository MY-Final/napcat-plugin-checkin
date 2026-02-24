/**
 * 群用户积分管理
 * 包含积分管理相关的功能
 */

import type { GroupUserCheckinData } from '../../types';
import { pluginState } from '../../core/state';
import { loadGroupUsersData, saveGroupUsersData } from './checkin-data';

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
