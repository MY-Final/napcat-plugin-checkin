/**
 * 签到处理器
 * 处理签到命令和生成签到卡片
 */

import type { OB11Message, OB11PostSendMsg } from 'napcat-types/napcat-onebot';
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';
import type { UserCheckinData, GroupUserCheckinData } from '../types';
import {
    performCheckin,
    getUserCheckinData,
    getGroupUserCheckinData,
    getAllUsersData,
    getGroupAllUsersData,
    getTodayCheckinCount,
    getGroupTodayCheckinCount,
    getUserTodayRank,
    getUserGroupTodayRank,
    getActiveRanking
} from '../services/checkin-service';
import { renderCheckinCard, getAvatarUrl } from '../services/puppeteer-service';
import { getRandomQuote } from '../utils/checkin-messages';
import { sendReply } from './message-handler';
import type { CheckinCardData } from '../types';
import { createCheckinLog, isGroupLogEnabled } from '../services/log-service';

// CD 冷却管理
const cooldownMap = new Map<string, number>();

/**
 * 检查是否在 CD 中
 */
function getCooldownRemaining(userId: string): number {
    const cdSeconds = 5; // 签到CD较短
    const key = `checkin:${userId}`;
    const expireTime = cooldownMap.get(key);
    if (!expireTime) return 0;

    const remaining = Math.ceil((expireTime - Date.now()) / 1000);
    if (remaining <= 0) {
        cooldownMap.delete(key);
        return 0;
    }
    return remaining;
}

/**
 * 设置 CD 冷却
 */
function setCooldown(userId: string): void {
    cooldownMap.set(`checkin:${userId}`, Date.now() + 5 * 1000);
}

/**
 * 获取当前日期字符串
 */
function getCurrentDateStr(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return `${year}年${month}月${day}日`;
}

/**
 * 处理签到命令
 */
export async function handleCheckinCommand(
    ctx: NapCatPluginContext,
    event: OB11Message
): Promise<void> {
    try {
        const userId = String(event.user_id);
        const nickname = event.sender?.nickname || '未知用户';
        const groupId = event.group_id ? String(event.group_id) : undefined;
        let groupName: string | undefined;

        // 获取群名称（如果在群里）
        if (groupId) {
            try {
                const groups = await ctx.actions.call(
                    'get_group_list',
                    {},
                    ctx.adapterName,
                    ctx.pluginManager.config
                ) as Array<{ group_id: number; group_name: string; member_count: number; max_member_count: number }>;
                const group = groups.find(g => String(g.group_id) === groupId);
                groupName = group?.group_name || groupId;
            } catch {
                groupName = groupId; // 获取失败就用群号
            }
        }

        // 检查CD
        const remaining = getCooldownRemaining(userId);
        if (remaining > 0) {
            await sendReply(ctx, event, `请等待 ${remaining} 秒后再试~`);
            return;
        }

        // 执行签到
        const result = await performCheckin(userId, nickname, groupId, groupName);

        if (!result.success) {
            if (result.error?.includes('已经签到')) {
                // 已经签到，显示今日信息
                const userData = getUserCheckinData(userId);
                if (userData) {
                    const todayRecord = userData.checkinHistory[userData.checkinHistory.length - 1];
                    await sendReply(ctx, event, 
                        `今天已经签到过了哦~\n` +
                        `📅 签到时间: ${todayRecord.time}\n` +
                        `💎 获得积分: ${todayRecord.points}\n` +
                        `🏆 今日排名: #${todayRecord.rank}\n` +
                        `🔥 连续签到: ${userData.consecutiveDays}天`
                    );
                }
            } else {
                await sendReply(ctx, event, result.error || '签到失败，请稍后重试');
            }
            return;
        }

        // 生成签到卡片
        // 如果在群内签到，显示群内累计经验值；否则显示全局积分
        const displayTotalPoints = groupId && result.groupUserData
            ? result.groupUserData.totalExp
            : result.userData.totalPoints;

        // 获取当前日期信息
        const now = new Date();
        const weekday = now.getDay();
        const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const isWeekend = weekday === 0 || weekday === 6;

        const cardData: CheckinCardData = {
            nickname: result.userData.nickname,
            userId: result.userData.userId,
            avatarUrl: getAvatarUrl(userId),
            earnedPoints: result.earnedPoints,
            totalDays: result.userData.totalCheckinDays,
            totalPoints: displayTotalPoints,
            todayRank: result.todayRank,
            checkinTime: result.checkinTime,
            currentDate: getCurrentDateStr(),
            quote: getRandomQuote(),
            consecutiveDays: result.consecutiveDays,
            weekday: weekday,
            weekdayName: weekdayNames[weekday],
            isWeekend: isWeekend,
            groupName: groupName || undefined,
            activeDays: result.userData.activeDays || 0,
            basePoints: result.breakdown?.base || result.earnedPoints,
            consecutiveBonus: result.breakdown?.consecutiveBonus || 0,
            weekendBonus: result.breakdown?.weekendBonus || 0,
        };

        // 根据配置决定发送图片还是文字
        const replyMode = pluginState.config.checkinReplyMode || 'auto';
        let useImageMode = false;

        if (replyMode === 'image') {
            useImageMode = true;
        } else if (replyMode === 'auto') {
            // auto 模式下，尝试生成图片，如果成功则使用图片
            const imageBuffer = await renderCheckinCard(cardData);
            useImageMode = imageBuffer !== null;
        }
        // replyMode === 'text' 时 useImageMode 保持 false

        if (useImageMode) {
            // 图片模式：发送图片卡片
            const imageBuffer = await renderCheckinCard(cardData);
            if (imageBuffer) {
                const base64Image = imageBuffer.toString('base64');
                const message: OB11PostSendMsg['message'] = [
                    {
                        type: 'image',
                        data: {
                            file: `base64://${base64Image}`,
                        },
                    },
                ];
                await sendReply(ctx, event, message);
            } else {
                // 图片生成失败，降级为文字
                await sendTextCheckinResult(ctx, event, cardData, result.consecutiveDays);
            }
        } else {
            // 文字模式：发送文字签到结果
            await sendTextCheckinResult(ctx, event, cardData, result.consecutiveDays);
        }

        // 记录签到日志
        if (groupId) {
            pluginState.logger.info(`[签到日志] 开始记录日志，groupId=${groupId}`);
            const enabled = isGroupLogEnabled(groupId);
            pluginState.logger.info(`[签到日志] 日志启用状态: ${enabled}`);
            if (enabled) {
                createCheckinLog({
                    userId: userId,
                    nickname: nickname,
                    groupId: groupId,
                    groupName: groupName || groupId,
                    earnedPoints: result.earnedPoints,
                    consecutiveDays: result.consecutiveDays,
                    totalPoints: displayTotalPoints,
                    totalDays: result.userData.totalCheckinDays,
                    basePoints: result.breakdown?.base || result.earnedPoints,
                    consecutiveBonus: result.breakdown?.consecutiveBonus || 0,
                    weekendBonus: result.breakdown?.weekendBonus || 0,
                    weekday: weekday,
                    weekdayName: weekdayNames[weekday],
                    isWeekend: isWeekend,
                    quote: cardData.quote,
                    replyMode: replyMode as 'text' | 'image' | 'auto',
                    status: 'success',
                });
                pluginState.logger.info(`[签到日志] 日志记录完成`);
            }
        }

        // 设置CD
        setCooldown(userId);

        pluginState.logger.info(
            `用户 ${nickname}(${userId}) 签到成功，排名 #${result.todayRank}，获得 ${result.earnedPoints} 积分`
        );
    } catch (error) {
        pluginState.logger.error('处理签到命令失败:', error);
        await sendReply(ctx, event, '签到处理失败，请稍后重试~');
    }
}

