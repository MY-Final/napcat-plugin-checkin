/**
 * v1 API路由 - 双轨制积分系统API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../../core/state';
import { PointsCoreService } from '../points/points-core.service';
import { LevelCoreService } from '../level/level-core.service';
import { TitleService } from '../title/title.service';
import { LEVEL_CONFIG, DEFAULT_TITLES } from '../../config/level-config';
import { getGroupAllUsersData } from '../checkin-service';

export function registerV1Routes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    // ========== 积分操作 ==========

    /** 奖励积分 */
    router.postNoAuth('/v1/groups/:groupId/users/:userId/award', async (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;
            const body = req.body as {
                amount: number;
                description: string;
                source?: 'signin' | 'consecutive' | 'activity' | 'admin';
                applyLevelBonus?: boolean;
                multiplier?: number;
                relatedPlugin?: string;
            } | undefined;

            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            if (!body || typeof body.amount !== 'number' || body.amount <= 0) {
                return res.status(400).json({ code: -1, message: 'amount必须是正数' });
            }

            if (!body.description) {
                return res.status(400).json({ code: -1, message: '缺少description' });
            }

            const result = await PointsCoreService.awardPoints(groupId, userId, {
                userId,
                groupId,
                amount: body.amount,
                source: body.source || 'admin',
                description: body.description,
                applyLevelBonus: body.applyLevelBonus !== false,
                multiplier: body.multiplier,
                relatedPlugin: body.relatedPlugin,
            });

            if (!result.success) {
                return res.status(400).json({ code: -1, message: result.error });
            }

            res.json({ code: 0, data: result });
        } catch (err) {
            ctx.logger.error('奖励积分失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 消费积分 */
    router.postNoAuth('/v1/groups/:groupId/users/:userId/consume', async (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;
            const body = req.body as {
                amount: number;
                description: string;
                orderId?: string;
                idempotencyKey: string;
                relatedPlugin?: string;
            } | undefined;

            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            if (!body || typeof body.amount !== 'number' || body.amount <= 0) {
                return res.status(400).json({ code: -1, message: 'amount必须是正数' });
            }

            if (!body.description) {
                return res.status(400).json({ code: -1, message: '缺少description' });
            }

            if (!body.idempotencyKey) {
                return res.status(400).json({ code: -1, message: '缺少idempotencyKey' });
            }

            const result = await PointsCoreService.consumePoints(groupId, userId, {
                userId,
                groupId,
                amount: body.amount,
                description: body.description,
                orderId: body.orderId,
                idempotencyKey: body.idempotencyKey,
                relatedPlugin: body.relatedPlugin,
            });

            if (!result.success) {
                return res.status(400).json({ code: -1, message: result.error });
            }

            res.json({ code: 0, data: result });
        } catch (err) {
            ctx.logger.error('消费积分失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 检查余额 */
    router.getNoAuth('/v1/groups/:groupId/users/:userId/balance/check', async (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;
            const required = parseInt(req.query?.required as string) || 0;

            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            const result = await PointsCoreService.checkBalance(groupId, userId, required);
            res.json({ code: 0, data: result });
        } catch (err) {
            ctx.logger.error('检查余额失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取用户积分信息 */
    router.getNoAuth('/v1/groups/:groupId/users/:userId/points', async (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;

            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            const result = await PointsCoreService.getUserPoints(groupId, userId);
            if (!result) {
                return res.status(404).json({ code: -1, message: '用户不存在' });
            }

            res.json({ code: 0, data: result });
        } catch (err) {
            ctx.logger.error('获取用户积分信息失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取交易流水 */
    router.getNoAuth('/v1/groups/:groupId/users/:userId/transactions', async (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;
            const limit = parseInt(req.query?.limit as string) || 50;

            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            const groupUsers = getGroupAllUsersData(groupId);
            const userData = groupUsers.get(userId);

            if (!userData) {
                return res.status(404).json({ code: -1, message: '用户不存在' });
            }

            const transactions = userData.transactionLog?.slice(0, limit) || [];

            res.json({
                code: 0,
                data: {
                    userId,
                    groupId,
                    totalRecords: transactions.length,
                    transactions,
                },
            });
        } catch (err) {
            ctx.logger.error('获取交易流水失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ========== 等级系统 ==========

    /** 获取等级配置 */
    router.getNoAuth('/v1/levels/config', (_req, res) => {
        try {
            res.json({
                code: 0,
                data: {
                    levels: LEVEL_CONFIG,
                    defaultTitles: DEFAULT_TITLES,
                },
            });
        } catch (err) {
            ctx.logger.error('获取等级配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取用户等级信息 */
    router.getNoAuth('/v1/groups/:groupId/users/:userId/level', async (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;

            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            const levelInfo = await LevelCoreService.getUserLevelInfo(groupId, userId);
            if (!levelInfo) {
                return res.status(404).json({ code: -1, message: '用户不存在' });
            }

            res.json({ code: 0, data: levelInfo });
        } catch (err) {
            ctx.logger.error('获取用户等级信息失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ========== 称号系统 ==========

    /** 获取群所有称号 */
    router.getNoAuth('/v1/groups/:groupId/titles', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群ID' });
            }

            const titles = TitleService.getGroupTitles(groupId);
            res.json({ code: 0, data: { groupId, titles } });
        } catch (err) {
            ctx.logger.error('获取群称号失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取用户称号列表 */
    router.getNoAuth('/v1/groups/:groupId/users/:userId/titles', async (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;

            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            const titles = await TitleService.getUserTitles(groupId, userId);
            res.json({ code: 0, data: { userId, groupId, titles } });
        } catch (err) {
            ctx.logger.error('获取用户称号失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 佩戴称号 */
    router.postNoAuth('/v1/groups/:groupId/users/:userId/titles/equip', async (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;
            const body = req.body as { titleId: string } | undefined;

            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            if (!body?.titleId) {
                return res.status(400).json({ code: -1, message: '缺少titleId' });
            }

            const result = await TitleService.equipTitle(groupId, userId, body.titleId);
            if (!result.success) {
                return res.status(400).json({ code: -1, message: result.error });
            }

            res.json({ code: 0, data: result });
        } catch (err) {
            ctx.logger.error('佩戴称号失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ========== 排行榜 ==========

    /** 按经验值排行 */
    router.getNoAuth('/v1/groups/:groupId/ranking/exp', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const limit = parseInt(req.query?.limit as string) || 50;

            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群ID' });
            }

            const groupUsers = getGroupAllUsersData(groupId);
            const sortedUsers = Array.from(groupUsers.values())
                .sort((a, b) => b.totalExp - a.totalExp)
                .slice(0, limit)
                .map((user, index) => ({
                    rank: index + 1,
                    userId: user.userId,
                    nickname: user.nickname,
                    totalExp: user.totalExp,
                    level: user.level,
                    levelName: user.levelName,
                }));

            res.json({
                code: 0,
                data: {
                    groupId,
                    rankingType: 'exp',
                    totalUsers: groupUsers.size,
                    ranking: sortedUsers,
                },
            });
        } catch (err) {
            ctx.logger.error('获取经验值排行失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 按余额排行 */
    router.getNoAuth('/v1/groups/:groupId/ranking/balance', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const limit = parseInt(req.query?.limit as string) || 50;

            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群ID' });
            }

            const groupUsers = getGroupAllUsersData(groupId);
            const sortedUsers = Array.from(groupUsers.values())
                .sort((a, b) => b.balance - a.balance)
                .slice(0, limit)
                .map((user, index) => ({
                    rank: index + 1,
                    userId: user.userId,
                    nickname: user.nickname,
                    balance: user.balance,
                    level: user.level,
                    levelName: user.levelName,
                }));

            res.json({
                code: 0,
                data: {
                    groupId,
                    rankingType: 'balance',
                    totalUsers: groupUsers.size,
                    ranking: sortedUsers,
                },
            });
        } catch (err) {
            ctx.logger.error('获取余额排行失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });
}
