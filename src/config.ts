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
 * 插件列表页简化为仅保留启用开关，详细配置请前往 WebUI 控制台
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

        // 启用开关
        ctx.NapCatConfig.boolean('enabled', '启用插件', true, '是否启用此插件的功能'),

        // WebUI 提示
        ctx.NapCatConfig.html(`
            <div style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 10px; display: flex; gap: 10px; align-items: center; font-family: system-ui, -apple-system, sans-serif;">
                <div style="color: #6b7280; flex-shrink: 0;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </div>
                <div style="font-size: 13px; color: #4b5563;">
                    更多高级配置（命令设置、积分规则、排行榜等）请前往 
                    <a href="/plugin/napcat-plugin-checkin/page/dashboard" target="_top" style="color: #FB7299; text-decoration: none; font-weight: 600; transition: opacity 0.2s;">WebUI 控制台</a>
                    进行管理。
                </div>
            </div>
        `),
    );
}
