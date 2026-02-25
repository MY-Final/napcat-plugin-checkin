import type { ApiEndpoint, Section } from '../types/api';
import { IconBook, IconTerminal } from '../components/icons';

export function getSectionEndpoints(sectionId: string, API_ENDPOINTS: ApiEndpoint[]): ApiEndpoint[] {
    const sectionMap: Record<string, string[]> = {
        'core': ['核心接口'],
        'checkin-data': ['签到数据'],
        'user-data': ['用户数据'],
        'group-checkin': ['群签到数据'],
        'ranking': ['积分排行'],
        'points': ['积分管理'],
        'leaderboard': ['排行榜数据'],
        'logs': ['签到日志'],
        'v1-points': ['v1积分'],
        'template-service': ['模板服务'],
        'template-manage': ['模板管理'],
        'config': ['插件配置'],
    };
    const sectionNames = sectionMap[sectionId] || [];
    return sectionNames.flatMap(name => {
        const sections: Record<string, ApiEndpoint[]> = {
            '核心接口': API_ENDPOINTS.filter(e => ['status'].includes(e.id)),
            '签到数据': API_ENDPOINTS.filter(e => ['today-stats', 'active-ranking', 'checkin-stats', 'groups', 'update-group-config', 'bulk-group-config'].includes(e.id)),
            '用户数据': API_ENDPOINTS.filter(e => ['user-checkin-data', 'user-balance', 'all-users'].includes(e.id)),
            '群签到数据': API_ENDPOINTS.filter(e => ['group-stats', 'all-groups-stats', 'group-ranking', 'group-checkin-ranking'].includes(e.id)),
            '积分排行': API_ENDPOINTS.filter(e => ['global-ranking'].includes(e.id)),
            '积分管理': API_ENDPOINTS.filter(e => ['get-user-points', 'update-user-points', 'get-points-history', 'reset-user-points'].includes(e.id)),
            '排行榜数据': API_ENDPOINTS.filter(e => ['leaderboard', 'cleanup'].includes(e.id)),
            '签到日志': API_ENDPOINTS.filter(e => ['logs', 'logs-stats', 'logs-trend', 'logs-user', 'logs-group', 'logs-detail', 'logs-user-count', 'logs-group-count', 'logs-config', 'logs-config-detail', 'logs-config-update', 'logs-cleanup'].includes(e.id)),
            'v1积分': API_ENDPOINTS.filter(e => ['v1-award', 'v1-consume', 'v1-balance-check', 'v1-points', 'v1-transactions', 'v1-levels-config', 'v1-user-level', 'v1-titles', 'v1-user-titles', 'v1-equip-title', 'v1-ranking-exp', 'v1-ranking-balance'].includes(e.id)),
            '模板服务': API_ENDPOINTS.filter(e => ['template-preview'].includes(e.id)),
            '模板管理': API_ENDPOINTS.filter(e => ['templates-list', 'templates-get', 'templates-by-type', 'templates-create', 'templates-update', 'templates-delete', 'templates-duplicate', 'templates-set-default', 'templates-config-get', 'templates-config-save', 'templates-init'].includes(e.id)),
            '插件配置': API_ENDPOINTS.filter(e => ['get-config', 'post-config'].includes(e.id)),
        };
        return sections[name] || [];
    });
}

export const sections: Section[] = [
    { key: '快速开始', id: 'quickstart', icon: IconTerminal },
    { key: '核心接口', id: 'core', icon: IconBook },
    { key: '签到数据', id: 'checkin-data', icon: IconBook },
    { key: '用户数据', id: 'user-data', icon: IconBook },
    { key: '群签到数据', id: 'group-checkin', icon: IconBook },
    { key: '积分排行', id: 'ranking', icon: IconBook },
    { key: '积分管理', id: 'points', icon: IconBook },
    { key: '排行榜数据', id: 'leaderboard', icon: IconBook },
    { key: '签到日志', id: 'logs', icon: IconBook },
    { key: 'v1积分', id: 'v1-points', icon: IconBook },
    { key: '模板服务', id: 'template-service', icon: IconBook },
    { key: '模板管理', id: 'template-manage', icon: IconBook },
    { key: '插件配置', id: 'config', icon: IconBook },
];

export const sectionIdMap: Record<string, string> = {
    '快速开始': 'quickstart',
    '核心接口': 'core',
    '签到数据': 'checkin-data',
    '用户数据': 'user-data',
    '群签到数据': 'group-checkin',
    '积分排行': 'ranking',
    '积分管理': 'points',
    '排行榜数据': 'leaderboard',
    '签到日志': 'logs',
    'v1积分': 'v1-points',
    '模板服务': 'template-service',
    '模板管理': 'template-manage',
    '插件配置': 'config',
};

export const sectionNames: Record<string, string> = {
    'quickstart': '快速开始',
    'core': '核心接口',
    'checkin-data': '签到数据',
    'user-data': '用户数据',
    'group-checkin': '群签到数据',
    'ranking': '积分排行',
    'points': '积分管理',
    'leaderboard': '排行榜数据',
    'logs': '签到日志',
    'v1-points': 'v1积分',
    'template-service': '模板服务',
    'template-manage': '模板管理',
    'config': '插件配置',
};

export function isSectionId(id: string): boolean {
    return id in sectionNames && id !== 'quickstart';
}
