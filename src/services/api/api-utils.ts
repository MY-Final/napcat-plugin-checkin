/**
 * API路由工具函数
 */
import { pluginState } from '../../core/state';
import * as fs from 'fs';
import * as path from 'path';

const GROUP_DATA_PREFIX = 'checkin-group-';

/**
 * 计算用户在所有群中的总余额
 */
export function calculateUserTotalBalance(userId: string): number {
    try {
        const dataPath = pluginState.ctx.dataPath;
        let totalBalance = 0;

        if (!fs.existsSync(dataPath)) {
            return 0;
        }

        const files = fs.readdirSync(dataPath);
        const groupFiles = files.filter(file => file.startsWith(GROUP_DATA_PREFIX) && file.endsWith('.json'));

        for (const file of groupFiles) {
            const groupId = file.replace(GROUP_DATA_PREFIX, '').replace('.json', '');
            if (!groupId || groupId === 'global') continue;

            const filePath = path.join(dataPath, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(content);
                if (data.users && data.users[userId]) {
                    totalBalance += data.users[userId].balance || 0;
                }
            } catch {
                // 忽略单个文件读取错误
            }
        }

        return totalBalance;
    } catch (error) {
        pluginState.logger.error('计算用户总余额失败:', error);
        return 0;
    }
}

/**
 * 获取所有群文件列表
 */
export function getGroupFiles(): string[] {
    try {
        const dataPath = pluginState.ctx.dataPath;
        if (!fs.existsSync(dataPath)) {
            return [];
        }

        const files = fs.readdirSync(dataPath);
        return files.filter(file => file.startsWith(GROUP_DATA_PREFIX) && file.endsWith('.json'));
    } catch (error) {
        pluginState.logger.error('获取群文件列表失败:', error);
        return [];
    }
}

/**
 * 从文件名提取群ID
 */
export function extractGroupId(filename: string): string {
    return filename.replace(GROUP_DATA_PREFIX, '').replace('.json', '');
}

/**
 * 读取群数据文件
 */
export function readGroupData<T>(groupId: string, defaultValue: T): T {
    try {
        const dataPath = pluginState.ctx.dataPath;
        const filePath = path.join(dataPath, `${GROUP_DATA_PREFIX}${groupId}.json`);
        
        if (!fs.existsSync(filePath)) {
            return defaultValue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as T;
    } catch (error) {
        pluginState.logger.error(`读取群数据失败: ${groupId}`, error);
        return defaultValue;
    }
}

/**
 * 写入群数据文件
 */
export function writeGroupData<T>(groupId: string, data: T): boolean {
    try {
        const dataPath = pluginState.ctx.dataPath;
        const filePath = path.join(dataPath, `${GROUP_DATA_PREFIX}${groupId}.json`);
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (error) {
        pluginState.logger.error(`写入群数据失败: ${groupId}`, error);
        return false;
    }
}
