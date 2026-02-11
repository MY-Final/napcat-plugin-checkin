/**
 * API 服务模块
 * 注册 WebUI API 路由
 */

import type {
    NapCatPluginContext,
} from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';
import { 
    getUserCheckinData, 
    getTodayCheckinCount, 
    cleanupOldData, 
    getAllUsersData, 
    getGroupCheckinStats, 
    getAllGroupsStats, 
    getGroupAllUsersData, 
    getActiveRanking,
    getGroupUserPoints,
    updateGroupUserPoints,
    getGroupUserPointsHistory,
    resetGroupUserPoints
} from './checkin-service';
import { getLeaderboard } from './leaderboard-service';
import type { LeaderboardType } from '../types';

/**
 * 注册 API 路由
 */
export function registerApiRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    // ==================== 插件信息（无鉴权）====================

    /** 获取插件状态 */
    router.getNoAuth('/status', (_req, res) => {
        res.json({
            code: 0,
            data: {
                pluginName: ctx.pluginName,
                uptime: pluginState.getUptime(),
                uptimeFormatted: pluginState.getUptimeFormatted(),
                config: pluginState.config,
                stats: pluginState.stats,
            },
        });
    });

    // ==================== 配置管理（无鉴权）====================

    /** 获取配置 */
    router.getNoAuth('/config', (_req, res) => {
        res.json({ code: 0, data: pluginState.config });
    });

    /** 保存配置 */
    router.postNoAuth('/config', async (req, res) => {
        try {
            const body = req.body as Record<string, unknown> | undefined;
            if (!body) {
                return res.status(400).json({ code: -1, message: '请求体为空' });
            }
            pluginState.updateConfig(body as Partial<import('../types').PluginConfig>);
            ctx.logger.info('配置已保存');
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('保存配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ==================== 群管理（无鉴权）====================

    /** 获取群列表（附带各群启用状态） */
    router.getNoAuth('/groups', async (_req, res) => {
        try {
            const groups = await ctx.actions.call(
                'get_group_list',
                {},
                ctx.adapterName,
                ctx.pluginManager.config
            ) as Array<{ group_id: number; group_name: string; member_count: number; max_member_count: number }>;

            const groupsWithConfig = (groups || []).map((group) => {
                const groupId = String(group.group_id);
                const groupConfig = pluginState.config.groupConfigs[groupId] || {};
                return {
                    group_id: group.group_id,
                    group_name: group.group_name,
                    member_count: group.member_count,
                    max_member_count: group.max_member_count,
                    enabled: pluginState.isGroupEnabled(groupId),
                    enable_checkin: groupConfig.enableCheckin !== false, // 默认启用
                };
            });

            res.json({ code: 0, data: groupsWithConfig });
        } catch (e) {
            ctx.logger.error('获取群列表失败:', e);
            res.status(500).json({ code: -1, message: String(e) });
        }
    });

    /** 更新单个群配置 */
    router.postNoAuth('/groups/:id/config', async (req, res) => {
        try {
            const groupId = req.params?.id;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            const body = req.body as Record<string, unknown> | undefined;
            const enabled = body?.enabled;
            const enableCheckin = body?.enableCheckin;
            
            pluginState.updateGroupConfig(groupId, { 
                enabled: Boolean(enabled),
                enableCheckin: enableCheckin !== undefined ? Boolean(enableCheckin) : undefined,
            });
            ctx.logger.info(`群 ${groupId} 配置已更新`);
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('更新群配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 批量更新群配置 */
    router.postNoAuth('/groups/bulk-config', async (req, res) => {
        try {
            const body = req.body as Record<string, unknown> | undefined;
            const { enabled, enableCheckin, groupIds } = body || {};

            if (typeof enabled !== 'boolean' || !Array.isArray(groupIds)) {
                return res.status(400).json({ code: -1, message: '参数错误' });
            }

            for (const groupId of groupIds) {
                pluginState.updateGroupConfig(String(groupId), { 
                    enabled,
                    enableCheckin: enableCheckin !== undefined ? Boolean(enableCheckin) : undefined,
                });
            }

            ctx.logger.info(`批量更新群配置完成 | 数量: ${groupIds.length}`);
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('批量更新群配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ==================== 签到数据统计（无鉴权）====================

    /** 获取今日签到统计 */
    router.getNoAuth('/checkin/today-stats', (_req, res) => {
        try {
            const count = getTodayCheckinCount();
            res.json({
                code: 0,
                data: {
                    todayCheckins: count,
                },
            });
        } catch (err) {
            ctx.logger.error('获取今日签到统计失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取指定用户签到数据 */
    router.getNoAuth('/checkin/user/:id', (req, res) => {
        try {
            const userId = req.params?.id;
            if (!userId) {
                return res.status(400).json({ code: -1, message: '缺少用户 ID' });
            }

            const userData = getUserCheckinData(userId);
            if (!userData) {
                return res.json({ code: 0, data: null });
            }

            res.json({ code: 0, data: userData });
        } catch (err) {
            ctx.logger.error('获取用户签到数据失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 清理旧数据 */
    router.postNoAuth('/checkin/cleanup', (req, res) => {
        try {
            const body = req.body as { daysToKeep?: number } | undefined;
            const daysToKeep = body?.daysToKeep || 90;
            cleanupOldData(daysToKeep);
            res.json({ code: 0, message: '清理完成' });
        } catch (err) {
            ctx.logger.error('清理旧数据失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取全服排行榜（按积分排序） */
    router.getNoAuth('/checkin/ranking', (_req, res) => {
        try {
            const allUsers = getAllUsersData();
            const sortedUsers = Array.from(allUsers.values())
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .slice(0, 100)
                .map(user => ({
                    userId: user.userId,
                    nickname: user.nickname,
                    totalPoints: user.totalPoints,
                    totalCheckinDays: user.totalCheckinDays,
                    consecutiveDays: user.consecutiveDays,
                    lastCheckinDate: user.lastCheckinDate,
                }));

            res.json({
                code: 0,
                data: {
                    totalUsers: allUsers.size,
                    ranking: sortedUsers,
                },
            });
        } catch (err) {
            ctx.logger.error('获取排行榜失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取活跃排行榜（按活跃天数排序，识别忠实用户） */
    router.getNoAuth('/checkin/active-ranking', (_req, res) => {
        try {
            const ranking = getActiveRanking(100);
            const allUsers = getAllUsersData();

            res.json({
                code: 0,
                data: {
                    totalUsers: allUsers.size,
                    rankingType: 'active',
                    rankingDescription: '按使用天数排行，每天首次使用机器人计1天',
                    ranking: ranking,
                },
            });
        } catch (err) {
            ctx.logger.error('获取活跃排行失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取所有签到统计数据 */
    router.getNoAuth('/checkin/stats', (_req, res) => {
        try {
            const allUsers = getAllUsersData();
            
            // 计算统计数据
            const totalUsers = allUsers.size;
            const totalCheckins = Array.from(allUsers.values()).reduce((sum, user) => sum + user.totalCheckinDays, 0);
            const totalPoints = Array.from(allUsers.values()).reduce((sum, user) => sum + user.totalPoints, 0);
            const totalActiveDays = Array.from(allUsers.values()).reduce((sum, user) => sum + (user.activeDays || 0), 0);
            const todayCheckins = getTodayCheckinCount();
            
            // 获取活跃用户（最近7天签到过）
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
            const activeUsers = Array.from(allUsers.values()).filter(user => user.lastCheckinDate >= oneWeekAgoStr).length;

            res.json({
                code: 0,
                data: {
                    totalUsers,
                    totalCheckins,
                    totalPoints,
                    totalActiveDays,
                    todayCheckins,
                    activeUsers,
                },
            });
        } catch (err) {
            ctx.logger.error('获取统计数据失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取所有用户数据（用于管理） */
    router.getNoAuth('/checkin/users', (_req, res) => {
        try {
            const allUsers = getAllUsersData();
            const usersList = Array.from(allUsers.values()).map(user => ({
                userId: user.userId,
                nickname: user.nickname,
                totalPoints: user.totalPoints,
                totalCheckinDays: user.totalCheckinDays,
                consecutiveDays: user.consecutiveDays,
                lastCheckinDate: user.lastCheckinDate,
            }));

            res.json({
                code: 0,
                data: usersList,
            });
        } catch (err) {
            ctx.logger.error('获取用户列表失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ==================== 群签到统计（无鉴权）====================

    /** 获取所有群的签到统计 */
    router.getNoAuth('/checkin/groups', (_req, res) => {
        try {
            const groupsStats = getAllGroupsStats();
            res.json({
                code: 0,
                data: groupsStats,
            });
        } catch (err) {
            ctx.logger.error('获取群统计失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取指定群的签到统计 */
    router.getNoAuth('/checkin/groups/:id', (req, res) => {
        try {
            const groupId = req.params?.id;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            const stats = getGroupCheckinStats(groupId);
            res.json({
                code: 0,
                data: stats,
            });
        } catch (err) {
            ctx.logger.error('获取群统计失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取指定群的积分排行 */
    router.getNoAuth('/checkin/groups/:id/ranking', (req, res) => {
        try {
            const groupId = req.params?.id;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            const groupUsers = getGroupAllUsersData(groupId);
            
            const sortedUsers = Array.from(groupUsers.values())
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .slice(0, 100)
                .map(user => ({
                    userId: user.userId,
                    nickname: user.nickname,
                    totalPoints: user.totalPoints,
                    totalCheckinDays: user.totalCheckinDays,
                    consecutiveDays: user.consecutiveDays,
                    lastCheckinDate: user.lastCheckinDate,
                }));

            res.json({
                code: 0,
                data: {
                    groupId,
                    totalUsers: groupUsers.size,
                    ranking: sortedUsers,
                },
            });
        } catch (err) {
            ctx.logger.error('获取群内排行失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ==================== 群用户积分管理（无鉴权）====================

    /** 获取群用户积分 */
    router.getNoAuth('/checkin/groups/:groupId/users/:userId/points', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;
            
            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            const userPoints = getGroupUserPoints(groupId, userId);
            if (!userPoints) {
                return res.status(404).json({ code: -1, message: '用户不存在' });
            }

            res.json({
                code: 0,
                data: userPoints,
            });
        } catch (err) {
            ctx.logger.error('获取用户积分失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 修改群用户积分（增加/减少） */
    router.postNoAuth('/checkin/groups/:groupId/users/:userId/points', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;
            const body = req.body as { 
                points: number; 
                description: string; 
                type?: 'signin' | 'admin' | 'exchange' | 'other';
                operatorId?: string;
            } | undefined;
            
            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            if (!body || typeof body.points !== 'number') {
                return res.status(400).json({ code: -1, message: '缺少points参数' });
            }

            if (!body.description) {
                return res.status(400).json({ code: -1, message: '缺少description参数' });
            }

            const result = updateGroupUserPoints(
                groupId,
                userId,
                body.points,
                body.description,
                body.type || 'other',
                body.operatorId
            );

            if (!result.success) {
                return res.status(400).json({ code: -1, message: result.error });
            }

            res.json({
                code: 0,
                data: {
                    userId,
                    groupId,
                    changedPoints: body.points,
                    newBalance: result.newBalance,
                    description: body.description,
                },
            });
        } catch (err) {
            ctx.logger.error('修改用户积分失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取群用户积分变更历史 */
    router.getNoAuth('/checkin/groups/:groupId/users/:userId/points/history', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;
            const limit = parseInt(req.query?.limit as string) || 50;
            
            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            const history = getGroupUserPointsHistory(groupId, userId, limit);

            res.json({
                code: 0,
                data: {
                    userId,
                    groupId,
                    totalRecords: history.length,
                    history,
                },
            });
        } catch (err) {
            ctx.logger.error('获取积分历史失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 重置群用户积分 */
    router.postNoAuth('/checkin/groups/:groupId/users/:userId/points/reset', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;
            const body = req.body as { 
                description?: string;
                operatorId?: string;
            } | undefined;
            
            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            const result = resetGroupUserPoints(
                groupId,
                userId,
                body?.description || '积分重置',
                body?.operatorId
            );

            if (!result.success) {
                return res.status(400).json({ code: -1, message: result.error });
            }

            res.json({
                code: 0,
                data: {
                    userId,
                    groupId,
                    newBalance: 0,
                    message: '积分已重置',
                },
            });
        } catch (err) {
            ctx.logger.error('重置用户积分失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ==================== 排行榜 API（无鉴权）====================

    /** 获取排行榜数据 */
    router.getNoAuth('/leaderboard/:groupId', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const type = (req.query?.type as LeaderboardType) || 'week';
            
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            // 验证类型
            const validTypes: LeaderboardType[] = ['week', 'month', 'year', 'all'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ code: -1, message: '无效的排行榜类型' });
            }

            const leaderboardData = getLeaderboard(groupId, type);
            
            res.json({
                code: 0,
                data: leaderboardData,
            });
        } catch (err) {
            ctx.logger.error('获取排行榜失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ==================== 模板预览（无鉴权）====================

    /** 预览 HTML 模板 */
    router.postNoAuth('/template/preview', async (req, res) => {
        try {
            const body = req.body as { template?: string; data?: Record<string, string | number> } | undefined;
            
            if (!body?.template) {
                return res.status(400).json({ code: -1, message: '缺少 template 参数' });
            }

            const { previewTemplate } = await import('./puppeteer-service');
            const result = await previewTemplate(body.template, body.data || {});
            
            if (!result) {
                return res.status(500).json({ code: -1, message: '模板渲染失败' });
            }

            res.json({
                code: 0,
                data: {
                    image: result.image,
                    time: result.time,
                },
            });
        } catch (err) {
            ctx.logger.error('模板预览失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    ctx.logger.debug('API 路由注册完成');
}
