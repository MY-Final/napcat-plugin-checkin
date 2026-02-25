// API 路由总入口 - 统一导出所有路由注册函数
export * from './core'
export * from './group'
export * from './user'
export * from './data'
export * from './template'

// 其他独立路由
export { registerV1Routes } from '../../services/api/v1-routes'
export { registerLogRoutes } from '../../services/api/log-routes'
