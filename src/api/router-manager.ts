import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types'

// 从分组模块导入
import {
    registerStatusRoutes,
    registerConfigRoutes,
} from './routes/core'

import {
    registerGroupRoutes,
    registerGroupCheckinRoutes,
} from './routes/group'

import {
    registerUserRoutes,
} from './routes/user'

import {
    registerStatsRoutes,
    registerRankingRoutes,
    registerLeaderboardRoutes,
    registerPointsRoutes,
} from './routes/data'

import {
    registerTemplateRoutes,
    registerTemplateManageRoutes,
} from './routes/template'

import {
    registerV1Routes,
    registerLogRoutes,
} from './routes'

/**
 * 路由管理器 - 统一注册所有 API 路由
 * 按功能模块分组，便于维护和扩展
 */
export function buildRouterBundle(ctx: NapCatPluginContext) {
    return {
        registerAll() {
            // 核心路由
            registerStatusRoutes(ctx)
            registerConfigRoutes(ctx)

            // 群组路由
            registerGroupRoutes(ctx)
            registerGroupCheckinRoutes(ctx)

            // 用户路由
            registerUserRoutes(ctx)

            // 数据路由
            registerStatsRoutes(ctx)
            registerRankingRoutes(ctx)
            registerLeaderboardRoutes(ctx)
            registerPointsRoutes(ctx)

            // 模板路由
            registerTemplateRoutes(ctx)
            registerTemplateManageRoutes(ctx)

            // 其他路由
            registerV1Routes(ctx)
            registerLogRoutes(ctx)
        }
    }
}
