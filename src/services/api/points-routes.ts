/**
 * 积分管理路由 - 用户积分操作API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import {
    getGroupUserPoints,
    updateGroupUserPoints,
    getGroupUserPointsHistory,
    resetGroupUserPoints,
} from '../checkin-service';

export function registerPointsRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    /** 获取群用户积分（无需鉴权） */
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

    /** 修改群用户积分（增加/减少）（需要鉴权） */
    router.post('/checkin/groups/:groupId/users/:userId/points', (req, res) => {
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

    /** 获取群用户积分变更历史（无需鉴权） */
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

    /** 重置群用户积分（需要鉴权） */
    router.post('/checkin/groups/:groupId/users/:userId/points/reset', (req, res) => {
        try {
            const groupId = req.params?.groupId;
            const userId = req.params?.userId;
            const body = { 
                description?: string;
                operatorId?: string;
            };
            
            if (!groupId || !userId) {
                return res.status(400).json({ code: -1, message: '缺少群ID或用户ID' });
            }

            const result = resetGroupUserPoints(
                groupId,
                userId,
                body.description || '积分重置',
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
                    newBalance: 0,
                    message: '积分已重置',
                },
            });
        } catch (err) {
            ctx.logger.error('重置积分失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });
}
