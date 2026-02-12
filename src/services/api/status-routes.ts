/**
 * 状态路由 - 插件状态相关API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../../core/state';

export function registerStatusRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    /** 获取插件状态 */
    router.getNoAuth('/status', (_req, res) => {
        res.json({
            code: 0,
            data: {
                pluginName: ctx.pluginName,
                uptime: pluginState.getUptime(),
                uptimeFormatted: pluginState.getUptimeFormatted(),
                config: pluginState.config,
                stats: pluginState.stats,
            },
        });
    });
}
