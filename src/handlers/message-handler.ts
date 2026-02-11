/**
 * 消息处理器
 *
 * 处理接收到的 QQ 消息事件，包含：
 * - 命令解析与分发
 * - CD 冷却管理
 * - 消息发送工具函数
 */

import type { OB11Message, OB11PostSendMsg } from 'napcat-types/napcat-onebot';
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';
import { handleCheckinCommand, handleCheckinAdmin, handleCheckinQuery, handleActiveRankingQuery } from './checkin-handler';
import { getCheckinCommands } from '../types';

// ==================== CD 冷却管理 ====================

/** CD 冷却记录 key: `${groupId}:${command}`, value: 过期时间戳 */
const cooldownMap = new Map<string, number>();

/**
 * 检查是否在 CD 中
 * @returns 剩余秒数，0 表示可用
 */
function getCooldownRemaining(groupId: number | string, command: string): number {
    const cdSeconds = pluginState.config.cooldownSeconds ?? 60;
    if (cdSeconds <= 0) return 0;

    const key = `${groupId}:${command}`;
    const expireTime = cooldownMap.get(key);
    if (!expireTime) return 0;

    const remaining = Math.ceil((expireTime - Date.now()) / 1000);
    if (remaining <= 0) {
        cooldownMap.delete(key);
        return 0;
    }
    return remaining;
}

/** 设置 CD 冷却 */
function setCooldown(groupId: number | string, command: string): void {
    const cdSeconds = pluginState.config.cooldownSeconds ?? 60;
    if (cdSeconds <= 0) return;
    cooldownMap.set(`${groupId}:${command}`, Date.now() + cdSeconds * 1000);
}

// ==================== 消息发送工具 ====================

/**
 * 发送消息（通用）
 * 根据消息类型自动发送到群或私聊
 *
 * @param ctx 插件上下文
 * @param event 原始消息事件（用于推断回复目标）
 * @param message 消息内容（支持字符串或消息段数组）
 */
export async function sendReply(
    ctx: NapCatPluginContext,
    event: OB11Message,
    message: OB11PostSendMsg['message']
): Promise<boolean> {
    try {
        const params: OB11PostSendMsg = {
            message,
            message_type: event.message_type,
            ...(event.message_type === 'group' && event.group_id
                ? { group_id: String(event.group_id) }
                : {}),
            ...(event.message_type === 'private' && event.user_id
                ? { user_id: String(event.user_id) }
                : {}),
        };
        await ctx.actions.call('send_msg', params, ctx.adapterName, ctx.pluginManager.config);
        return true;
    } catch (error) {
        pluginState.logger.error('发送消息失败:', error);
        return false;
    }
}

/**
 * 发送群消息
 */
export async function sendGroupMessage(
    ctx: NapCatPluginContext,
    groupId: number | string,
    message: OB11PostSendMsg['message']
): Promise<boolean> {
    try {
        const params: OB11PostSendMsg = {
            message,
            message_type: 'group',
            group_id: String(groupId),
        };
        await ctx.actions.call('send_msg', params, ctx.adapterName, ctx.pluginManager.config);
        return true;
    } catch (error) {
        pluginState.logger.error('发送群消息失败:', error);
        return false;
    }
}

/**
 * 发送私聊消息
 */
export async function sendPrivateMessage(
    ctx: NapCatPluginContext,
    userId: number | string,
    message: OB11PostSendMsg['message']
): Promise<boolean> {
    try {
        const params: OB11PostSendMsg = {
            message,
            message_type: 'private',
            user_id: String(userId),
        };
        await ctx.actions.call('send_msg', params, ctx.adapterName, ctx.pluginManager.config);
        return true;
    } catch (error) {
        pluginState.logger.error('发送私聊消息失败:', error);
        return false;
    }
}

// ==================== 权限检查 ====================

/**
 * 检查群聊中是否有管理员权限
 * 私聊消息默认返回 true
 */
export function isAdmin(event: OB11Message): boolean {
    if (event.message_type !== 'group') return true;
    const role = (event.sender as Record<string, unknown>)?.role;
    return role === 'admin' || role === 'owner';
}

// ==================== 消息处理主函数 ====================

/**
 * 消息处理主函数
 */
