/**
 * 排行榜路由 - 排行榜数据查询API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { getLeaderboard } from '../leaderboard-service';
import type { LeaderboardType } from '../../types';

export function registerLeaderboardRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

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
}
