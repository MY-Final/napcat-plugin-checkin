/**
 * 签到日志路由 - 对外 API
 * 提供日志查询、统计等接口供其他插件调用
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import {
    queryLogs,
    getLogById,
    getLogStats,
    getDailyTrend,
    getUserLogCount,
    getGroupLogCount,
    deleteLogsOlderThan,
    getAllLogConfigs,
    getGroupLogConfig,
    saveGroupLogConfig,
} from '../log-service';
import type { LogQueryParams, StatsTimeRange } from '../../types';

export function registerLogRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;
    ctx.logger.info('[签到日志] 正在注册日志路由...');

    /**
     * 分页查询日志
     */
    router.getNoAuth('/logs', (req, res) => {
        try {
            const params: LogQueryParams = {
                page: req.query?.page ? parseInt(String(req.query.page)) : 1,
                pageSize: req.query?.pageSize ? parseInt(String(req.query.pageSize)) : 50,
                userId: req.query?.userId as string | undefined,
                groupId: req.query?.groupId as string | undefined,
                startDate: req.query?.startDate as string | undefined,
                endDate: req.query?.endDate as string | undefined,
                status: req.query?.status as 'success' | 'failed' | 'all' | undefined,
                order: req.query?.order as 'desc' | 'asc' | undefined,
            };

            const result = queryLogs(params);
            
            // 前端昵称筛选（因为是本地存储，直接在结果中过滤）
            const userNickname = req.query?.userNickname as string | undefined;
            const groupName = req.query?.groupName as string | undefined;
            
            let filteredLogs = result.logs;
            if (userNickname) {
                filteredLogs = filteredLogs.filter(log => 
                    log.nickname.toLowerCase().includes(userNickname.toLowerCase())
                );
            }
            if (groupName) {
                filteredLogs = filteredLogs.filter(log => 
                    log.groupName.toLowerCase().includes(groupName.toLowerCase())
                );
            }

            res.json({
                code: 0,
                data: {
                    ...result,
                    logs: filteredLogs,
                },
            });
        } catch (err) {
            ctx.logger.error('查询日志失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

/**
     * 获取日志统计
     */
    router.getNoAuth('/logs/stats', (req, res) => {
        try {
            const timeRange = (req.query?.timeRange as StatsTimeRange) || 'all';
            const stats = getLogStats(timeRange);
            res.json({
                code: 0,
                data: stats,
            });
        } catch (err) {
            ctx.logger.error('获取统计失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /**
     * 获取每日签到趋势
     */
    router.getNoAuth('/logs/trend', (req, res) => {
        try {
            const days = req.query?.days ? parseInt(String(req.query.days)) : 30;
            const trend = getDailyTrend(days);
            res.json({
                code: 0,
                data: trend,
            });
        } catch (err) {
            ctx.logger.error('获取趋势失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /**
     * 获取用户签到日志
     */
    router.getNoAuth('/logs/users/:userId', (req, res) => {
        try {
            const userId = req.params?.userId;
            if (!userId) {
                return res.status(400).json({ code: -1, message: '缺少用户 ID' });
            }

            const page = req.query?.page ? parseInt(String(req.query.page)) : 1;
            const pageSize = req.query?.pageSize ? parseInt(String(req.query.pageSize)) : 50;
            const groupId = req.query?.groupId as string | undefined;
            const startDate = req.query?.startDate as string | undefined;
            const endDate = req.query?.endDate as string | undefined;

            const result = queryLogs({
                page,
                pageSize,
                userId,
                groupId,
                startDate,
                endDate,
            });

            res.json({
                code: 0,
                data: result,
            });
        } catch (err) {
            ctx.logger.error('获取用户日志失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /**
     * 获取群组签到日志
     */
    router.getNoAuth('/logs/groups/:groupId', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            const page = req.query?.page ? parseInt(String(req.query.page)) : 1;
            const pageSize = req.query?.pageSize ? parseInt(String(req.query.pageSize)) : 50;
            const userId = req.query?.userId as string | undefined;
            const startDate = req.query?.startDate as string | undefined;
            const endDate = req.query?.endDate as string | undefined;

            const result = queryLogs({
                page,
                pageSize,
                groupId,
                userId,
                startDate,
                endDate,
            });

            res.json({
                code: 0,
                data: result,
            });
        } catch (err) {
            ctx.logger.error('获取群日志失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /**
     * 获取单条日志详情
     */
    router.getNoAuth('/logs/:id', (req, res) => {
        try {
            const id = req.params?.id;
            if (!id) {
                return res.status(400).json({ code: -1, message: '缺少日志 ID' });
            }

            const log = getLogById(id);
            if (!log) {
                return res.status(404).json({ code: -1, message: '日志不存在' });
            }

            res.json({
                code: 0,
                data: log,
            });
        } catch (err) {
            ctx.logger.error('获取日志失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /**
     * 获取用户日志数量
     */
    router.getNoAuth('/logs/users/:userId/count', (req, res) => {
        try {
            const userId = req.params?.userId;
            if (!userId) {
                return res.status(400).json({ code: -1, message: '缺少用户 ID' });
            }

            const count = getUserLogCount(userId);
            res.json({
                code: 0,
                data: { count },
            });
        } catch (err) {
            ctx.logger.error('获取用户日志数量失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /**
     * 获取群组日志数量
     */
    router.getNoAuth('/logs/groups/:groupId/count', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            const count = getGroupLogCount(groupId);
            res.json({
                code: 0,
                data: { count },
            });
        } catch (err) {
            ctx.logger.error('获取群日志数量失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /**
     * 获取所有群日志配置
     */
    router.getNoAuth('/logs/config', (_req, res) => {
        try {
            const configs = getAllLogConfigs();
            res.json({
                code: 0,
                data: configs,
            });
        } catch (err) {
            ctx.logger.error('获取日志配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /**
     * 获取单个群日志配置
     */
    router.getNoAuth('/logs/config/:groupId', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            const config = getGroupLogConfig(groupId);
            res.json({
                code: 0,
                data: config,
            });
        } catch (err) {
            ctx.logger.error('获取群日志配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /**
     * 更新群日志配置
     */
    router.postNoAuth('/logs/config/:groupId', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            const body = req.body as {
                enabled?: boolean;
                enableStats?: boolean;
                retentionDays?: number;
            } | undefined;

            if (!body) {
                return res.status(400).json({ code: -1, message: '缺少配置参数' });
            }

            const currentConfig = getGroupLogConfig(groupId);
            const newConfig = {
                ...currentConfig,
                groupId,
                ...body,
            };

            saveGroupLogConfig(newConfig);

            ctx.logger.info(`更新群 ${groupId} 日志配置成功`);

            res.json({
                code: 0,
                message: '配置已更新',
            });
        } catch (err) {
            ctx.logger.error('更新日志配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /**
     * 删除过期日志
     */
    router.postNoAuth('/logs/cleanup', (req, res) => {
        try {
            const days = req.query?.days ? parseInt(String(req.query.days)) : 0;
            if (days <= 0) {
                return res.status(400).json({ code: -1, message: '请指定要删除多少天前的日志' });
            }

            const deletedCount = deleteLogsOlderThan(days);
            ctx.logger.info(`清理了 ${deletedCount} 条超过 ${days} 天的日志`);

            res.json({
                code: 0,
                data: { deletedCount },
            });
        } catch (err) {
            ctx.logger.error('清理日志失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    ctx.logger.info('[签到日志] 日志路由注册完成，共注册以下路由:');
    ctx.logger.info('  - GET  /logs');
    ctx.logger.info('  - GET  /logs/stats');
    ctx.logger.info('  - GET  /logs/trend');
    ctx.logger.info('  - GET  /logs/users/:userId');
    ctx.logger.info('  - GET  /logs/groups/:groupId');
    ctx.logger.info('  - GET  /logs/:id');
    ctx.logger.info('  - GET  /logs/config');
    ctx.logger.info('  - POST /logs/config/:groupId');
    ctx.logger.info('  - POST /logs/cleanup');
}
