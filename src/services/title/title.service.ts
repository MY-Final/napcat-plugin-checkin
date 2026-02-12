/**
 * 称号管理服务
 * 
 * 职责：
 * - 管理用户称号的获取、佩戴、卸下
 * - 检查称号获取条件
 * - 处理称号过期
 */

import { pluginState } from '../../core/state';
import type { GroupUserCheckinData, UserTitle, TitleDefinition } from '../../types';
import { DEFAULT_TITLES } from '../../config/level-config';

// ==================== 常量定义 ====================

const GROUP_DATA_PREFIX = 'checkin-group-';

// ==================== 服务类 ====================

export class TitleService {
    
    /**
     * 获取所有可用的称号定义
     *
     * @returns 称号定义列表
     */
    public static getAllTitles(): TitleDefinition[] {
        return DEFAULT_TITLES;
    }

    /**
     * 获取群的称号列表
     *
     * 目前使用默认称号配置，后续可支持群自定义称号
     *
     * @param groupId - 群ID
     * @returns 称号定义列表
     */
    public static getGroupTitles(groupId: string): TitleDefinition[] {
        // 目前返回默认称号，后续可以从群配置中读取自定义称号
        return DEFAULT_TITLES;
    }
    
    /**
     * 获取指定ID的称号定义
     * 
     * @param titleId - 称号ID
     * @returns 称号定义，未找到返回 undefined
     */
    public static getTitleById(titleId: string): TitleDefinition | undefined {
        return DEFAULT_TITLES.find(t => t.id === titleId);
    }
    
    /**
     * 检查用户是否满足称号获取条件
     * 
     * @param userData - 用户数据
     * @param title - 称号定义
     * @returns 是否满足条件
     */
    public static checkTitleAcquisition(
        userData: GroupUserCheckinData,
        title: TitleDefinition
    ): boolean {
        switch (title.acquireType) {
            case 'level':
                return userData.level >= Number(title.acquireCondition);
                
            case 'exp':
                return userData.totalExp >= Number(title.acquireCondition);
                
            case 'days':
                return userData.totalCheckinDays >= Number(title.acquireCondition);
                
            case 'activity':
                // 活跃度可以通过其他方式计算
                return false; // 需要自定义逻辑
                
            case 'special':
                // 特殊条件需要自定义逻辑
                return false;
                
            case 'purchase':
                // 购买类型需要消费接口支持
                return false;
                
            default:
                return false;
        }
    }
    