/**
 * 处理签到查询命令
 * @param type 查询类型: 'self'个人, 'group'群内, 'global'全服
 */
export async function handleCheckinQuery(
    ctx: NapCatPluginContext,
    event: OB11Message,
    type: 'self' | 'group' | 'global'
): Promise<void> {
    try {
        const userId = String(event.user_id);
        const groupId = event.group_id;
        
        if (type === 'self') {
            // 查询个人数据（优先显示群内数据，如果没有则显示全局）
            let userData = groupId ? getGroupUserCheckinData(userId, String(groupId)) : null;
            const globalData = getUserCheckinData(userId);
            
            if (!userData && !globalData) {
                await sendReply(ctx, event, '你还没有签到记录哦~发送"签到"开始你的第一次签到！');
                return;
            }
            
            // 如果有群内数据，优先显示群内统计
            const displayData = userData || globalData!;
            const isGroupData = !!userData;
            
            const todayCount = groupId 
                ? getGroupTodayCheckinCount(String(groupId))
                : getTodayCheckinCount();
                
            // 根据数据类型显示不同的积分字段
            const displayPoints = isGroupData 
                ? (displayData as GroupUserCheckinData).totalExp 
                : (displayData as UserCheckinData).totalPoints;
            
            const text = [
                `📊 ${displayData.nickname} 的签到数据`,
                isGroupData ? `👥 当前群内统计` : `🌍 全服统计`,
                ``,
                `💰 ${isGroupData ? '群内' : '累计'}积分: ${displayPoints}`,
                `📅 ${isGroupData ? '群内' : '累计'}签到: ${displayData.totalCheckinDays} 天`,
                `🔥 连续签到: ${displayData.consecutiveDays} 天`,
                ``,
                `📈 今日已有 ${todayCount} 人签到`,
            ];
            
            // 显示最近3次签到记录
            if (displayData.checkinHistory.length > 0) {
                text.push(``, `📝 最近签到:`);
                const recentHistory = displayData.checkinHistory.slice(-3).reverse();
                recentHistory.forEach(record => {
                    text.push(`   ${record.date} +${record.points}分 #${record.rank}`);
                });
            }
            
            await sendReply(ctx, event, text.join('\n'));
            
        } else if (type === 'group' && groupId) {
            // 群内排行 - 从群数据文件中读取
            const groupUsers = getGroupAllUsersData(String(groupId));
            
            if (groupUsers.size === 0) {
                await sendReply(ctx, event, '群内还没有人签到哦~快来成为第一个！');
                return;
            }
            
            const sortedUsers = Array.from(groupUsers.values())
                .sort((a, b) => b.totalExp - a.totalExp)
                .slice(0, 10);

            const text = [
                `🏆 群内积分排行 TOP10`,
                ``,
                ...sortedUsers.map((user, index) => {
                    const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
                    return `${medal} ${user.nickname} - ${user.totalExp}分 (${user.totalCheckinDays}天)`;
                }),
                ``,
                `💡 使用 "${pluginState.config.commandPrefix}我的积分" 查看个人详情`,
            ];
            
            await sendReply(ctx, event, text.join('\n'));
            
        } else if (type === 'global') {
            // 全服排行
            const allUsers = getAllUsersData();
            const sortedUsers = Array.from(allUsers.values())
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .slice(0, 10);
            
            if (sortedUsers.length === 0) {
                await sendReply(ctx, event, '还没有人签到哦~快来成为第一个！');
                return;
            }
            
            const text = [
                `🌍 全服积分排行榜 TOP10`,
                ``,
                ...sortedUsers.map((user, index) => {
                    const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
                    return `${medal} ${user.nickname} - ${user.totalPoints}分 (${user.totalCheckinDays}天)`;
                }),
                ``,
                `💡 使用 "${pluginState.config.commandPrefix}我的积分" 查看个人详情`,
            ];
            
            await sendReply(ctx, event, text.join('\n'));
        }
    } catch (error) {
        pluginState.logger.error('处理查询命令失败:', error);
        await sendReply(ctx, event, '查询失败，请稍后重试~');
    }
}

