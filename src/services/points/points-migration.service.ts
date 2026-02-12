/**
 * 数据迁移服务
 * 
 * 将旧版单轨制积分迁移到新版双轨制
 * 
 * 迁移逻辑：
 * 1. totalExp = 旧版 totalPoints（完整继承历史）
 * 2. balance = 旧版 totalPoints * 20%（赠送启动资金）
 * 3. 重新计算等级
 * 4. 保留所有历史记录
 */

import { pluginState } from '../../core/state';
import type { GroupUserCheckinData, TransactionRecord, UserTitle } from '../../types';
import { calculateLevel } from '../../config/level-config';

// ==================== 常量定义 ====================

const GROUP_DATA_PREFIX = 'checkin-group-';
const CURRENT_VERSION = 2;
const BALANCE_RATE = 0.2;  // 20%赠送策略

// ==================== 辅助函数 ====================

function generateUUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

function formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0];
}

// ==================== 迁移结果类型 ====================

export interface MigrationResult {
    success: boolean;
    totalUsers: number;
    migratedUsers: number;
    errors: Array<{ userId: string; error: string }>;
    details: {
        totalOldPoints: number;
        totalNewExp: number;
        totalNewBalance: number;
    };
}

// ==================== 服务类 ====================

export class PointsMigrationService {
    
    /**
     * 检查是否需要迁移
     * 
     * @param userData - 用户数据
     * @returns 是否需要迁移
     */
    public static checkMigrationNeeded(userData: any): boolean {
        // 如果没有 dataVersion 字段，或者版本号低于当前版本，需要迁移
        return !userData.dataVersion || userData.dataVersion < CURRENT_VERSION;
    }
    
    /**
     * 迁移单个用户数据
     * 
     * @param oldData - 旧版用户数据
     * @returns 新版用户数据
     */
    public static migrateUserData(oldData: any): GroupUserCheckinData {
        const totalExp = oldData.totalPoints || 0;
        const balance = Math.floor(totalExp * BALANCE_RATE);
        
        // 计算等级
        const levelInfo = calculateLevel(totalExp);
        
        // 转换旧的历史记录
        const transactionLog: TransactionRecord[] = [];
        
        if (oldData.pointsHistory && Array.isArray(oldData.pointsHistory)) {
            // 转换旧版积分历史为新版交易记录
            for (const oldRecord of oldData.pointsHistory) {
                transactionLog.push({
                    id: generateUUID(),
                    timestamp: oldRecord.timestamp || Date.now(),
                    date: oldRecord.date || formatDate(new Date()),
                    time: oldRecord.time || formatTime(new Date()),
                    type: oldRecord.type || 'other',
                    expChange: oldRecord.points > 0 ? oldRecord.points : 0,
                    balanceChange: oldRecord.points,
                    expBefore: 0,  // 旧数据无法准确计算
                    expAfter: 0,
                    balanceBefore: oldRecord.balance - oldRecord.points,
                    balanceAfter: oldRecord.balance,
                    description: oldRecord.description || '历史记录',
                    operatorId: oldRecord.operatorId,
                });
            }
        }
        
        // 添加迁移记录
        transactionLog.unshift({
            id: generateUUID(),
            timestamp: Date.now(),
            date: formatDate(new Date()),
            time: formatTime(new Date()),
            type: 'admin',
            expChange: 0,
            balanceChange: balance,
            expBefore: totalExp,
            expAfter: totalExp,
            balanceBefore: 0,
            balanceAfter: balance,
            description: `系统升级赠送启动资金（原积分${totalExp}的20%）`,
        });
        
        const newData: GroupUserCheckinData = {
            // 基础信息
            userId: oldData.userId,
            nickname: oldData.nickname,
            
            // 双轨制积分
            totalExp: totalExp,
            balance: balance,
            
            // 等级信息
            level: levelInfo.level,
            levelName: levelInfo.name,
            levelIcon: levelInfo.icon,
            
            // 称号信息
            equippedTitleId: undefined,
            titles: [] as UserTitle[],
            
            // 统计数据
            totalCheckinDays: oldData.totalCheckinDays || 0,
            consecutiveDays: oldData.consecutiveDays || 0,
            lastCheckinDate: oldData.lastCheckinDate || '',
            checkinHistory: oldData.checkinHistory || [],
            
            // 交易流水
            transactionLog: transactionLog,
            
            // 数据版本
            dataVersion: CURRENT_VERSION,
            migratedAt: formatDate(new Date()),
        };
        
        return newData;
    }
    
