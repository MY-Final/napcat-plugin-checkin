/**
 * 群签到统计路由 - 群签到数据查询API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import {
    getAllGroupsStats,
    getGroupCheckinStats,
    getGroupAllUsersData,
} from '../checkin-service';

export function registerGroupCheckinRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

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
                .sort((a, b) => b.totalExp - a.totalExp)
                .slice(0, 100)
                .map(user => ({
                    userId: user.userId,
                    nickname: user.nickname,
                    totalExp: user.totalExp,
                    balance: user.balance,
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

    /** 获取指定群的签到排行（含活跃天数） */
    router.getNoAuth('/checkin/groups/:id/checkin-ranking', (req, res) => {
        try {
            const groupId = req.params?.id;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            const groupUsers = getGroupAllUsersData(groupId);
            
            const sortedUsers = Array.from(groupUsers.values())
                .sort((a, b) => b.totalCheckinDays - a.totalCheckinDays)
                .slice(0, 100)
                .map(user => ({
                    userId: user.userId,
                    nickname: user.nickname,
                    totalExp: user.totalExp,
                    balance: user.balance,
                    totalCheckinDays: user.totalCheckinDays,
                    consecutiveDays: user.consecutiveDays,
                    lastCheckinDate: user.lastCheckinDate,
                    activeDays: user.activeDays || 0,
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
            ctx.logger.error('获取群内签到排行失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });
}