    /**
     * 授予称号给用户
     * 
     * @param groupId - 群ID
     * @param userId - 用户ID
     * @param titleId - 称号ID
     * @returns 操作结果
     */
    public static async awardTitle(
        groupId: string,
        userId: string,
        titleId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const title = this.getTitleById(titleId);
            if (!title) {
                return { success: false, error: `称号 ${titleId} 不存在` };
            }
            
            const userData = await this.loadGroupUserData(groupId, userId);
            
            // 检查是否已获得
            const alreadyHas = userData.titles.some(t => t.titleId === titleId);
            if (alreadyHas) {
                return { success: false, error: '用户已获得该称号' };
            }
            
            // 计算过期时间
            let expiresAt: string | undefined;
            if (title.expireDays > 0) {
                const expireDate = new Date();
                expireDate.setDate(expireDate.getDate() + title.expireDays);
                expiresAt = expireDate.toISOString().split('T')[0];
            }
            
            // 添加称号
            userData.titles.push({
                titleId: titleId,
                acquiredAt: new Date().toISOString().split('T')[0],
                expiresAt: expiresAt,
                isEquipped: false,
            });
            
            await this.saveGroupUserData(groupId, userData);
            
            pluginState.logger.info(
                `[称号授予] 群 ${groupId} 用户 ${userData.nickname}(${userId}) ` +
                `获得称号「${title.name}」${expiresAt ? `(有效期至 ${expiresAt})` : '(永久)'}`
            );
            
            return { success: true };
            
        } catch (error) {
            pluginState.logger.error('[称号授予] 失败:', error);
            return { success: false, error: String(error) };
        }
    }
    
    /**
     * 佩戴称号
     * 
     * @param groupId - 群ID
     * @param userId - 用户ID
     * @param titleId - 称号ID（null 表示卸下所有称号）
     * @returns 操作结果
     */
    public static async equipTitle(
        groupId: string,
        userId: string,
        titleId: string | null
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const userData = await this.loadGroupUserData(groupId, userId);
            
            if (titleId === null) {
                // 卸下所有称号
                userData.equippedTitleId = undefined;
                for (const title of userData.titles) {
                    title.isEquipped = false;
                }
            } else {
                // 检查是否拥有该称号
                const userTitle = userData.titles.find(t => t.titleId === titleId);
                if (!userTitle) {
                    return { success: false, error: '用户未拥有该称号' };
                }
                
                // 检查是否过期
                if (this.isTitleExpired(userTitle)) {
                    return { success: false, error: '该称号已过期' };
                }
                
                // 卸下之前的称号
                for (const title of userData.titles) {
                    title.isEquipped = false;
                }
                
                // 佩戴新称号
                userTitle.isEquipped = true;
                userData.equippedTitleId = titleId;
                
                const titleDef = this.getTitleById(titleId);
                pluginState.logger.info(
                    `[称号佩戴] 群 ${groupId} 用户 ${userData.nickname}(${userId}) ` +
                    `佩戴称号「${titleDef?.name || titleId}」`
                );
            }
            
            await this.saveGroupUserData(groupId, userData);
            return { success: true };
            
        } catch (error) {
            pluginState.logger.error('[称号佩戴] 失败:', error);
            return { success: false, error: String(error) };
        }
    }
    
    /**
     * 卸下称号
     * 
     * @param groupId - 群ID
     * @param userId - 用户ID
     * @returns 操作结果
     */
    public static async unequipTitle(
        groupId: string,
        userId: string
    ): Promise<{ success: boolean; error?: string }> {
        return this.equipTitle(groupId, userId, null);
    }
    
    /**
     * 检查称号是否过期
     * 
     * @param title - 用户称号实例
     * @returns 是否过期
     */
    public static isTitleExpired(title: UserTitle): boolean {
        if (!title.expiresAt) return false;
        return new Date(title.expiresAt) < new Date();
    }
    
    /**
     * 清理过期称号
     * 
     * @param groupId - 群ID
     * @param userId - 用户ID
     * @returns 清理的称号数量
     */
    public static async cleanExpiredTitles(
        groupId: string,
        userId: string
    ): Promise<number> {
        try {
            const userData = await this.loadGroupUserData(groupId, userId);
            const originalCount = userData.titles.length;
            
            // 过滤掉过期称号
            userData.titles = userData.titles.filter(title => {
                const expired = this.isTitleExpired(title);
                if (expired && title.isEquipped) {
                    // 如果正在佩戴的称号过期了，卸下它
                    userData.equippedTitleId = undefined;
                }
                return !expired;
            });
            
            await this.saveGroupUserData(groupId, userData);
            
            const cleanedCount = originalCount - userData.titles.length;
            if (cleanedCount > 0) {
                pluginState.logger.info(
                    `[称号清理] 群 ${groupId} 用户 ${userId} 清理了 ${cleanedCount} 个过期称号`
                );
            }
            
            return cleanedCount;
            
        } catch (error) {
            pluginState.logger.error('[称号清理] 失败:', error);
            return 0;
        }
    }
    
    /**
     * 获取用户的称号列表
     * 
     * @param groupId - 群ID
     * @param userId - 用户ID
     * @returns 称号列表（包含定义信息）
     */
    public static async getUserTitles(
        groupId: string,
        userId: string
    ): Promise<Array<{ userTitle: UserTitle; definition: TitleDefinition }>> {
        try {
            const userData = await this.loadGroupUserData(groupId, userId);
            
            return userData.titles
                .map(userTitle => {
                    const definition = this.getTitleById(userTitle.titleId);
                    if (!definition) return null;
                    return { userTitle, definition };
                })
                .filter((item): item is { userTitle: UserTitle; definition: TitleDefinition } => 
                    item !== null
                );
                
        } catch (error) {
            pluginState.logger.error('[获取称号] 失败:', error);
            return [];
        }
    }
    
    /**
     * 获取用户当前佩戴的称号
     * 
     * @param groupId - 群ID
     * @param userId - 用户ID
     * @returns 称号定义，未佩戴返回 undefined
     */
    public static async getEquippedTitle(
        groupId: string,
        userId: string
    ): Promise<TitleDefinition | undefined> {
        try {
            const userData = await this.loadGroupUserData(groupId, userId);
            if (!userData.equippedTitleId) return undefined;
            
            return this.getTitleById(userData.equippedTitleId);
            
        } catch (error) {
            return undefined;
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
