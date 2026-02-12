/**
 * 用户路由 - 用户数据查询API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../../core/state';
import {
    getUserCheckinData,
    getGroupUserCheckinData,
    getAllUsersData,
} from '../checkin-service';
import * as fs from 'fs';
import * as path from 'path';

const GROUP_DATA_PREFIX = 'checkin-group-';

export function registerUserRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    /** 获取指定用户签到数据（支持指定群） */
    router.getNoAuth('/checkin/user/:id', (req, res) => {
        try {
            const userId = req.params?.id;
            const groupId = req.query?.groupId as string | undefined;

            if (!userId) {
                return res.status(400).json({ code: -1, message: '缺少用户 ID' });
            }

            // 如果指定了群ID，返回该群的数据
            if (groupId) {
                const groupUserData = getGroupUserCheckinData(userId, groupId);
                if (!groupUserData) {
                    return res.json({ code: 0, data: null });
                }

                // 转换为前端兼容的格式
                res.json({
                    code: 0,
                    data: {
                        userId: groupUserData.userId,
                        nickname: groupUserData.nickname,
                        totalCheckinDays: groupUserData.totalCheckinDays,
                        consecutiveDays: groupUserData.consecutiveDays,
                        totalPoints: groupUserData.totalExp,
                        balance: groupUserData.balance,
                        activeDays: groupUserData.activeDays || 0,
                        lastActiveDate: groupUserData.lastActiveDate || '',
                        lastCheckinDate: groupUserData.lastCheckinDate,
                        checkinHistory: groupUserData.checkinHistory || [],
                    },
                });
            } else {
                // 返回全局数据
                const userData = getUserCheckinData(userId);
                if (!userData) {
                    return res.json({ code: 0, data: null });
                }

                res.json({ code: 0, data: userData });
            }
        } catch (err) {
            ctx.logger.error('获取用户签到数据失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 获取用户分群余额详情 */
    router.getNoAuth('/checkin/user/:userId/balance', (req, res) => {
        try {
            const userId = req.params?.userId;
            if (!userId) {
                return res.status(400).json({ code: -1, message: '缺少用户 ID' });
            }

            const dataPath = pluginState.ctx.dataPath;
            const groupBalances: Array<{
                groupId: string;
                groupName?: string;
                balance: number;
                totalExp: number;
                totalCheckinDays: number;
            }> = [];

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
                        if (data.users && data.users[userId]) {
                            const userData = data.users[userId];
                            groupBalances.push({
                                groupId,
                                groupName: data.groupName,
                                balance: userData.balance || 0,
                                totalExp: userData.totalExp || 0,
                                totalCheckinDays: userData.totalCheckinDays || 0,
                            });
                        }
                    } catch {
                        // 忽略单个文件读取错误
                    }
                }
            }

            // 按余额降序排序
            groupBalances.sort((a, b) => b.balance - a.balance);

            res.json({
                code: 0,
                data: {
                    userId,
                    groupCount: groupBalances.length,
                    groups: groupBalances,
                },
            });
        } catch (err) {
            ctx.logger.error('获取用户分群余额失败:', err);
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
}
