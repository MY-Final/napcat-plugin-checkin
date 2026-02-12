/**
 * 等级与称号配置
 */

import type { LevelConfig, TitleDefinition } from '../types';

/**
 * 等级配置表
 * 共7个等级，从初来乍到（Lv.1）到神话存在（Lv.7）
 */
export const LEVEL_CONFIG: LevelConfig[] = [
    {
        level: 1,
        name: '初来乍到',
        minExp: 0,
        icon: '🌱',
        color: '#8B4513',
        privileges: { signinBonus: 0 },
    },
    {
        level: 2,
        name: '活跃分子',
        minExp: 100,
        icon: '🌿',
        color: '#228B22',
        privileges: { signinBonus: 1 },
    },
    {
        level: 3,
        name: '群友达人',
        minExp: 500,
        icon: '🌳',
        color: '#32CD32',
        privileges: { signinBonus: 1.5 },
    },
    {
        level: 4,
        name: '资深群友',
        minExp: 2000,
        icon: '⭐',
        color: '#FFD700',
        privileges: { signinBonus: 2 },
    },
    {
        level: 5,
        name: '名动全群',
        minExp: 5000,
        icon: '👑',
        color: '#FF1493',
        privileges: { signinBonus: 2.5 },
    },
    {
        level: 6,
        name: '传说大佬',
        minExp: 10000,
        icon: '💎',
        color: '#00CED1',
        privileges: { signinBonus: 3 },
    },
    {
        level: 7,
        name: '神话存在',
        minExp: 50000,
        icon: '🌟',
        color: '#FF4500',
        privileges: { signinBonus: 3.5 },
    },
];

/**
 * 默认称号配置
 * 每个群可以自定义自己的称号列表
 */
export const DEFAULT_TITLES: TitleDefinition[] = [
    // 等级称号（自动授予）
    {
        id: 'level_1',
        name: '初来乍到',
        description: '刚加入群聊的新朋友',
        icon: '🌱',
        color: '#8B4513',
        acquireType: 'level',
        acquireCondition: 1,
        expireDays: 0,
    },
    {
        id: 'level_2',
        name: '活跃分子',
        description: '开始活跃在群里的成员',
        icon: '🌿',
        color: '#228B22',
        acquireType: 'level',
        acquireCondition: 2,
        expireDays: 0,
    },
    {
        id: 'level_3',
        name: '群友达人',
        description: '已经成为群里的熟面孔',
        icon: '🌳',
        color: '#32CD32',
        acquireType: 'level',
        acquireCondition: 3,
        expireDays: 0,
    },
    {
        id: 'level_4',
        name: '资深群友',
        description: '群里的资深成员，深受大家喜爱',
        icon: '⭐',
        color: '#FFD700',
        acquireType: 'level',
        acquireCondition: 4,
        expireDays: 0,
    },
    {
        id: 'level_5',
        name: '名动全群',
        description: '在群里已经非常有名望了',
        icon: '👑',
        color: '#FF1493',
        acquireType: 'level',
        acquireCondition: 5,
        expireDays: 0,
    },
    {
        id: 'level_6',
        name: '传说大佬',
        description: '群里的传说级人物',
        icon: '💎',
        color: '#00CED1',
        acquireType: 'level',
        acquireCondition: 6,
        expireDays: 0,
    },
    {
        id: 'level_7',
        name: '神话存在',
        description: '传说中的神话级存在',
        icon: '🌟',
        color: '#FF4500',
        acquireType: 'level',
        acquireCondition: 7,
        expireDays: 0,
    },
    
    // 特殊称号（限时）
    {
        id: 'early_bird',
        name: '早起的鸟儿',
        description: '连续7天在8点前签到',
        icon: '🐦',
        color: '#FFA500',
        acquireType: 'special',
        acquireCondition: 'early_checkin_7',
        expireDays: 30,
    },
    {
        id: 'night_owl',
        name: '夜猫子',
        description: '连续7天在23点后签到',
        icon: '🦉',
        color: '#4B0082',
        acquireType: 'special',
        acquireCondition: 'late_checkin_7',
        expireDays: 30,
    },
    {
        id: 'checkin_master',
        name: '签到达人',
        description: '连续30天签到不断',
        icon: '📅',
        color: '#FF6347',
        acquireType: 'days',
        acquireCondition: 30,
        expireDays: 0,
    },
    {
        id: 'wealthy',
        name: '小富翁',
        description: '余额达到1000分',
        icon: '💰',
        color: '#FFD700',
        acquireType: 'exp',
        acquireCondition: 1000,
        expireDays: 0,
    },
];

/**
 * 根据经验值计算等级
 */
export function calculateLevel(totalExp: number): LevelConfig {
    // 从高到低遍历，找到第一个满足条件的等级
    for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
        if (totalExp >= LEVEL_CONFIG[i].minExp) {
            return LEVEL_CONFIG[i];
        }
    }
    return LEVEL_CONFIG[0];
}

/**
 * 计算升级所需经验值
 */
export function getExpToNextLevel(currentExp: number): number | undefined {
    const currentLevel = calculateLevel(currentExp);
    const nextLevelIndex = LEVEL_CONFIG.findIndex(l => l.level === currentLevel.level + 1);
    
    if (nextLevelIndex === -1) {
        return undefined; // 已满级
    }
    
    return LEVEL_CONFIG[nextLevelIndex].minExp - currentExp;
}

/**
 * 计算签到加成
 */
export function calculateSigninBonus(basePoints: number, level: number): number {
    const levelConfig = LEVEL_CONFIG.find(l => l.level === level);
    if (!levelConfig) return basePoints;
    
    return basePoints + levelConfig.privileges.signinBonus;
}
