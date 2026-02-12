/**
 * 配置路由 - 插件配置管理API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../../core/state';
import type { PluginConfig } from '../../types';

export function registerConfigRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    /** 获取配置（无需鉴权，公开信息） */
    router.getNoAuth('/config', (_req, res) => {
        res.json({ code: 0, data: pluginState.config });
    });

    /** 保存配置（需要鉴权） */
    router.post('/config', async (req, res) => {
        try {
            const body = req.body as Record<string, unknown> | undefined;
            if (!body) {
                return res.status(400).json({ code: -1, message: '请求体为空' });
            }
            pluginState.updateConfig(body as Partial<PluginConfig>);
            ctx.logger.info('配置已保存');
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('保存配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });
}
