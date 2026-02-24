import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types'
import { registerStatusRoutes } from '../services/api/status-routes'
import { registerConfigRoutes } from '../services/api/config-routes'
import { registerGroupRoutes } from '../services/api/group-routes'
import { registerUserRoutes } from '../services/api/user-routes'
import { registerStatsRoutes } from '../services/api/stats-routes'
import { registerRankingRoutes } from '../services/api/ranking-routes'
import { registerGroupCheckinRoutes } from '../services/api/group-checkin-routes'
import { registerPointsRoutes } from '../services/api/points-routes'
import { registerLeaderboardRoutes } from '../services/api/leaderboard-routes'
import { registerTemplateRoutes } from '../services/api/template-routes'
import { registerTemplateManageRoutes } from '../services/api/template-manage-routes'
import { registerV1Routes } from '../services/api/v1-routes'
import { registerLogRoutes } from '../services/api/log-routes'

export function buildRouterBundle(ctx: NapCatPluginContext) {
  return {
    registerAll() {
      registerStatusRoutes(ctx)
      registerConfigRoutes(ctx)
      registerGroupRoutes(ctx)
      registerUserRoutes(ctx)
      registerStatsRoutes(ctx)
      registerRankingRoutes(ctx)
      registerGroupCheckinRoutes(ctx)
      registerPointsRoutes(ctx)
      registerLeaderboardRoutes(ctx)
      registerTemplateRoutes(ctx)
      registerTemplateManageRoutes(ctx)
      registerV1Routes(ctx)
      registerLogRoutes(ctx)
    }
  }
}
