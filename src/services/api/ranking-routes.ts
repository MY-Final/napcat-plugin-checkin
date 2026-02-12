/**
 * 排行榜路由 - 活跃排行API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../../core/state';
import * as fs from 'fs';
import * as path from 'path';

const GROUP_DATA_PREFIX = 'checkin-group-';

export function registerRankingRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    /** 获取全服排行榜（按活跃天数排序，每人只算一次） */
    router.getNoAuth('/checkin/ranking', (_req, res) => {
        try {
            const dataPath = pluginState.ctx.dataPath;
            const userMap = new Map<string, {
                userId: string;
                nickname: string;
                activeDays: number;
                totalCheckinDays: number;
                lastActiveDate: string;
                firstGroupId: string;
            }>();

            if (fs.existsSync(dataPath)) {
                const files = fs.readdirSync(dataPath);
                const groupFiles = files.filter(file => file.startsWith(GROUP_DATA_PREFIX) && file.endsWith('.json'));

                for (const file of groupFiles) {
                    const groupId = file.replace(GROUP_DATA_PREFIX, '').replace('.json', '');
                    if (!groupId || groupId === 'global') continue;

                    const filePath = path.join(dataPath, file);
                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const data = JSON.parse(content);
                        if (data.users) {
                            for (const [userId, userData] of Object.entries(data.users)) {
                                const user = userData as {
                                    nickname: string;
                                    totalCheckinDays: number;
                                    lastCheckinDate: string;
                                };
                                
                                if (userMap.has(userId)) {
                                    const existing = userMap.get(userId)!;
                                    existing.totalCheckinDays = Math.max(existing.totalCheckinDays, user.totalCheckinDays);
                                    if (user.lastCheckinDate < existing.lastActiveDate) {
                                        existing.lastActiveDate = user.lastCheckinDate;
                                        existing.firstGroupId = groupId;
                                    }
                                    existing.activeDays++;
                                } else {
                                    userMap.set(userId, {
                                        userId,
                                        nickname: user.nickname,
                                        activeDays: 1,
                                        totalCheckinDays: user.totalCheckinDays,
                                        lastActiveDate: user.lastCheckinDate,
                                        firstGroupId: groupId,
                                    });
                                }
                            }
                        }
                    } catch {
                        // 忽略单个文件读取错误
                    }
                }
            }

            // 按活跃天数排序
            const sortedUsers = Array.from(userMap.values())
                .sort((a, b) => {
                    if (b.activeDays !== a.activeDays) {
                        return b.activeDays - a.activeDays;
                    }
                    return b.totalCheckinDays - a.totalCheckinDays;
                })
                .slice(0, 100)
                .map(user => ({
                    userId: user.userId,
                    nickname: user.nickname,
                    activeDays: user.activeDays,
                    totalCheckinDays: user.totalCheckinDays,
                    lastActiveDate: user.lastActiveDate,
                    firstGroupId: user.firstGroupId,
                }));

            res.json({
                code: 0,
                data: {
                    totalUsers: userMap.size,
                    ranking: sortedUsers,
                },
            });
        } catch (err) {
            ctx.logger.error('获取排行榜失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 清理旧数据 */
    router.postNoAuth('/checkin/cleanup', (req, res) => {
        try {
            const { cleanupOldData } = require('../checkin-service');
            const body = req.body as { daysToKeep?: number } | undefined;
            const daysToKeep = body?.daysToKeep || 90;
            cleanupOldData(daysToKeep);
            res.json({ code: 0, message: '清理完成' });
        } catch (err) {
            ctx.logger.error('清理旧数据失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });
}