/**
 * 处理活跃排行查询
 * 显示全服使用天数最多的忠实用户
 */
export async function handleActiveRankingQuery(
    ctx: NapCatPluginContext,
    event: OB11Message
): Promise<void> {
    try {
        const ranking = getActiveRanking(10);
        
        if (ranking.length === 0) {
            await sendReply(ctx, event, '还没有人使用过机器人哦~快来成为第一个！');
            return;
        }
        
        const text = [
            `🏆 全服活跃排行榜 TOP10`,
            `📊 按使用天数排行（每天首次打卡计1天）`,
            ``,
            ...ranking.map((user, index) => {
                const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
                return `${medal} ${user.nickname} - ${user.activeDays}天活跃`;
            }),
            ``,
            `💡 使用天数越多，说明是越忠实的用户哦~`,
        ];
        
        await sendReply(ctx, event, text.join('\n'));
    } catch (error) {
        pluginState.logger.error('处理活跃排行查询失败:', error);
        await sendReply(ctx, event, '查询失败，请稍后重试~');
    }
}

/**
 * 发送文字签到结果
 */
async function sendTextCheckinResult(
    ctx: NapCatPluginContext,
    event: OB11Message,
    cardData: CheckinCardData,
    consecutiveDays: number
): Promise<void> {
    const textMessage = [
        `✅ 签到成功！`,
        ``,
        `👤 ${cardData.nickname}`,
        `💎 +${cardData.earnedPoints} 积分`,
        `📅 ${cardData.currentDate} ${cardData.checkinTime}`,
        ``,
        `📊 累计签到: ${cardData.totalDays} 天`,
        `💰 累计积分: ${cardData.totalPoints}`,
        `🏆 今日排名: #${cardData.todayRank}`,
        `🔥 连续签到: ${consecutiveDays} 天`,
        ``,
        `"${cardData.quote}"`,
    ].join('\n');
    await sendReply(ctx, event, textMessage);
}

/**
 * 处理签到管理命令（开启/关闭签到）
 */
export async function handleCheckinAdmin(
    ctx: NapCatPluginContext,
    event: OB11Message,
    action: 'enable' | 'disable'
): Promise<void> {
    try {
        const groupId = event.group_id;
        if (!groupId) {
            await sendReply(ctx, event, '此命令只能在群聊中使用');
            return;
        }
        
        pluginState.updateGroupConfig(String(groupId), { 
            enableCheckin: action === 'enable' 
        });
        
        await sendReply(
            ctx, 
            event, 
            `✅ 已${action === 'enable' ? '开启' : '关闭'}本群签到功能`
        );
        
        pluginState.logger.info(`群 ${groupId} 签到功能已${action === 'enable' ? '开启' : '关闭'}`);
    } catch (error) {
        pluginState.logger.error('处理管理命令失败:', error);
        await sendReply(ctx, event, '操作失败，请稍后重试~');
    }
}
