/**
 * 通用冷却管理工具
 * 提供统一的 CD 冷却管理功能
 */

const cooldownMap = new Map<string, number>();

/**
 * 创建冷却管理器
 * @param defaultSeconds 默认冷却秒数
 */
export function createCooldownManager(defaultSeconds: number = 60) {
    return {
        /**
         * 检查是否在冷却中
         * @param key 冷却唯一标识
         * @returns 剩余秒数，0 表示可用
         */
        check(key: string): number {
            const expireTime = cooldownMap.get(key);
            if (!expireTime) return 0;

            const remaining = Math.ceil((expireTime - Date.now()) / 1000);
            if (remaining <= 0) {
                cooldownMap.delete(key);
                return 0;
            }
            return remaining;
        },

        /**
         * 设置冷却
         * @param key 冷却唯一标识
         * @param seconds 冷却秒数（可选，默认使用创建时的默认值）
         */
        set(key: string, seconds?: number): void {
            const cdSeconds = seconds ?? defaultSeconds;
            if (cdSeconds <= 0) return;
            cooldownMap.set(key, Date.now() + cdSeconds * 1000);
        },

        /**
         * 清除冷却
         * @param key 冷却唯一标识
         */
        clear(key: string): void {
            cooldownMap.delete(key);
        },

        /**
         * 清除所有冷却
         */
        clearAll(): void {
            cooldownMap.clear();
        },
    };
}

/**
 * 默认的冷却管理器（60秒）
 */
export const defaultCooldown = createCooldownManager(60);

/**
 * 签到专用冷却管理器（5秒）
 */
export const checkinCooldown = createCooldownManager(5);
