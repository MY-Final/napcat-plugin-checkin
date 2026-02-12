/**
 * 核心积分服务
 * 
 * 提供双轨制积分（totalExp/balance）的原子操作
 * 确保数据一致性和完整性
 * 
 * 设计原则：
 * - 高内聚：所有积分操作集中在此
 * - 低耦合：不依赖具体业务场景
 */

import { pluginState } from '../../core/state';
import type {
    GroupUserCheckinData,
    AwardPointsParams,
    ConsumePointsParams,
    AwardResult,
    ConsumeResult,
    CheckBalanceResult,
    UserPointsInfo,
    TransactionRecord,
} from '../../types';
import { calculateLevel, calculateSigninBonus } from '../../config/level-config';
import { LevelCoreService } from '../level/level-core.service';

// ==================== 常量定义 ====================

const GROUP_DATA_PREFIX = 'checkin-group-';
const DATA_VERSION = 2;

// ==================== 辅助函数 ====================

/**
 * 生成唯一ID
 */
function generateUUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * 格式化时间
 */
function formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0];
}

// ==================== 核心服务类 ====================

export class PointsCoreService {
    
    /**
     * 奖励积分（增加 totalExp 和 balance）
     * 
     * 场景：签到、活动奖励、管理员奖励
     * 
     * @param groupId - 群ID
     * @param userId - 用户ID
     * @param params - 奖励参数
     * @returns 操作结果
     */
    public static async awardPoints(
        groupId: string,
        userId: string,
        params: AwardPointsParams
    ): Promise<AwardResult> {
        try {
            // 1. 检查幂等性
            if (params.idempotencyKey) {
                const existing = await this.findTransactionByIdempotencyKey(
                    groupId,
                    userId,
                    params.idempotencyKey
                );
                if (existing) {
                    // 重复请求，返回之前的结果
                    return {
                        success: true,
                        awarded: existing.details?.awarded as AwardResult['awarded'],
                        newExp: existing.expAfter,
                        newBalance: existing.balanceAfter,
                        newLevel: existing.details?.newLevel as number,
                        levelUp: false,
                        transactionId: existing.id,
                    };
                }
            }
            
            // 2. 加载用户数据
            const userData = await this.loadGroupUserData(groupId, userId);
            const oldExp = userData.totalExp;
            const oldBalance = userData.balance;
            const oldLevel = userData.level;
            
            // 3. 计算奖励
            let baseAmount = params.amount;
            let levelBonus = 0;
            
            if (params.applyLevelBonus !== false) {
                levelBonus = calculateSigninBonus(0, userData.level);
            }
            
            if (params.multiplier && params.multiplier > 1) {
                baseAmount = Math.floor(baseAmount * params.multiplier);
            }
            
            const totalAmount = baseAmount + levelBonus;
            
            // 4. 更新积分
            userData.totalExp += totalAmount;
            userData.balance += totalAmount;
            
            // 5. 检查升级
            const newLevelInfo = calculateLevel(userData.totalExp);
            const levelUp = newLevelInfo.level > oldLevel;
            
            if (levelUp) {
                userData.level = newLevelInfo.level;
                userData.levelName = newLevelInfo.name;
                userData.levelIcon = newLevelInfo.icon;
                
                // 检查是否获得新称号
                await LevelCoreService.checkAndAwardLevelTitles(groupId, userId, newLevelInfo.level);
            }
            
            // 6. 创建交易记录
            const transaction: TransactionRecord = {
                id: generateUUID(),
                timestamp: Date.now(),
                date: formatDate(new Date()),
                time: formatTime(new Date()),
                type: params.source,
                expChange: totalAmount,
                balanceChange: totalAmount,
                expBefore: oldExp,
                expAfter: userData.totalExp,
                balanceBefore: oldBalance,
                balanceAfter: userData.balance,
                description: params.description,
                details: {
                    awarded: {
                        base: baseAmount,
                        levelBonus: levelBonus,
                        total: totalAmount,
                    },
                    newLevel: newLevelInfo.level,
                    levelUp: levelUp,
                },
                operatorId: params.source === 'admin' ? params.userId : undefined,
                relatedPlugin: params.relatedPlugin,
                idempotencyKey: params.idempotencyKey,
            };
            
            userData.transactionLog.unshift(transaction);
            
            // 7. 保存数据
            await this.saveGroupUserData(groupId, userData);
            
            pluginState.logger.info(
                `[积分奖励] 用户 ${userData.nickname}(${userId}) 在群 ${groupId} ` +
                `获得 ${totalAmount} 积分（基础${baseAmount} + 等级加成${levelBonus}）` +
                `${levelUp ? `，升级到Lv.${newLevelInfo.level}` : ''}`
            );
            
            return {
                success: true,
                awarded: {
                    base: baseAmount,
                    levelBonus: levelBonus,
                    total: totalAmount,
                },
                newExp: userData.totalExp,
                newBalance: userData.balance,
                newLevel: newLevelInfo.level,
                newLevelName: newLevelInfo.name,
                levelUp: levelUp,
                transactionId: transaction.id,
            };
            
        } catch (error) {
            pluginState.logger.error('[积分奖励] 失败:', error);
            return {
                success: false,
                awarded: { base: 0, levelBonus: 0, total: 0 },
                newExp: 0,
                newBalance: 0,
                newLevel: 1,
                levelUp: false,
                transactionId: '',
                error: String(error),
            };
        }
    }
    
