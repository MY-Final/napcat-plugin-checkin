/**
 * 签到处理器
 * 处理签到命令和生成签到卡片
 */

import type { OB11Message, OB11PostSendMsg } from 'napcat-types/napcat-onebot';
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';
import { performCheckin, getUserCheckinData } from '../services/checkin-service';
import { generateCheckinCard, getAvatarUrl } from '../services/canvas-service';
import { getRandomQuote } from '../utils/checkin-messages';
import { sendReply } from './message-handler';
import type { CheckinCardData } from '../types';

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

        // 检查CD
        const remaining = getCooldownRemaining(userId);
        if (remaining > 0) {
            await sendReply(ctx, event, `请等待 ${remaining} 秒后再试~`);
            return;
        }

        // 执行签到
        const result = await performCheckin(userId, nickname, groupId);

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
        const cardData: CheckinCardData = {
            nickname: result.userData.nickname,
            userId: result.userData.userId,
            avatarUrl: getAvatarUrl(userId),
            earnedPoints: result.earnedPoints,
            totalDays: result.userData.totalCheckinDays,
            totalPoints: result.userData.totalPoints,
            todayRank: result.todayRank,
            checkinTime: result.checkinTime,
            currentDate: getCurrentDateStr(),
            quote: getRandomQuote(),
        };

        // 生成图片
        const imageBuffer = await generateCheckinCard(cardData);

        if (imageBuffer) {
            // 图片模式：发送图片卡片
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
            // 文字模式：发送文字签到结果
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
                `🔥 连续签到: ${result.consecutiveDays} 天`,
                ``,
                `"${cardData.quote}"`,
            ].join('\n');
            await sendReply(ctx, event, textMessage);
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
        
        // 获取所有用户数据
        const { getAllUsersData, getTodayCheckinCount, getTodayRank } = await import('../services/checkin-service');
        const allUsers = getAllUsersData();
        
        if (type === 'self') {
            // 查询个人数据
            const userData = getUserCheckinData(userId);
            if (!userData) {
                await sendReply(ctx, event, '你还没有签到记录哦~发送"签到"开始你的第一次签到！');
                return;
            }
            
            const todayCount = getTodayCheckinCount();
            const text = [
                `📊 ${userData.nickname} 的签到数据`,
                ``,
                `💰 累计积分: ${userData.totalPoints}`,
                `📅 累计签到: ${userData.totalCheckinDays} 天`,
                `🔥 连续签到: ${userData.consecutiveDays} 天`,
                ``,
                `📈 今日已有 ${todayCount} 人签到`,
            ];
            
            // 显示最近3次签到记录
            if (userData.checkinHistory.length > 0) {
                text.push(``, `📝 最近签到:`);
                const recentHistory = userData.checkinHistory.slice(-3).reverse();
                recentHistory.forEach(record => {
                    text.push(`   ${record.date} +${record.points}分 #${record.rank}`);
                });
            }
            
            await sendReply(ctx, event, text.join('\n'));
            
        } else if (type === 'group' && groupId) {
            // 群内排行 - 显示该群中签到过的用户
            // 注意：这里简化处理，显示全服排行中在该群的用户
            const sortedUsers = Array.from(allUsers.values())
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .slice(0, 10);
            
            const text = [
                `🏆 群内积分排行 TOP10`,
                ``,
                ...sortedUsers.map((user, index) => {
                    const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
                    return `${medal} ${user.nickname}`;
                }),
                ``,
                `💡 使用 "${pluginState.config.commandPrefix}我的积分" 查看个人详情`,
            ];
            
            await sendReply(ctx, event, text.join('\n'));
            
        } else if (type === 'global') {
            // 全服排行
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
