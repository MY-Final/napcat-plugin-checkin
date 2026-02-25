/**
 * 通用响应工具函数
 * 提供统一的 API 响应格式和错误处理
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';

export interface ApiResult<T = any> {
    code: number;
    data?: T;
    message?: string;
}

/**
 * 成功响应
 */
export function ok<T>(data?: T): ApiResult<T> {
    return {
        code: 0,
        data,
    };
}

/**
 * 失败响应
 */
export function fail(message: string, code: number = -1): ApiResult {
    return {
        code,
        message,
    };
}

/**
 * 包装路由处理函数，统一错误处理
 */
export function wrapHandler(
    ctx: NapCatPluginContext,
    handler: (req: any, res: any) => Promise<any>
) {
    return async (req: any, res: any) => {
        try {
            const result = await handler(req, res);
            if (result) {
                res.json(ok(result));
            }
        } catch (err: any) {
            ctx.logger.error('API 处理失败:', err);
            res.status(500).json(fail(err?.message || '操作失败'));
        }
    };
}

/**
 * 包装需要返回 JSON 的处理函数
 */
export function wrapJsonHandler<T>(
    ctx: NapCatPluginContext,
    handler: (req: any) => Promise<T>
) {
    return async (req: any, res: any) => {
        try {
            const data = await handler(req);
            res.json(ok(data));
        } catch (err: any) {
            ctx.logger.error('API 处理失败:', err);
            res.status(500).json(fail(err?.message || '操作失败'));
        }
    };
}
