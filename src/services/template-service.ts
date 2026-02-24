/**
 * 模板服务
 * 管理签到和排行榜模板的存储、CRUD 和随机选择
 */

import type { TemplateData, TemplateType, CreateTemplateParams, UpdateTemplateParams, TemplateRandomMode } from '../types';
import { pluginState } from '../core/state';
import fs from 'fs';
import path from 'path';

const TEMPLATES_FILE = 'templates.json';
const TEMPLATE_CONFIG_FILE = 'template-config.json';

let templatesCache: Map<string, TemplateData> = new Map();
let templateConfigCache: {
    randomMode: TemplateRandomMode;
    checkinTemplateId: string | null;
    leaderboardTemplateId: string | null;
    defaultCheckinTemplateId: string | null;
    defaultLeaderboardTemplateId: string | null;
    sequentialIndex: number;
    lastRotationDate: string;
} | null = null;

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getNowDateStr(): string {
    return new Date().toISOString().split('T')[0];
}

function getNowDateTimeStr(): string {
    return new Date().toISOString();
}

export function loadTemplates(): Map<string, TemplateData> {
    if (templatesCache.size === 0) {
        const data = pluginState.loadDataFile<Record<string, TemplateData>>(
            TEMPLATES_FILE, 
            {},
            { validateEmpty: true }  // 启用空数据检测
        );
        templatesCache = new Map(Object.entries(data || {}));
    }
    return templatesCache;
}

export function saveTemplates(): void {
    const data = Object.fromEntries(templatesCache);
    pluginState.saveDataFile(TEMPLATES_FILE, data);
}

export function loadTemplateConfig(): {
    randomMode: TemplateRandomMode;
    checkinTemplateId: string | null;
    leaderboardTemplateId: string | null;
    defaultCheckinTemplateId: string | null;
    defaultLeaderboardTemplateId: string | null;
    sequentialIndex: number;
    lastRotationDate: string;
} {
    if (!templateConfigCache) {
        templateConfigCache = pluginState.loadDataFile(TEMPLATE_CONFIG_FILE, {
            randomMode: 'none',
            checkinTemplateId: null,
            leaderboardTemplateId: null,
            defaultCheckinTemplateId: null,
            defaultLeaderboardTemplateId: null,
            sequentialIndex: 0,
            lastRotationDate: '',
        }, { validateEmpty: true });
    }
    return templateConfigCache;
}

export function saveTemplateConfig(config: {
    randomMode?: TemplateRandomMode;
    checkinTemplateId?: string | null;
    leaderboardTemplateId?: string | null;
    defaultCheckinTemplateId?: string | null;
    defaultLeaderboardTemplateId?: string | null;
    sequentialIndex?: number;
    lastRotationDate?: string;
}): void {
    const currentConfig = loadTemplateConfig();
    const newConfig = { ...currentConfig, ...config };
    templateConfigCache = newConfig;
    pluginState.saveDataFile(TEMPLATE_CONFIG_FILE, newConfig);
}

