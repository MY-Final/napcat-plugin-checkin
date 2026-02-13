/**
 * 全局状态管理模块（单例模式）
 *
 * 封装插件的配置持久化和运行时状态，提供在项目任意位置访问
 * ctx、config、logger 等对象的能力，无需逐层传递参数。
 *
 * 使用方法：
 *   import { pluginState } from '../core/state';
 *   pluginState.config.enabled;       // 读取配置
 *   pluginState.ctx.logger.info(...); // 使用日志
 */

import fs from 'fs';
import path from 'path';
import type { NapCatPluginContext, PluginLogger } from 'napcat-types/napcat-onebot/network/plugin/types';
import { DEFAULT_CONFIG } from '../config';
import type { PluginConfig, GroupConfig } from '../types';

// ==================== 配置清洗工具 ====================

function isObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * 配置清洗函数
 * 确保从文件读取的配置符合预期类型，防止运行时错误
 */
function sanitizeConfig(raw: unknown): PluginConfig {
    if (!isObject(raw)) return { ...DEFAULT_CONFIG, groupConfigs: {} };

    const out: PluginConfig = { ...DEFAULT_CONFIG, groupConfigs: {} };

    if (typeof raw.enabled === 'boolean') out.enabled = raw.enabled;
    if (typeof raw.debug === 'boolean') out.debug = raw.debug;
    if (typeof raw.commandPrefix === 'string') out.commandPrefix = raw.commandPrefix;
    if (typeof raw.cooldownSeconds === 'number') out.cooldownSeconds = raw.cooldownSeconds;

    // 群配置清洗
    if (isObject(raw.groupConfigs)) {
        for (const [groupId, groupConfig] of Object.entries(raw.groupConfigs)) {
            if (isObject(groupConfig)) {
                const cfg: GroupConfig = {};
                if (typeof groupConfig.enabled === 'boolean') cfg.enabled = groupConfig.enabled;
                // TODO: 在这里添加你的群配置项清洗
                out.groupConfigs[groupId] = cfg;
            }
        }
    }

    // 签到刷新时间配置清洗
    if (isObject(raw.checkinRefreshTime)) {
        const refreshTime = raw.checkinRefreshTime;
        if (typeof refreshTime.hour === 'number') out.checkinRefreshTime.hour = Math.max(0, Math.min(23, refreshTime.hour));
        if (typeof refreshTime.minute === 'number') out.checkinRefreshTime.minute = Math.max(0, Math.min(59, refreshTime.minute));
        if (typeof refreshTime.cycleType === 'string' && ['daily', 'weekly', 'monthly'].includes(refreshTime.cycleType)) {
            out.checkinRefreshTime.cycleType = refreshTime.cycleType as 'daily' | 'weekly' | 'monthly';
        }
        if (typeof refreshTime.cycleCount === 'number') out.checkinRefreshTime.cycleCount = Math.max(1, refreshTime.cycleCount);
    }

    // 排行榜配置清洗
    if (typeof raw.enableLeaderboard === 'boolean') out.enableLeaderboard = raw.enableLeaderboard;
    if (typeof raw.leaderboardCommands === 'string') out.leaderboardCommands = raw.leaderboardCommands;
    if (typeof raw.leaderboardTopCount === 'number') out.leaderboardTopCount = Math.max(1, Math.min(50, raw.leaderboardTopCount));

    return out;
}

// ==================== 插件全局状态类 ====================

class PluginState {
    /** NapCat 插件上下文（init 后可用） */
    private _ctx: NapCatPluginContext | null = null;

    /** 插件配置 */
    config: PluginConfig = { ...DEFAULT_CONFIG };

    /** 插件启动时间戳 */
    startTime: number = 0;

    /** 机器人自身 QQ 号 */
    selfId: string = '';

    /** 活跃的定时器 Map: jobId -> NodeJS.Timeout */
    timers: Map<string, ReturnType<typeof setInterval>> = new Map();

    /** 运行时统计 */
    stats = {
        processed: 0,
        todayProcessed: 0,
        lastUpdateDay: new Date().toDateString(),
    };

    /** 获取上下文（确保已初始化） */
    get ctx(): NapCatPluginContext {
        if (!this._ctx) throw new Error('PluginState 尚未初始化，请先调用 init()');
        return this._ctx;
    }

