/**
 * 统计路由 - 签到统计数据查询API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../../core/state';
import { getTodayCheckinCount, getActiveRanking } from '../checkin-service';
import * as fs from 'fs';

const GROUP_DATA_PREFIX = 'checkin-group-';

export function registerStatsRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    /** 获取今日签到统计 */
    router.getNoAuth('/checkin/today-stats', (_req, res) => {
        try {
            const count = getTodayCheckinCount();
            res.json({
                code: 0,
                data: { todayCheckins: count },
            });
        } catch (err) {
            ctx.logger.error('获取今日签到统计失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取活跃排行榜 */
    router.getNoAuth('/checkin/active-ranking', (_req, res) => {
        try {
            const ranking = getActiveRanking(100);
            const dataPath = pluginState.ctx.dataPath;
            const userMap = new Map<string, { lastCheckinDate: string }>();

            if (fs.existsSync(dataPath)) {
                const files = fs.readdirSync(dataPath);
                const groupFiles = files.filter(file => file.startsWith(GROUP_DATA_PREFIX) && file.endsWith('.json'));

                for (const file of groupFiles) {
                    const filePath = `${dataPath}/${file}`;
                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const data = JSON.parse(content);
                        if (data.users) {
                            for (const [userId, userData] of Object.entries(data.users)) {
                                const user = userData as { lastCheckinDate: string };
                                if (!userMap.has(userId) || user.lastCheckinDate > (userMap.get(userId)?.lastCheckinDate || '')) {
                                    userMap.set(userId, { lastCheckinDate: user.lastCheckinDate });
                                }
                            }
                        }
                    } catch {
                        // 忽略错误
                    }
                }
            }

            res.json({
                code: 0,
                data: {
                    totalUsers: userMap.size,
                    rankingType: 'active',
                    rankingDescription: '按使用天数排行，每天首次使用机器人计1天',
                    ranking,
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
            const dataPath = pluginState.ctx.dataPath;
            const userMap = new Map<string, {
                totalCheckinDays: number;
                lastCheckinDate: string;
            }>();
            let totalCheckins = 0;
            let todayCheckins = 0;
            const today = new Date().toISOString().split('T')[0];

            if (fs.existsSync(dataPath)) {
                const files = fs.readdirSync(dataPath);
                const groupFiles = files.filter(file => file.startsWith(GROUP_DATA_PREFIX) && file.endsWith('.json'));

                for (const file of groupFiles) {
                    const filePath = `${dataPath}/${file}`;
                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const data = JSON.parse(content);
                        if (data.users) {
                            for (const [userId, userData] of Object.entries(data.users)) {
                                const user = userData as {
                                    totalCheckinDays: number;
                                    lastCheckinDate: string;
                                };
                                
                                totalCheckins += user.totalCheckinDays;
                                
                                if (user.lastCheckinDate === today) {
                                    todayCheckins++;
                                }
                                
                                if (userMap.has(userId)) {
                                    const existing = userMap.get(userId)!;
                                    existing.totalCheckinDays = Math.max(existing.totalCheckinDays, user.totalCheckinDays);
                                    if (user.lastCheckinDate > existing.lastCheckinDate) {
                                        existing.lastCheckinDate = user.lastCheckinDate;
                                    }
                                } else {
                                    userMap.set(userId, {
                                        totalCheckinDays: user.totalCheckinDays,
                                        lastCheckinDate: user.lastCheckinDate,
                                    });
                                }
                            }
                        }
                    } catch {
                        // 忽略单个文件读取错误
                    }
                }
            }

            // 获取活跃用户（最近7天签到过）
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
            const activeUsers = Array.from(userMap.values()).filter(user => user.lastCheckinDate >= oneWeekAgoStr).length;

            res.json({
                code: 0,
                data: {
                    totalUsers: userMap.size,
                    totalCheckins,
                    todayCheckins,
                    activeUsers,
                },
            });
        } catch (err) {
            ctx.logger.error('获取统计数据失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });
}
