/**
 * 等级核心服务
 * 
 * 职责：
 * - 根据 totalExp 计算等级
 * - 管理等级特权
 * - 处理升级逻辑
 * - 等级称号授予
 */

import { pluginState } from '../../core/state';
import type { GroupUserCheckinData, LevelInfo, LevelUpInfo } from '../../types';
import { 
    LEVEL_CONFIG, 
    calculateLevel as configCalculateLevel,
    getExpToNextLevel,
    DEFAULT_TITLES 
} from '../../config/level-config';

// ==================== 常量定义 ====================

const GROUP_DATA_PREFIX = 'checkin-group-';

// ==================== 服务类 ====================

export class LevelCoreService {
    
    /**
     * 计算等级信息
     * 
     * @param totalExp - 累计经验值
     * @returns 等级信息对象
     */
    public static calculateLevel(totalExp: number): LevelInfo {
        return configCalculateLevel(totalExp);
    }
    
    /**
     * 获取升级所需经验值
     * 
     * @param currentExp - 当前经验值
     * @returns 还需多少经验升级（已满级返回 undefined）
     */
    public static getExpToNextLevel(currentExp: number): number | undefined {
        return getExpToNextLevel(currentExp);
    }
    
    /**
     * 检查是否升级
     * 
     * @param oldExp - 升级前经验值
     * @param newExp - 升级后经验值
     * @returns 升级信息（如果升级了），否则返回 null
     */
    public static checkLevelUp(oldExp: number, newExp: number): LevelUpInfo | null {
        const oldLevel = this.calculateLevel(oldExp);
        const newLevel = this.calculateLevel(newExp);
        
        if (newLevel.level > oldLevel.level) {
            // 计算升级奖励
            const rewards: LevelUpInfo['rewards'] = {};
            
            // 每升一级奖励 50 余额
            rewards.balance = (newLevel.level - oldLevel.level) * 50;
            
            return {
                levelUp: true,
                oldLevel: oldLevel.level,
                newLevel: newLevel.level,
                newLevelName: newLevel.name,
                rewards: rewards,
            };
        }
        
        return null;
    }
    
    /**
     * 检查并授予等级称号
     * 
     * 当用户升级时调用，自动授予对应等级的称号
     * 
     * @param groupId - 群ID
     * @param userId - 用户ID
     * @param level - 当前等级
     */
    public static async checkAndAwardLevelTitles(
        groupId: string,
        userId: string,
        level: number
    ): Promise<void> {
        try {
            const userData = await this.loadGroupUserData(groupId, userId);
            
            // 检查所有可获得的称号
            for (const title of DEFAULT_TITLES) {
                if (title.acquireType === 'level') {
                    const requiredLevel = Number(title.acquireCondition);
                    if (level >= requiredLevel) {
                        // 检查是否已获得
                        const alreadyHas = userData.titles.some(t => t.titleId === title.id);
                        if (!alreadyHas) {
                            // 授予称号
                            userData.titles.push({
                                titleId: title.id,
                                acquiredAt: new Date().toISOString().split('T')[0],
                                isEquipped: false,
                            });
                            
                            pluginState.logger.info(
                                `[称号授予] 用户 ${userData.nickname}(${userId}) ` +
                                `获得称号「${title.name}」`
                            );
                        }
                    }
                }
            }
            
            await this.saveGroupUserData(groupId, userData);
            
        } catch (error) {
            pluginState.logger.error('[称号检查] 失败:', error);
        }
    }
    
    /**
     * 获取等级特权
     * 
     * @param level - 等级
     * @returns 该等级的所有特权
     */
    public static getLevelPrivileges(level: number): {
        signinBonus: number;
    } {
        const levelConfig = LEVEL_CONFIG.find(l => l.level === level);
        return levelConfig?.privileges || { signinBonus: 0 };
    }
    
    /**
     * 计算签到加成后的积分
     * 
     * @param basePoints - 基础积分
     * @param level - 用户等级
     * @returns 加成后的总积分
     */
    public static calculatePointsWithBonus(basePoints: number, level: number): number {
        const privileges = this.getLevelPrivileges(level);
        return basePoints + privileges.signinBonus;
    }
    
    /**
     * 获取等级配置列表
     */
    public static getLevelConfig(): typeof LEVEL_CONFIG {
        return LEVEL_CONFIG;
    }

    /**
     * 获取用户等级信息
     *
     * @param groupId - 群ID
     * @param userId - 用户ID
     * @returns 用户等级信息
     */
    public static async getUserLevelInfo(
        groupId: string,
        userId: string
    ): Promise<{
        userId: string;
        nickname: string;
        level: number;
        levelName: string;
        levelIcon: string;
        totalExp: number;
        nextLevelExp: number | undefined;
        expToNextLevel: number | undefined;
        privileges: { signinBonus: number };
    } | null> {
        try {
            const userData = await this.loadGroupUserData(groupId, userId);
            const levelInfo = this.calculateLevel(userData.totalExp);

            return {
                userId: userData.userId,
                nickname: userData.nickname,
                level: levelInfo.level,
                levelName: levelInfo.name,
                levelIcon: levelInfo.icon,
                totalExp: userData.totalExp,
                nextLevelExp: levelInfo.nextLevelExp,
                expToNextLevel: levelInfo.nextLevelExp
                    ? levelInfo.nextLevelExp - userData.totalExp
                    : undefined,
                privileges: levelInfo.privileges,
            };
        } catch (error) {
            pluginState.logger.error('[获取等级信息] 失败:', error);
            return null;
        }
    }

    // ==================== 私有方法 ====================
    
    /**
     * 加载群内用户数据
     */
    private static async loadGroupUserData(
        groupId: string,
        userId: string
    ): Promise<GroupUserCheckinData> {
        const filename = `${GROUP_DATA_PREFIX}${groupId}.json`;
        const groupData = pluginState.loadDataFile<{
            users: Record<string, GroupUserCheckinData>;
        }>(filename, { users: {} });
        
        if (!groupData.users[userId]) {
            throw new Error(`用户 ${userId} 在群 ${groupId} 中不存在`);
        }
        
        return groupData.users[userId];
    }
    
    /**
     * 保存群内用户数据
     */
    private static async saveGroupUserData(
        groupId: string,
        userData: GroupUserCheckinData
    ): Promise<void> {
        const filename = `${GROUP_DATA_PREFIX}${groupId}.json`;
        const groupData = pluginState.loadDataFile<{
            users: Record<string, GroupUserCheckinData>;
        }>(filename, { users: {} });
        
        groupData.users[userData.userId] = userData;
        pluginState.saveDataFile(filename, groupData);
    }
}