    /** 获取日志器的快捷方式 */
    get logger(): PluginLogger {
        return this.ctx.logger;
    }

    // ==================== 生命周期 ====================

    /**
     * 初始化（在 plugin_init 中调用）
     */
    init(ctx: NapCatPluginContext): void {
        this._ctx = ctx;
        this.startTime = Date.now();
        this.ensureDataDir();
        this.checkAndRepairData(); // 检查并修复数据
        this.migrateToDualTrackSystem(); // 迁移到双轨制
        this.loadConfig();
        this.fetchSelfId();
    }

    /**
     * 获取机器人自身 QQ 号（异步，init 时自动调用）
     */
    private async fetchSelfId(): Promise<void> {
        try {
            const res = await this.ctx.actions.call(
                'get_login_info', {}, this.ctx.adapterName, this.ctx.pluginManager.config
            ) as { user_id?: number | string };
            if (res?.user_id) {
                this.selfId = String(res.user_id);
                this.logger.debug("(｡·ω·｡) 机器人 QQ: " + this.selfId);
            }
        } catch (e) {
            this.logger.warn("[警告] 获取机器人 QQ 号失败:", e);
        }
    }

    /**
     * 清理（在 plugin_cleanup 中调用）
     */
    cleanup(): void {
        // 清理所有定时器
        for (const [jobId, timer] of this.timers) {
            clearInterval(timer);
            this.logger.debug(`(｡-ω-) 清理定时器: ${jobId}`);
        }
        this.timers.clear();
        this.saveConfig();
        this._ctx = null;
    }

    // ==================== 数据目录 ====================

