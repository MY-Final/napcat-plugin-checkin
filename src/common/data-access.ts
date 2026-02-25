/**
 * 通用数据访问工具
 * 提供统一的数据读写接口
 */
import { pluginState } from '../core/state';

const DEFAULT_DATA = {};

/**
 * 读取数据文件
 */
export function readDataFile<T = any>(
    fileName: string,
    defaultValue: T = DEFAULT_DATA as T
): T {
    return pluginState.loadDataFile<T>(fileName, defaultValue);
}

/**
 * 写入数据文件
 */
export function writeDataFile<T = any>(
    fileName: string,
    data: T
): void {
    pluginState.saveDataFile(fileName, data);
}

/**
 * 读取或初始化数据
 */
export function getOrInitData<T extends object>(
    fileName: string,
    initFn: () => T
): T {
    const existing = readDataFile<T>(fileName);
    if (existing && Object.keys(existing).length > 0) {
        return existing;
    }
    const initialized = initFn();
    writeDataFile(fileName, initialized);
    return initialized;
}
