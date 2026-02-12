/**
 * 插件配置模块
 * 定义默认配置值和 WebUI 配置 Schema
 */

import type { NapCatPluginContext, PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin/types';
import type { PluginConfig } from './types';

/** 默认配置 */
export const DEFAULT_CONFIG: PluginConfig = {
    enabled: true,
    debug: false,
    commandPrefix: '#cmd',
    cooldownSeconds: 60,
    groupConfigs: {},
    enableCheckin: true,
    checkinCommands: '签到,打卡,sign,checkin',
    checkinReplyMode: 'auto',
    checkinPoints: {
        minPoints: 10,
        maxPoints: 50,
        enableConsecutiveBonus: true,
        consecutiveBonusPerDay: 2,
        maxConsecutiveBonus: 20,
        enableWeekendBonus: false,
        weekendBonus: 5,
        specialDays: [],
    },
    checkinRefreshTime: {
        hour: 0,
        minute: 0,
        cycleType: 'daily',
        cycleCount: 1,
    },
    enableLeaderboard: true,
    leaderboardCommands: '排行榜,排行,rank',
    leaderboardTopCount: 10,
    leaderboardReplyMode: 'auto',
};

/**
 * 构建 WebUI 配置 Schema
 */
export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
    return ctx.NapCatConfig.combine(
        // 插件信息头部
        ctx.NapCatConfig.html(`
            <div style="padding: 16px; background: #FB7299; border-radius: 12px; margin-bottom: 20px; color: white;">
                <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600;">NapCat 签到插件</h3>
                <p style="margin: 0; font-size: 13px; opacity: 0.9">精美卡片式签到系统，支持连续签到加成和积分统计</p>
            </div>
        `),

        // 基础设置
        ctx.NapCatConfig.plainText('📋 基础设置'),
        ctx.NapCatConfig.boolean('enabled', '启用插件', true, '是否启用此插件的功能'),
        ctx.NapCatConfig.boolean('debug', '调试模式', false, '启用后将输出详细的调试日志'),
        ctx.NapCatConfig.text('commandPrefix', '命令前缀', '#cmd', '触发命令的前缀，默认为 #cmd'),
        ctx.NapCatConfig.number('cooldownSeconds', '冷却时间（秒）', 60, '同一命令请求冷却时间，0 表示不限制'),

        // 签到功能设置
        ctx.NapCatConfig.plainText(' '),
        ctx.NapCatConfig.plainText('📅 签到功能设置'),
        ctx.NapCatConfig.boolean('enableCheckin', '启用签到功能', true, '是否启用签到功能'),
        ctx.NapCatConfig.text('checkinCommands', '签到命令列表', '签到,打卡,sign,checkin', '触发签到的命令关键词，多个命令用英文逗号分隔'),
        ctx.NapCatConfig.text('checkinReplyMode', '签到回复模式', 'auto', 'text=文字, image=图片, auto=自动（有canvas用图片）'),

        // 积分设置
        ctx.NapCatConfig.plainText(' '),
        ctx.NapCatConfig.plainText('💎 积分设置'),
        ctx.NapCatConfig.number('checkinPoints.minPoints', '最小积分', 10, '每次签到最少获得的基础积分'),
        ctx.NapCatConfig.number('checkinPoints.maxPoints', '最大积分', 50, '每次签到最多获得的基础积分'),

        // 连续签到加成
        ctx.NapCatConfig.plainText(' '),
        ctx.NapCatConfig.plainText('🔥 连续签到加成'),
        ctx.NapCatConfig.boolean('checkinPoints.enableConsecutiveBonus', '启用连续签到加成', true, '是否启用连续签到额外加成'),
        ctx.NapCatConfig.number('checkinPoints.consecutiveBonusPerDay', '每天加成点数', 2, '每连续签到一天额外获得的积分'),
        ctx.NapCatConfig.number('checkinPoints.maxConsecutiveBonus', '最大加成上限', 20, '连续签到加成的上限值'),

        // 周末加成
        ctx.NapCatConfig.plainText(' '),
        ctx.NapCatConfig.plainText('🌟 周末加成'),
        ctx.NapCatConfig.boolean('checkinPoints.enableWeekendBonus', '启用周末加成', false, '是否在周末给予额外加成'),
        ctx.NapCatConfig.number('checkinPoints.weekendBonus', '周末加成点数', 5, '周末签到的额外加成积分'),

        // 签到时间设置
        ctx.NapCatConfig.plainText(' '),
        ctx.NapCatConfig.plainText('签到时间设置'),
        ctx.NapCatConfig.number('checkinRefreshTime.hour', '每日刷新时间（小时）', 0, '每天几点开始算新的一天（0-23），默认0点'),
        ctx.NapCatConfig.number('checkinRefreshTime.minute', '每日刷新时间（分钟）', 0, '每天几分开始算新的一天（0-59），默认0分'),
        ctx.NapCatConfig.select('checkinRefreshTime.cycleType', '签到周期类型', [
            { label: '每日', value: 'daily' },
            { label: '每周', value: 'weekly' },
            { label: '每月', value: 'monthly' },
        ], 'daily', '设置签到周期'),
        ctx.NapCatConfig.number('checkinRefreshTime.cycleCount', '周期内可签到次数', 1, '每个周期内可以签到的次数（1=每天1次，2=每天2次等）'),

        // 排行榜设置
        ctx.NapCatConfig.plainText(' '),
        ctx.NapCatConfig.plainText('排行榜设置'),
        ctx.NapCatConfig.boolean('enableLeaderboard', '启用排行榜功能', true, '是否启用积分排行榜功能'),
        ctx.NapCatConfig.text('leaderboardCommands', '排行榜命令列表', '排行榜,排行,rank', '触发排行榜的命令关键词，多个命令用英文逗号分隔'),
        ctx.NapCatConfig.number('leaderboardTopCount', '排行榜显示数量', 10, '排行榜显示前几名（1-50）'),
        ctx.NapCatConfig.select('leaderboardReplyMode', '排行榜回复模式', [
            { label: '文字', value: 'text' },
            { label: '图片', value: 'image' },
            { label: '自动（优先图片）', value: 'auto' },
        ], 'auto', '选择排行榜的展示方式，auto模式下会优先尝试生成图片'),
    );
}
