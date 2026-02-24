/**
 * 签到服务工具函数
 * 包含日期格式化、周期计算等通用工具函数
 */

import { pluginState } from '../../core/state';
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';

/**
 * 获取今天的日期字符串 YYYY-MM-DD（基于配置的刷新时间）
 */
export function getTodayStr(): string {
    const now = new Date();
    const config = pluginState.config.checkinRefreshTime;
    
    // 创建刷新时间点（今天）
    const refreshTime = new Date(now);
    refreshTime.setHours(config.hour, config.minute, 0, 0);
    
    // 如果当前时间小于刷新时间，说明还在上一个周期
    if (now < refreshTime) {
        // 返回昨天的日期
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return formatDateToString(yesterday);
    }
    
    // 返回今天的日期（使用本地时区）
    return formatDateToString(now);
}

/**
 * 将 Date 对象格式化为 YYYY-MM-DD 字符串（本地时区）
 */
export function formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 获取当前周期标识（用于 weekly/monthly 周期判断）
 */
export function getCycleIdentifier(): string {
    const now = new Date();
    const config = pluginState.config.checkinRefreshTime;
    const cycleType = config.cycleType || 'daily';
    
    // 根据周期类型返回不同的标识
    switch (cycleType) {
        case 'weekly': {
            // 返回年份-周数
            const weekStart = new Date(now);
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 调整到周一
            weekStart.setDate(diff);
            return `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
        }
        case 'monthly': {
            // 返回年份-月份
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        case 'daily':
        default: {
            // 使用日期字符串
            return getTodayStr();
        }
    }
}

/**
 * 获取周数
 */
export function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * 获取指定日期的周期标识
 */
export function getCycleIdentifierForDate(date: Date): string {
    const config = pluginState.config.checkinRefreshTime;
    const cycleType = config.cycleType || 'daily';
    
    switch (cycleType) {
        case 'weekly': {
            const weekStart = new Date(date);
            const dayOfWeek = date.getDay();
            const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            weekStart.setDate(diff);
            return `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
        }
        case 'monthly': {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        case 'daily':
        default: {
            return formatDateToString(date);
        }
    }
}

/**
 * 获取当前时间字符串 HH:mm:ss
 */
export function getCurrentTimeStr(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
}
