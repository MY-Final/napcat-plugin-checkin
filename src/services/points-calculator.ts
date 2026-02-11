/**
 * 积分计算器
 * 负责计算用户签到应获得的积分
 */

import type { CheckinPointsConfig, PointsBreakdown } from '../types';

/**
 * 计算本次签到获得的积分
 * @param config 积分配置
 * @param consecutiveDays 当前连续签到天数
 * @returns 计算结果
 */
export function calculatePoints(
    config: CheckinPointsConfig,
    consecutiveDays: number
): { basePoints: number; bonusPoints: number; totalPoints: number; breakdown: PointsBreakdown } {
    const breakdown: PointsBreakdown = {
        base: 0,
        consecutiveBonus: 0,
        weekendBonus: 0,
        specialDayBonus: 0,
    };

    // 1. 基础随机积分
    const basePoints = Math.floor(
        Math.random() * (config.maxPoints - config.minPoints + 1) + config.minPoints
    );
    breakdown.base = basePoints;

    let bonusPoints = 0;

    // 2. 连续签到加成
    if (config.enableConsecutiveBonus && consecutiveDays > 1) {
        const consecutiveBonus = Math.min(
            (consecutiveDays - 1) * config.consecutiveBonusPerDay,
            config.maxConsecutiveBonus
        );
        bonusPoints += consecutiveBonus;
        breakdown.consecutiveBonus = consecutiveBonus;
    }

    // 3. 周末加成
    if (config.enableWeekendBonus) {
        const today = new Date();
        const dayOfWeek = today.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            bonusPoints += config.weekendBonus;
            breakdown.weekendBonus = config.weekendBonus;
        }
    }

    // 4. 特殊日期加成
    const todayStr = new Date().toISOString().split('T')[0];
    const specialDay = config.specialDays.find(day => day.date === todayStr);
    if (specialDay) {
        bonusPoints += specialDay.bonus;
        breakdown.specialDayBonus = specialDay.bonus;
    }

    const totalPoints = basePoints + bonusPoints;

    return {
        basePoints,
        bonusPoints,
        totalPoints,
        breakdown,
    };
}