    /**
     * 消费积分（只扣除 balance，不影响 totalExp）
     * 
     * 场景：购买道具、发红包、兑换头衔
     * 
     * @param groupId - 群ID
     * @param userId - 用户ID
     * @param params - 消费参数
     * @returns 操作结果
     */
    public static async consumePoints(
        groupId: string,
        userId: string,
        params: ConsumePointsParams
    ): Promise<ConsumeResult> {
        try {
            // 1. 检查幂等性
            if (params.idempotencyKey) {
                const existing = await this.findTransactionByIdempotencyKey(
                    groupId,
                    userId,
                    params.idempotencyKey
                );
                if (existing) {
                    return {
                        success: true,
                        consumed: -existing.balanceChange,
                        newBalance: existing.balanceAfter,
                        expUnchanged: existing.expAfter,
                        transactionId: existing.id,
                    };
                }
            }
            
            // 2. 加载用户数据
            const userData = await this.loadGroupUserData(groupId, userId);
            
            // 3. 检查余额
            if (userData.balance < params.amount) {
                return {
                    success: false,
                    consumed: 0,
                    newBalance: userData.balance,
                    expUnchanged: userData.totalExp,
                    transactionId: '',
                    error: `余额不足，当前余额 ${userData.balance}，需要 ${params.amount}`,
                };
            }
            
            const oldBalance = userData.balance;
            const oldExp = userData.totalExp;
            
            // 4. 扣除余额
            userData.balance -= params.amount;
            
            // 5. 创建交易记录
            const transaction: TransactionRecord = {
                id: generateUUID(),
                timestamp: Date.now(),
                date: formatDate(new Date()),
                time: formatTime(new Date()),
                type: 'consume',
                expChange: 0,
                balanceChange: -params.amount,
                expBefore: oldExp,
                expAfter: oldExp,
                balanceBefore: oldBalance,
                balanceAfter: userData.balance,
                description: params.description,
                operatorId: params.operatorId,
                relatedOrderId: params.orderId,
                relatedPlugin: params.relatedPlugin,
                idempotencyKey: params.idempotencyKey,
            };
            
            userData.transactionLog.unshift(transaction);
            
            // 6. 保存数据
            await this.saveGroupUserData(groupId, userData);
            
            pluginState.logger.info(
                `[积分消费] 用户 ${userData.nickname}(${userId}) 在群 ${groupId} ` +
                `消费 ${params.amount} 积分，余额 ${userData.balance}`
            );
            
            return {
                success: true,
                consumed: params.amount,
                newBalance: userData.balance,
                expUnchanged: userData.totalExp,
                transactionId: transaction.id,
            };
            
        } catch (error) {
            pluginState.logger.error('[积分消费] 失败:', error);
            return {
                success: false,
                consumed: 0,
                newBalance: 0,
                expUnchanged: 0,
                transactionId: '',
                error: String(error),
            };
        }
    }
    
    /**
     * 检查余额是否充足
     */
    public static async checkBalance(
        groupId: string,
        userId: string,
        requiredAmount: number
    ): Promise<CheckBalanceResult> {
        try {
            const userData = await this.loadGroupUserData(groupId, userId);
            const sufficient = userData.balance >= requiredAmount;
            
            return {
                balance: userData.balance,
                sufficient: sufficient,
                required: requiredAmount,
                shortfall: sufficient ? undefined : requiredAmount - userData.balance,
            };
        } catch (error) {
            pluginState.logger.error('[余额检查] 失败:', error);
            return {
                balance: 0,
                sufficient: false,
                required: requiredAmount,
                shortfall: requiredAmount,
            };
        }
    }
    
