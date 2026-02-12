/**
 * API 服务模块
 * 注册 WebUI API 路由 - 入口文件
 */

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';

// 导入各个路由模块
import { registerStatusRoutes } from './api/status-routes';
import { registerConfigRoutes } from './api/config-routes';
import { registerGroupRoutes } from './api/group-routes';
import { registerUserRoutes } from './api/user-routes';
import { registerStatsRoutes } from './api/stats-routes';
import { registerRankingRoutes } from './api/ranking-routes';
import { registerGroupCheckinRoutes } from './api/group-checkin-routes';
import { registerPointsRoutes } from './api/points-routes';
import { registerLeaderboardRoutes } from './api/leaderboard-routes';
import { registerTemplateRoutes } from './api/template-routes';
import { registerV1Routes } from './api/v1-routes';

/**
 * 注册 API 路由
 */
export function registerApiRoutes(ctx: NapCatPluginContext): void {
    // 插件信息
    registerStatusRoutes(ctx);
    
    // 配置管理
    registerConfigRoutes(ctx);
    
    // 群管理
    registerGroupRoutes(ctx);
    
    // 用户数据
    registerUserRoutes(ctx);
    
    // 签到统计
    registerStatsRoutes(ctx);
    
    // 排行榜
    registerRankingRoutes(ctx);
    
    // 群签到统计
    registerGroupCheckinRoutes(ctx);
    
    // 积分管理
    registerPointsRoutes(ctx);
    
    // 排行榜数据
    registerLeaderboardRoutes(ctx);
    
    // 模板预览
    registerTemplateRoutes(ctx);
    
    // v1 API (双轨制积分系统)
    registerV1Routes(ctx);

    ctx.logger.debug('API 路由注册完成');
}

// 导出工具函数供其他模块使用
export { calculateUserTotalBalance, getGroupFiles, extractGroupId, readGroupData, writeGroupData } from './api/api-utils';