export function getAllTemplates(): TemplateData[] {
    return Array.from(loadTemplates().values()).sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export function getTemplatesByType(type: TemplateType): TemplateData[] {
    return getAllTemplates().filter(t => t.type === type && t.enabled);
}

export function getTemplateById(id: string): TemplateData | undefined {
    return loadTemplates().get(id);
}

export function createTemplate(params: CreateTemplateParams): TemplateData {
    const templates = loadTemplates();
    const now = getNowDateTimeStr();
    
    const template: TemplateData = {
        id: generateId(),
        name: params.name,
        type: params.type,
        html: params.html,
        enabled: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
    };
    
    templates.set(template.id, template);
    saveTemplates();
    return template;
}

export function updateTemplate(id: string, params: UpdateTemplateParams): TemplateData | null {
    const templates = loadTemplates();
    const template = templates.get(id);
    
    if (!template) return null;
    
    if (params.name !== undefined) template.name = params.name;
    if (params.html !== undefined) template.html = params.html;
    if (params.enabled !== undefined) template.enabled = params.enabled;
    template.updatedAt = getNowDateTimeStr();
    
    templates.set(id, template);
    saveTemplates();
    return template;
}

export function deleteTemplate(id: string): boolean {
    const templates = loadTemplates();
    if (!templates.has(id)) return false;
    
    templates.delete(id);
    saveTemplates();
    return true;
}

export function duplicateTemplate(id: string, newName?: string): TemplateData | null {
    const templates = loadTemplates();
    const template = templates.get(id);
    
    if (!template) return null;
    
    const now = getNowDateTimeStr();
    const duplicated: TemplateData = {
        ...template,
        id: generateId(),
        name: newName || `${template.name} (副本)`,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
    };
    
    templates.set(duplicated.id, duplicated);
    saveTemplates();
    return duplicated;
}

export function getRandomTemplate(type: TemplateType): TemplateData | null {
    const enabledTemplates = getTemplatesByType(type);
    if (enabledTemplates.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * enabledTemplates.length);
    return enabledTemplates[randomIndex];
}

export function getTemplateForSend(type: TemplateType): TemplateData | null {
    const config = loadTemplateConfig();
    const today = getNowDateStr();
    
    // 根据随机模式选择模板
    if (config.randomMode === 'random') {
        return getRandomTemplate(type);
    }
    
    // 轮询模式：每次调用轮换到下一个
    if (config.randomMode === 'sequential') {
        const enabledTemplates = getTemplatesByType(type);
        if (enabledTemplates.length === 0) return null;
        
        // 更新索引
        const newIndex = (config.sequentialIndex + 1) % enabledTemplates.length;
        saveTemplateConfig({ sequentialIndex: newIndex });
        
        return enabledTemplates[config.sequentialIndex] || enabledTemplates[0];
    }
    
    // 每日一换模式：每天更换模板
    if (config.randomMode === 'daily') {
        if (config.lastRotationDate !== today) {
            // 新的一天，随机选择一个并更新日期
            const template = getRandomTemplate(type);
            if (template) {
                saveTemplateConfig({ lastRotationDate: today });
            }
            return template;
        }
        // 同一天，使用之前选中的模板（通过 sequentialIndex 存储）
        const enabledTemplates = getTemplatesByType(type);
        if (enabledTemplates.length === 0) return null;
        const index = config.sequentialIndex % enabledTemplates.length;
        return enabledTemplates[index] || enabledTemplates[0];
    }
    
    // none 模式：使用指定的模板
    const templateId = type === 'checkin' ? config.checkinTemplateId : config.leaderboardTemplateId;
    
    if (templateId) {
        const template = getTemplateById(templateId);
        if (template && template.enabled) {
            return template;
        }
    }

    const defaultId = type === 'checkin' ? config.defaultCheckinTemplateId : config.defaultLeaderboardTemplateId;
    if (defaultId) {
        const template = getTemplateById(defaultId);
        if (template && template.enabled) {
            return template;
        }
    }

    return null;
}

export function setDefaultTemplate(id: string): boolean {
    const templates = loadTemplates();
    const template = templates.get(id);
    
    if (!template) return false;
    
    for (const t of templates.values()) {
        if (t.type === template.type) {
            t.isDefault = false;
        }
    }
    
    template.isDefault = true;
    template.updatedAt = getNowDateTimeStr();
    
    saveTemplates();
    return true;
}

function loadTemplateFromFile(filename: string): string {
    const filePath = path.join(__dirname, 'templates', filename);
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        pluginState.logger.error(`加载模板文件 ${filename} 失败:`, error);
        return '';
    }
}

export function initDefaultTemplates(): void {
    const templates = loadTemplates();
    
    if (templates.size > 0) return;
    
    const now = getNowDateTimeStr();
    
    const defaultCheckinTemplate: TemplateData = {
        id: 'default-checkin-1',
        name: '默认签到模板',
        type: 'checkin',
        html: loadTemplateFromFile('default-checkin-template.html'),
        enabled: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
    };
    
    const defaultLeaderboardTemplate: TemplateData = {
        id: 'default-leaderboard-1',
        name: '默认排行榜模板',
        type: 'leaderboard',
        html: loadTemplateFromFile('default-leaderboard-template.html'),
        enabled: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
    };
    
    templates.set(defaultCheckinTemplate.id, defaultCheckinTemplate);
    templates.set(defaultLeaderboardTemplate.id, defaultLeaderboardTemplate);
    saveTemplates();
    
    saveTemplateConfig({
        defaultCheckinTemplateId: defaultCheckinTemplate.id,
        defaultLeaderboardTemplateId: defaultLeaderboardTemplate.id,
    });
}