    /** 确保数据目录存在 */
    private ensureDataDir(): void {
        const dataPath = this.ctx.dataPath;
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }
    }

    /** 获取数据文件完整路径 */
    getDataFilePath(filename: string): string {
        return path.join(this.ctx.dataPath, filename);
    }

    // ==================== 通用数据文件读写 ====================

    /**
     * 检查数据是否为空或无效
     * 空对象、空数组、null、undefined 都被视为无效数据
     */
    private isDataEmptyOrInvalid<T>(data: T): boolean {
        if (data === null || data === undefined) return true;
        if (typeof data !== 'object') return false; // 原始类型不算无效
        
        // 检查对象是否为空
        if (Array.isArray(data)) {
            return data.length === 0;
        }
        
        // 检查对象是否有任何属性
        return Object.keys(data).length === 0;
    }

    /**
     * 获取多版本备份文件路径
     * @param filePath 主文件路径
     * @param version 备份版本号（1-5）
     */
    private getBackupPath(filePath: string, version: number = 1): string {
        return version === 1 ? `${filePath}.backup` : `${filePath}.backup.${version}`;
    }

    /**
     * 轮转备份文件（保留最近5个版本）
     * backup.5 -> backup.4 -> backup.3 -> backup.2 -> backup.1 -> backup
     */
    private rotateBackups(filePath: string): void {
        try {
            // 删除最旧的备份（版本5）
            const oldestBackup = this.getBackupPath(filePath, 5);
            if (fs.existsSync(oldestBackup)) {
                fs.unlinkSync(oldestBackup);
            }
            
            // 依次移动备份文件：4->5, 3->4, 2->3, 1->2
            for (let i = 4; i >= 1; i--) {
                const oldPath = this.getBackupPath(filePath, i);
                const newPath = this.getBackupPath(filePath, i + 1);
                if (fs.existsSync(oldPath)) {
                    fs.renameSync(oldPath, newPath);
                }
            }
            
            // 将当前备份移动到版本1
            const currentBackup = this.getBackupPath(filePath, 1);
            if (fs.existsSync(currentBackup)) {
                const version1Path = this.getBackupPath(filePath, 2);
                fs.renameSync(currentBackup, version1Path);
            }
        } catch (e) {
            this.logger.debug(`[备份轮转] 轮转备份文件失败: ${e}`);
        }
    }

    /**
     * 尝试从备份恢复数据（支持多版本）
     * @param filePath 主文件路径
     * @returns 恢复的数据或null
     */
    private tryRestoreFromBackup<T>(filePath: string): T | null {
        // 尝试从最新到最旧的备份恢复
        for (let i = 1; i <= 5; i++) {
            const backupPath = this.getBackupPath(filePath, i);
            if (fs.existsSync(backupPath)) {
                try {
                    const content = fs.readFileSync(backupPath, 'utf-8');
                    const data = JSON.parse(content);
                    
                    // 验证恢复的数据是否有效
                    if (!this.isDataEmptyOrInvalid(data)) {
                        // 恢复主文件
                        fs.copyFileSync(backupPath, filePath);
                        const versionText = i === 1 ? '最新' : `版本${i}`;
                        this.logger.info(`(｡･ω･｡) 已从${versionText}备份恢复数据文件`);
                        return data;
                    }
                } catch (e) {
                    this.logger.debug(`[数据恢复] 备份版本${i}无效，尝试更旧的备份`);
                    continue;
                }
            }
        }
        return null;
    }

    /**
     * 读取 JSON 数据文件
     * 增强版：支持空数据检测、多版本备份恢复
     * @param filename 数据文件名（如 'subscriptions.json'）
     * @param defaultValue 文件不存在或解析失败时的默认值
     * @param options 可选配置
     */
    loadDataFile<T>(
        filename: string, 
        defaultValue: T, 
        options?: { 
            validateEmpty?: boolean;  // 是否验证数据为空
            dataKey?: string;         // 检查的数据键名（如 'users'）
        }
    ): T {
        const filePath = this.getDataFilePath(filename);
        const validateEmpty = options?.validateEmpty ?? true;
        const dataKey = options?.dataKey;
        
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(content);
                
                // 检查数据是否为空（如果启用验证）
                if (validateEmpty) {
                    const dataToCheck = dataKey && typeof data === 'object' && data !== null 
                        ? (data as Record<string, unknown>)[dataKey] 
                        : data;
                    
                    if (this.isDataEmptyOrInvalid(dataToCheck)) {
                        this.logger.warn(`[数据保护] 数据文件 ${filename} 内容为空或无效，尝试从备份恢复`);
                        const restoredData = this.tryRestoreFromBackup<T>(filePath);
                        if (restoredData !== null) {
                            return restoredData;
                        }
                        this.logger.error(`(╥﹏╥) 无法从任何备份恢复 ${filename}，使用默认值`);
                    }
                }
                
                return data;
            }
        } catch (e) {
            this.logger.warn("[数据保护] 读取数据文件 " + filename + " 失败，尝试从备份恢复:", e);
            const restoredData = this.tryRestoreFromBackup<T>(filePath);
            if (restoredData !== null) {
                return restoredData;
            }
            this.logger.error(`(╥﹏╥) 无法从任何备份恢复 ${filename}，使用默认值`);
        }
        return defaultValue;
    }

    /**
     * 保存 JSON 数据文件
     * 增强版：多版本备份机制，保留最近5个版本
     * @param filename 数据文件名
     * @param data 要保存的数据
     */
    saveDataFile<T>(filename: string, data: T): void {
        const filePath = this.getDataFilePath(filename);
        try {
            // 轮转备份（保留历史版本）
            if (fs.existsSync(filePath)) {
                this.rotateBackups(filePath);
                // 创建当前备份
                const backupPath = this.getBackupPath(filePath, 1);
                fs.copyFileSync(filePath, backupPath);
            }
            // 写入新数据
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (e) {
            this.logger.error("(╥﹏╥) 保存数据文件 " + filename + " 失败:", e);
        }
    }

    /**
     * 从备份恢复数据文件
     * @param filename 数据文件名
     * @param version 指定版本（1=最新，5=最旧），不传则尝试所有版本
     * @returns 是否恢复成功
     */
    restoreDataFile(filename: string, version?: number): boolean {
        const filePath = this.getDataFilePath(filename);
        
        if (version !== undefined) {
            // 恢复指定版本
            const backupPath = this.getBackupPath(filePath, version);
            try {
                if (fs.existsSync(backupPath)) {
                    fs.copyFileSync(backupPath, filePath);
                    this.logger.info(`(｡･ω･｡) 已从备份版本${version}恢复数据文件: ${filename}`);
                    return true;
                }
            } catch (e) {
                this.logger.error(`(╥﹏╥) 从备份版本${version}恢复 ${filename} 失败:`, e);
            }
        } else {
            // 尝试所有版本
            const result = this.tryRestoreFromBackup(filePath);
            if (result !== null) {
                return true;
            }
        }
        return false;
    }

    /**
     * 获取所有数据文件列表（包括群数据文件、模板配置、日志配置等）
     */
    private getAllDataFiles(): string[] {
        const dataPath = this.ctx.dataPath;
        const allFiles: string[] = [];
        
        // 需要扫描的目录及其相对路径映射
        const dirsToScan = [
            { dir: dataPath, prefix: '' },
            { dir: path.join(dataPath, 'logs'), prefix: 'logs/' },
        ];
        
        // 所有需要保护的标准数据文件
        const standardFiles = [
            'checkin-users.json',
            'plugin-config.json',
            'templates.json',
            'template-config.json',
        ];
        
        try {
            for (const { dir, prefix } of dirsToScan) {
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    
                    // 群数据文件
                    const groupFiles = files.filter(f => 
                        f.startsWith('checkin-group-') && f.endsWith('.json') && !f.includes('.backup')
                    ).map(f => prefix + f);
                    
                    // logs 目录下的 JSON 文件
                    const logFiles = files.filter(f => 
                        f.endsWith('.json') && !f.includes('.backup') && !f.includes('.legacy')
                    ).map(f => prefix + f);
                    
                    allFiles.push(...groupFiles, ...logFiles);
                }
            }
            
            // 添加标准文件确保它们被检查
            for (const f of standardFiles) {
                if (!allFiles.includes(f)) {
                    allFiles.push(f);
                }
            }
            
            // 去重
            return [...new Set(allFiles)];
        } catch (e) {
            this.logger.debug('[数据扫描] 扫描数据目录失败:', e);
        }
        
        return standardFiles;
    }

    /**
     * 验证数据文件内容是否有效
     */
    private validateDataFile(filePath: string): { valid: boolean; empty: boolean; error?: string } {
        try {
            if (!fs.existsSync(filePath)) {
                return { valid: false, empty: true, error: '文件不存在' };
            }
            
            const content = fs.readFileSync(filePath, 'utf-8');
            if (!content || content.trim() === '') {
                return { valid: false, empty: true, error: '文件为空' };
            }
            
            const data = JSON.parse(content);
            
            // 检查是否为 null 或空对象/数组
            if (data === null) {
                return { valid: false, empty: true, error: '数据为null' };
            }
            
            if (typeof data === 'object') {
                if (Array.isArray(data) && data.length === 0) {
                    return { valid: true, empty: true };
                }
                if (!Array.isArray(data) && Object.keys(data).length === 0) {
                    return { valid: true, empty: true };
                }
            }
            
            return { valid: true, empty: false };
        } catch (e) {
            return { valid: false, empty: false, error: String(e) };
        }
    }

    /**
     * 检查并修复数据文件
     * 增强版：自动扫描所有数据文件，支持多版本备份恢复
     */
    checkAndRepairData(): void {
        const dataFiles = this.getAllDataFiles();
        let repairedCount = 0;
        let failedCount = 0;
        
        for (const filename of dataFiles) {
            const filePath = this.getDataFilePath(filename);
            const validation = this.validateDataFile(filePath);
            
            let needsRestore = false;
            
            if (!validation.valid) {
                this.logger.warn(`[数据保护] 数据文件 ${filename} ${validation.error}，尝试从备份恢复`);
                needsRestore = true;
            } else if (validation.empty) {
                this.logger.warn(`[数据保护] 数据文件 ${filename} 内容为空，尝试从备份恢复`);
                needsRestore = true;
            }
            
            if (needsRestore) {
                const restored = this.tryRestoreFromBackup(filePath);
                if (restored !== null) {
                    repairedCount++;
                    this.logger.info(`(｡･ω･｡) 成功恢复数据文件: ${filename}`);
                } else {
                    failedCount++;
                    this.logger.error(`(╥﹏╥) 无法恢复数据文件 ${filename}（无可用备份）`);
                }
            }
        }
        
        if (repairedCount > 0 || failedCount > 0) {
            this.logger.info(`[数据保护] 数据检查完成: 修复 ${repairedCount} 个, 失败 ${failedCount} 个`);
        } else {
            this.logger.debug('[数据保护] 所有数据文件检查通过');
        }
    }

    // ==================== 双轨制数据迁移 ====================

    /**
     * 迁移到双轨制积分系统
     * 将旧版单轨制数据（totalPoints）转换为新版双轨制（totalExp/balance）
     */
    migrateToDualTrackSystem(): void {
        this.logger.info('[数据迁移] 开始检查双轨制数据迁移...');
        
        let migratedCount = 0;
        
        // 1. 迁移全局用户数据
        migratedCount += this.migrateGlobalUsersData();
        
        // 2. 迁移群用户数据（由 points-migration.service 处理）
        // 群数据会在签到时自动迁移，或者由迁移服务处理
        
        if (migratedCount > 0) {
            this.logger.info(`(｡･ω･｡) 双轨制数据迁移完成: 迁移 ${migratedCount} 个用户`);
        } else {
            this.logger.debug('[数据迁移] 所有数据已是双轨制，无需迁移');
        }
    }

    /**
     * 迁移全局用户数据到双轨制
     */
    private migrateGlobalUsersData(): number {
        const filePath = this.getDataFilePath('checkin-users.json');
        let migratedCount = 0;
        
        try {
            if (!fs.existsSync(filePath)) {
                return 0;
            }
            
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content) as Record<string, unknown>;
            
            // 检查是否有旧版数据（存在 totalPoints 但没有 totalExp）
            let needsMigration = false;
            for (const [userId, userData] of Object.entries(data)) {
                if (isObject(userData)) {
                    // 检查是否为旧版数据（有 totalPoints 但没有 dataVersion）
                    const hasOldTotalPoints = typeof userData.totalPoints === 'number';
                    const hasNewTotalExp = typeof userData.totalExp === 'number';
                    const hasDataVersion = typeof userData.dataVersion === 'number';
                    
                    if (hasOldTotalPoints && (!hasNewTotalExp || !hasDataVersion)) {
                        needsMigration = true;
                        break;
                    }
                }
            }
            
            if (!needsMigration) {
                return 0;
            }
            
            this.logger.info('[数据迁移] 发现旧版单轨制数据，开始迁移到双轨制...');
            
            // 备份旧数据
            const backupPath = filePath + '.legacy-backup';
            fs.copyFileSync(filePath, backupPath);
            this.logger.info(`(｡･ω･｡) 已创建旧数据备份: ${backupPath}`);
            
            // 执行迁移
            for (const [userId, userData] of Object.entries(data)) {
                if (isObject(userData)) {
                    const hasOldTotalPoints = typeof userData.totalPoints === 'number';
                    const hasDataVersion = typeof userData.dataVersion === 'number';
                    
                    if (hasOldTotalPoints && !hasDataVersion) {
                        const oldPoints = userData.totalPoints as number;
                        
                        // 转换为双轨制
                        (userData as Record<string, unknown>).totalExp = oldPoints;
                        (userData as Record<string, unknown>).balance = oldPoints;
                        (userData as Record<string, unknown>).level = 1;
                        (userData as Record<string, unknown>).levelName = '初来乍到';
                        (userData as Record<string, unknown>).levelIcon = '🌱';
                        (userData as Record<string, unknown>).transactionLog = [];
                        (userData as Record<string, unknown>).dataVersion = 2;
                        (userData as Record<string, unknown>).migratedAt = new Date().toISOString().split('T')[0];
                        
                        // 删除旧字段
                        delete (userData as Record<string, unknown>).totalPoints;
                        
                        migratedCount++;
                        this.logger.debug(`[数据迁移] 用户 ${userId}: ${oldPoints}分 -> 双轨制(Exp=${oldPoints}, Balance=${oldPoints})`);
                    }
                }
            }
            
            // 保存迁移后的数据
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            this.logger.info(`(｡･ω･｡) 全局用户数据迁移完成: ${migratedCount} 个用户`);
            
        } catch (e) {
            this.logger.error('(╥﹏╥) 全局用户数据迁移失败:', e);
        }
        
        return migratedCount;
    }

    // ==================== 配置管理 ====================

    /**
     * 从磁盘加载配置
     */
    loadConfig(): void {
        const configPath = this.ctx.configPath;
        if (!configPath) {
            this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
            this.saveConfig();
            this.ctx.logger.debug('配置文件路径不存在，已创建默认配置');
            return;
        }
        
        try {
            if (fs.existsSync(configPath)) {
                const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                this.config = sanitizeConfig(raw);
                // 加载统计信息
                if (isObject(raw) && isObject(raw.stats)) {
                    Object.assign(this.stats, raw.stats);
                }
                this.ctx.logger.debug('已加载本地配置');
            } else {
                // 尝试从备份恢复配置
                const backupPath = configPath + '.backup';
                if (fs.existsSync(backupPath)) {
                    try {
                        const raw = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
                        this.config = sanitizeConfig(raw);
                        if (isObject(raw) && isObject(raw.stats)) {
                            Object.assign(this.stats, raw.stats);
                        }
                        // 恢复主配置文件
                        fs.copyFileSync(backupPath, configPath);
                        this.ctx.logger.info('(｡･ω･｡) 已从备份恢复配置文件');
                        return;
                    } catch (backupError) {
                        this.ctx.logger.warn('从备份恢复配置失败:', backupError);
                    }
                }
                this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
                this.saveConfig();
                this.ctx.logger.debug('配置文件不存在，已创建默认配置');
            }
        } catch (error) {
            this.ctx.logger.error('加载配置失败，尝试从备份恢复:', error);
            // 尝试从备份恢复
            const backupPath = configPath + '.backup';
            if (fs.existsSync(backupPath)) {
                try {
                    const raw = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
                    this.config = sanitizeConfig(raw);
                    if (isObject(raw) && isObject(raw.stats)) {
                        Object.assign(this.stats, raw.stats);
                    }
                    fs.copyFileSync(backupPath, configPath);
                    this.ctx.logger.info('(｡･ω･｡) 已从备份恢复配置文件');
                    return;
                } catch (backupError) {
                    this.ctx.logger.error('从备份恢复配置失败:', backupError);
                }
            }
            this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
        }
    }

    /**
     * 保存配置到磁盘
     */
    saveConfig(): void {
        if (!this._ctx) return;
        const configPath = this._ctx.configPath;
        try {
            const configDir = path.dirname(configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            const data = { ...this.config, stats: this.stats };
            fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            this._ctx.logger.error('保存配置失败:', error);
        }
    }

    /**
     * 合并更新配置
     */
    updateConfig(partial: Partial<PluginConfig>): void {
        this.config = { ...this.config, ...partial };
        this.saveConfig();
    }

    /**
     * 完整替换配置
     */
    replaceConfig(config: PluginConfig): void {
        this.config = sanitizeConfig(config);
        this.saveConfig();
    }

    /**
     * 更新指定群的配置
     */
    updateGroupConfig(groupId: string, config: Partial<GroupConfig>): void {
        this.config.groupConfigs[groupId] = {
            ...this.config.groupConfigs[groupId],
            ...config,
        };
        this.saveConfig();
    }

    /**
     * 检查群是否启用（默认启用，除非明确设置为 false）
     */
    isGroupEnabled(groupId: string): boolean {
        return this.config.groupConfigs[groupId]?.enabled !== false;
    }

    // ==================== 统计 ====================

    /**
     * 增加处理计数
     */
    incrementProcessed(): void {
        const today = new Date().toDateString();
        if (this.stats.lastUpdateDay !== today) {
            this.stats.todayProcessed = 0;
            this.stats.lastUpdateDay = today;
        }
        this.stats.todayProcessed++;
        this.stats.processed++;
    }

    // ==================== 工具方法 ====================

    /** 获取运行时长（毫秒） */
    getUptime(): number {
        return Date.now() - this.startTime;
    }

    /** 获取格式化的运行时长 */
    getUptimeFormatted(): string {
        const ms = this.getUptime();
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);

        if (d > 0) return `${d}天${h % 24}小时`;
        if (h > 0) return `${h}小时${m % 60}分钟`;
        if (m > 0) return `${m}分钟${s % 60}秒`;
        return `${s}秒`;
    }
}

/** 导出全局单例 */
export const pluginState = new PluginState();
