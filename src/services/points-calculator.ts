/**
 * 积分计算器
 * 负责计算用户签到应获得的积分
 */

import type { CheckinPointsConfig } from '../types';

/**
 * 计算本次签到获得的积分
 * @param config 积分配置
 * @param consecutiveDays 当前连续签到天数
 * @returns 计算结果
 */
export function calculatePoints(
    config: CheckinPointsConfig,
    consecutiveDays: number
): { basePoints: number; bonusPoints: number; totalPoints: number; breakdown: string[] } {
    const breakdown: string[] = [];

    // 1. 基础随机积分
    const basePoints = Math.floor(
        Math.random() * (config.maxPoints - config.minPoints + 1) + config.minPoints
    );
    breakdown.push(`基础积分: ${basePoints}`);

    let bonusPoints = 0;

    // 2. 连续签到加成
    if (config.enableConsecutiveBonus && consecutiveDays > 1) {
        const consecutiveBonus = Math.min(
            (consecutiveDays - 1) * config.consecutiveBonusPerDay,
            config.maxConsecutiveBonus
        );
        bonusPoints += consecutiveBonus;
        if (consecutiveBonus > 0) {
            breakdown.push(`连续签到加成: +${consecutiveBonus} (${consecutiveDays}天)`);
        }
    }

    // 3. 周末加成
    if (config.enableWeekendBonus) {
        const today = new Date();
        const dayOfWeek = today.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            bonusPoints += config.weekendBonus;
            breakdown.push(`周末加成: +${config.weekendBonus}`);
        }
    }

    // 4. 特殊日期加成
    const todayStr = new Date().toISOString().split('T')[0];
    const specialDay = config.specialDays.find(day => day.date === todayStr);
    if (specialDay) {
        bonusPoints += specialDay.bonus;
        breakdown.push(`${specialDay.name}加成: +${specialDay.bonus}`);
    }

    const totalPoints = basePoints + bonusPoints;

    return {
        basePoints,
        bonusPoints,
        totalPoints,
        breakdown,
    };
}
