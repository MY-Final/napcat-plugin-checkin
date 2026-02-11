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
    checkinCommands: ['签到', '打卡', 'sign', 'checkin'],
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
};

/**
 * 构建 WebUI 配置 Schema
 */
export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
    return ctx.NapCatConfig.combine(
        // 插件信息头部
        ctx.NapCatConfig.html(`
            <div style="padding: 16px; background: linear-gradient(135deg, #FB7299 0%, #FF8FB0 100%); border-radius: 12px; margin-bottom: 20px; color: white;">
                <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600;">✨ NapCat 签到插件</h3>
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
        ctx.NapCatConfig.array('checkinCommands', '签到命令列表', ['签到', '打卡', 'sign', 'checkin'], '触发签到的命令关键词列表，支持多个命令'),

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
    );
}