export async function handleMessage(ctx: NapCatPluginContext, event: OB11Message): Promise<void> {
    try {
        const rawMessage = event.raw_message || '';
        const messageType = event.message_type;
        const groupId = event.group_id;
        const userId = event.user_id;

        pluginState.ctx.logger.debug(`收到消息: ${rawMessage} | 类型: ${messageType}`);

        // 群消息：检查该群是否启用
        if (messageType === 'group' && groupId) {
            if (!pluginState.isGroupEnabled(String(groupId))) return;
        }

        // 检查签到命令（无需前缀，支持多个命令）
        const checkinCommands = getCheckinCommands(pluginState.config);
        const trimmedMessage = rawMessage.trim();
        const isCheckinCommand = pluginState.config.enableCheckin && checkinCommands.includes(trimmedMessage);
        
        if (isCheckinCommand) {
            // 检查该群是否启用签到
            if (messageType === 'group' && groupId) {
                const groupConfig = pluginState.config.groupConfigs[String(groupId)];
                if (groupConfig?.enableCheckin === false) {
                    return;
                }
            }
            await handleCheckinCommand(ctx, event);
            pluginState.incrementProcessed();
            return;
        }

        // 检查命令前缀
        const prefix = pluginState.config.commandPrefix || '#cmd';
        if (!rawMessage.startsWith(prefix)) return;

        // 解析命令参数
        const args = rawMessage.slice(prefix.length).trim().split(/\s+/);
        const subCommand = args[0]?.toLowerCase() || '';

        switch (subCommand) {
            case 'help': {
                const isGroup = messageType === 'group';
                const isAdminUser = isAdmin(event);
                
                // 获取所有签到命令用于显示
                const commands = getCheckinCommands(pluginState.config);
                const commandsText = commands.join(' / ');
                
                let helpText = [
                    `📋 签到插件帮助`,
                    ``,
                    `【基本功能】`,
                    `${commandsText} - 每日签到，获取积分`,
                    `${prefix}我的积分 - 查询个人积分和签到数据`,
                    `${prefix}积分排行 - 查看群内积分排行（群聊）`,
                    `${prefix}总排行 - 查看全服积分排行（按积分）`,
                    `${prefix}活跃排行 - 查看全服活跃排行（按使用天数，识别忠实用户）`,
                    ``,
                ];
                
                // 群管理命令
                if (isGroup && isAdminUser) {
                    helpText.push(
                        `【群管理】`,
                        `${prefix}开启签到 - 开启本群签到功能`,
                        `${prefix}关闭签到 - 关闭本群签到功能`,
                        ``
                    );
                }
                
                helpText.push(
                    `【其他】`,
                    `${prefix}help - 显示帮助信息`,
                    `${prefix}ping - 测试连通性`,
                    `${prefix}status - 查看运行状态`
                );
                
                await sendReply(ctx, event, helpText.join('\n'));
                break;
            }

            case 'ping': {
                // 群消息检查 CD
                if (messageType === 'group' && groupId) {
                    const remaining = getCooldownRemaining(groupId, 'ping');
                    if (remaining > 0) {
                        await sendReply(ctx, event, `请等待 ${remaining} 秒后再试`);
                        return;
                    }
                }

                await sendReply(ctx, event, 'pong!');
                if (messageType === 'group' && groupId) setCooldown(groupId, 'ping');
                pluginState.incrementProcessed();
                break;
            }

            case 'status': {
                const statusText = [
                    `[= 插件状态 =]`,
                    `运行时长: ${pluginState.getUptimeFormatted()}`,
                    `今日处理: ${pluginState.stats.todayProcessed}`,
                    `总计处理: ${pluginState.stats.processed}`,
                ].join('\n');
                await sendReply(ctx, event, statusText);
                break;
            }

            case '开启签到':
            case '关闭签到': {
                // 群管理命令：开启/关闭签到功能
                if (messageType !== 'group' || !groupId) {
                    await sendReply(ctx, event, '此命令只能在群聊中使用');
                    break;
                }
                
                // 检查权限
                if (!isAdmin(event)) {
                    await sendReply(ctx, event, '只有群主或管理员才能使用此命令');
                    break;
                }
                
                const enable = subCommand === '开启签到';
                pluginState.updateGroupConfig(String(groupId), { enableCheckin: enable });
                await sendReply(ctx, event, `✅ 已${enable ? '开启' : '关闭'}本群签到功能`);
                pluginState.logger.info(`群 ${groupId} 签到功能已${enable ? '开启' : '关闭'}`);
                break;
            }

            case '我的积分':
            case '积分':
            case '积分查询': {
                await handleCheckinQuery(ctx, event, 'self');
                pluginState.incrementProcessed();
                break;
            }

            case '群积分':
            case '群排名':
            case '积分排行': {
                if (messageType !== 'group' || !groupId) {
                    await sendReply(ctx, event, '此命令只能在群聊中使用');
                    break;
                }
                await handleCheckinQuery(ctx, event, 'group');
                pluginState.incrementProcessed();
                break;
            }

            case '总排行':
            case '排行榜': {
                await handleCheckinQuery(ctx, event, 'global');
                pluginState.incrementProcessed();
                break;
            }

            case '活跃排行':
            case '活跃榜': {
                await handleActiveRankingQuery(ctx, event);
                pluginState.incrementProcessed();
                break;
            }

            default: {
                // 未知命令不处理
                break;
            }
        }
    } catch (error) {
        pluginState.logger.error('处理消息时出错:', error);
    }
}
