/**
 * 日期工具函数
 */

/**
 * 获取今天的日期字符串 YYYY-MM-DD（基于配置的刷新时间）
 */
export function getTodayStr(): string {
    const now = new Date();
    
    // 创建刷新时间点（今天）
    const refreshTime = new Date(now);
    refreshTime.setHours(0, 0, 0, 0);
    
    // 如果当前时间已经过了刷新时间，使用今天的日期
    // 否则使用昨天的日期
    if (now >= refreshTime) {
        return now.toISOString().split('T')[0];
    } else {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }
}

/**
 * 获取当前周期标识符（用于排行榜等）
 */
export function getCycleIdentifier(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const week = getWeekNumber(now);
    
    return `${year}-${month}-W${week}`;
}

/**
 * 获取指定日期的周期标识符
 */
export function getCycleIdentifierForDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const week = getWeekNumber(date);
    
    return `${year}-${month}-W${week}`;
}

/**
 * 获取日期所在的周数
 */
export function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * 获取当前时间字符串 HH:mm:ss
 */
export function getCurrentTimeStr(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
}
