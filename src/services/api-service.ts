/**
 * API 服务模块
 * 注册 WebUI API 路由
 */

import type {
    NapCatPluginContext,
} from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';
import { getUserCheckinData, getTodayCheckinCount, cleanupOldData, getAllUsersData, getGroupCheckinStats, getAllGroupsStats, getGroupAllUsersData } from './checkin-service';

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

    /** 获取全服排行榜 */
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

    /** 获取所有签到统计数据 */
    router.getNoAuth('/checkin/stats', (_req, res) => {
        try {
            const allUsers = getAllUsersData();
            
            // 计算统计数据
            const totalUsers = allUsers.size;
            const totalCheckins = Array.from(allUsers.values()).reduce((sum, user) => sum + user.totalCheckinDays, 0);
            const totalPoints = Array.from(allUsers.values()).reduce((sum, user) => sum + user.totalPoints, 0);
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