    /**
     * 迁移整个群的数据
     * 
     * @param groupId - 群ID
     * @returns 迁移结果统计
     */
    public static async migrateGroupData(groupId: string): Promise<MigrationResult> {
        const result: MigrationResult = {
            success: true,
            totalUsers: 0,
            migratedUsers: 0,
            errors: [],
            details: {
                totalOldPoints: 0,
                totalNewExp: 0,
                totalNewBalance: 0,
            },
        };
        
        try {
            pluginState.logger.info(`[数据迁移] 开始迁移群 ${groupId} 的数据...`);
            
            const filename = `${GROUP_DATA_PREFIX}${groupId}.json`;
            const groupData = pluginState.loadDataFile<{
                users: Record<string, any>;
            }>(filename, { users: {} });
            
            result.totalUsers = Object.keys(groupData.users).length;
            
            for (const [userId, oldUserData] of Object.entries(groupData.users)) {
                try {
                    // 检查是否需要迁移
                    if (!this.checkMigrationNeeded(oldUserData)) {
                        pluginState.logger.debug(`[数据迁移] 用户 ${userId} 已是新版数据，跳过`);
                        continue;
                    }
                    
                    // 统计旧数据
                    result.details.totalOldPoints += oldUserData.totalPoints || 0;
                    
                    // 执行迁移
                    const newUserData = this.migrateUserData(oldUserData);
                    
                    // 统计新数据
                    result.details.totalNewExp += newUserData.totalExp;
                    result.details.totalNewBalance += newUserData.balance;
                    
                    // 保存新数据
                    groupData.users[userId] = newUserData;
                    result.migratedUsers++;
                    
                    pluginState.logger.info(
                        `[数据迁移] 用户 ${newUserData.nickname}(${userId}): ` +
                        `Exp=${newUserData.totalExp}, Balance=${newUserData.balance}, Level=${newUserData.level}`
                    );
                    
                } catch (error) {
                    result.errors.push({ userId, error: String(error) });
                    pluginState.logger.error(`[数据迁移] 用户 ${userId} 迁移失败:`, error);
                }
            }
            
            // 保存迁移后的数据
            pluginState.saveDataFile(filename, groupData);
            
            pluginState.logger.info(
                `[数据迁移] 群 ${groupId} 迁移完成: ` +
                `${result.migratedUsers}/${result.totalUsers} 个用户已迁移, ` +
                `${result.errors.length} 个错误`
            );
            
        } catch (error) {
            result.success = false;
            pluginState.logger.error(`[数据迁移] 群 ${groupId} 迁移失败:`, error);
        }
        
        return result;
    }
    
    /**
     * 批量迁移所有群
     * 
     * @returns 各群的迁移结果
     */
    public static async migrateAllGroups(): Promise<Record<string, MigrationResult>> {
        const results: Record<string, MigrationResult> = {};
        
        // 获取所有群数据文件
        const fs = await import('fs');
        const path = await import('path');
        const dataPath = pluginState.ctx?.dataPath || './data';
        
        try {
            const files = fs.readdirSync(dataPath);
            const groupFiles = files.filter(f => f.startsWith(GROUP_DATA_PREFIX) && f.endsWith('.json'));
            
            for (const file of groupFiles) {
                const groupId = file.replace(GROUP_DATA_PREFIX, '').replace('.json', '');
                results[groupId] = await this.migrateGroupData(groupId);
            }
            
        } catch (error) {
            pluginState.logger.error('[数据迁移] 批量迁移失败:', error);
        }
        
        return results;
    }
    
    /**
     * 回滚迁移（应急使用）
     * 
     * 注意：此操作会从备份文件恢复数据，请谨慎使用
     * 
     * @param groupId - 群ID
     */
    public static async rollbackMigration(groupId: string): Promise<boolean> {
        try {
            pluginState.logger.warn(`[数据迁移] 开始回滚群 ${groupId} 的迁移...`);
            
            const filename = `${GROUP_DATA_PREFIX}${groupId}.json`;
            const backupFile = `${filename}.backup`;
            
            // 尝试从备份恢复
            const restored = pluginState.restoreDataFile(filename);
            
            if (restored) {
                pluginState.logger.info(`[数据迁移] 群 ${groupId} 回滚成功`);
                return true;
            } else {
                pluginState.logger.error(`[数据迁移] 群 ${groupId} 回滚失败：找不到备份文件`);
                return false;
            }
            
        } catch (error) {
            pluginState.logger.error(`[数据迁移] 群 ${groupId} 回滚失败:`, error);
            return false;
        }
    }
    
    /**
     * 获取迁移统计信息
     * 
     * @param groupId - 群ID
     * @returns 统计信息
     */
    public static async getMigrationStats(groupId: string): Promise<{
        totalUsers: number;
        migratedUsers: number;
        pendingUsers: number;
    }> {
        try {
            const filename = `${GROUP_DATA_PREFIX}${groupId}.json`;
            const groupData = pluginState.loadDataFile<{
                users: Record<string, any>;
            }>(filename, { users: {} });
            
            const totalUsers = Object.keys(groupData.users).length;
            let migratedUsers = 0;
            
            for (const userData of Object.values(groupData.users)) {
                if (!this.checkMigrationNeeded(userData)) {
                    migratedUsers++;
                }
            }
            
            return {
                totalUsers,
                migratedUsers,
                pendingUsers: totalUsers - migratedUsers,
            };
            
        } catch (error) {
            return { totalUsers: 0, migratedUsers: 0, pendingUsers: 0 };
        }
    }
}