    /**
     * 获取用户积分信息
     */
    public static async getUserPoints(
        groupId: string,
        userId: string
    ): Promise<UserPointsInfo | null> {
        try {
            const userData = await this.loadGroupUserData(groupId, userId);
            
            return {
                userId: userData.userId,
                nickname: userData.nickname,
                totalExp: userData.totalExp,
                balance: userData.balance,
                level: userData.level,
                levelName: userData.levelName,
                levelIcon: userData.levelIcon,
                equippedTitle: userData.equippedTitleId,
            };
        } catch (error) {
            return null;
        }
    }
    
    /**
     * 转账（同群用户间）
     */
    public static async transferPoints(
        groupId: string,
        fromUserId: string,
        toUserId: string,
        amount: number,
        description: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // 不能转给自己
            if (fromUserId === toUserId) {
                return { success: false, error: '不能转账给自己' };
            }
            
            // 加载双方数据
            const fromUser = await this.loadGroupUserData(groupId, fromUserId);
            const toUser = await this.loadGroupUserData(groupId, toUserId);
            
            // 检查余额
            if (fromUser.balance < amount) {
                return { success: false, error: '余额不足' };
            }
            
            const now = new Date();
            const idempotencyKey = `transfer-${fromUserId}-${toUserId}-${Date.now()}`;
            
            // 扣除转出方
            fromUser.balance -= amount;
            fromUser.transactionLog.unshift({
                id: generateUUID(),
                timestamp: Date.now(),
                date: formatDate(now),
                time: formatTime(now),
                type: 'transfer',
                expChange: 0,
                balanceChange: -amount,
                expBefore: fromUser.totalExp,
                expAfter: fromUser.totalExp,
                balanceBefore: fromUser.balance + amount,
                balanceAfter: fromUser.balance,
                description: `转账给 ${toUser.nickname}: ${description}`,
                idempotencyKey,
            });
            
            // 增加转入方
            toUser.balance += amount;
            toUser.transactionLog.unshift({
                id: generateUUID(),
                timestamp: Date.now(),
                date: formatDate(now),
                time: formatTime(now),
                type: 'receive',
                expChange: 0,
                balanceChange: amount,
                expBefore: toUser.totalExp,
                expAfter: toUser.totalExp,
                balanceBefore: toUser.balance - amount,
                balanceAfter: toUser.balance,
                description: `收到 ${fromUser.nickname} 的转账: ${description}`,
                idempotencyKey,
            });
            
            // 保存数据
            await this.saveGroupUserData(groupId, fromUser);
            await this.saveGroupUserData(groupId, toUser);
            
            pluginState.logger.info(
                `[积分转账] ${fromUser.nickname} -> ${toUser.nickname} ${amount} 积分`
            );
            
            return { success: true };
            
        } catch (error) {
            pluginState.logger.error('[积分转账] 失败:', error);
            return { success: false, error: String(error) };
        }
    }
    
    // ==================== 私有方法 ====================

    /**
     * 加载群内用户数据
     * 
     * 注意：使用 checkin-service 的缓存机制保持一致性
     */
    private static async loadGroupUserData(
        groupId: string,
        userId: string
    ): Promise<GroupUserCheckinData> {
        // 使用 checkin-service 的缓存加载函数保持一致性
        const { loadGroupUsersData } = await import('../checkin-service');
        const groupUsers = loadGroupUsersData(groupId);
        const userData = groupUsers.get(userId);

        if (!userData) {
            throw new Error(`用户 ${userId} 在群 ${groupId} 中不存在`);
        }

        return userData;
    }

    /**
     * 保存群内用户数据
     * 
     * 注意：使用 checkin-service 的缓存机制保持一致性
     */
    private static async saveGroupUserData(
        groupId: string,
        userData: GroupUserCheckinData
    ): Promise<void> {
        // 使用 checkin-service 的缓存保存函数保持一致性
        const { loadGroupUsersData, saveGroupUsersData } = await import('../checkin-service');
        const groupUsers = loadGroupUsersData(groupId);
        groupUsers.set(userData.userId, userData);
        saveGroupUsersData(groupId);
    }
    
    /**
     * 通过幂等键查找交易记录
     */
    private static async findTransactionByIdempotencyKey(
        groupId: string,
        userId: string,
        idempotencyKey: string
    ): Promise<TransactionRecord | null> {
        try {
            const userData = await this.loadGroupUserData(groupId, userId);
            return userData.transactionLog.find(t => t.idempotencyKey === idempotencyKey) || null;
        } catch {
            return null;
        }
    }
}
