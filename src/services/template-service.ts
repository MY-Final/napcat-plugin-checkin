/**
 * 模板服务
 * 管理签到和排行榜模板的存储、CRUD 和随机选择
 */

import type { TemplateData, TemplateType, CreateTemplateParams, UpdateTemplateParams } from '../types';
import { pluginState } from '../core/state';

const TEMPLATES_FILE = 'templates.json';
const TEMPLATE_CONFIG_FILE = 'template-config.json';

let templatesCache: Map<string, TemplateData> = new Map();
let templateConfigCache: {
    enableRandomTemplate: boolean;
    checkinTemplateId: string | null;
    leaderboardTemplateId: string | null;
    defaultCheckinTemplateId: string | null;
    defaultLeaderboardTemplateId: string | null;
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
        const data = pluginState.loadDataFile<Record<string, TemplateData>>(TEMPLATES_FILE, {});
        templatesCache = new Map(Object.entries(data));
    }
    return templatesCache;
}

export function saveTemplates(): void {
    const data = Object.fromEntries(templatesCache);
    pluginState.saveDataFile(TEMPLATES_FILE, data);
}

export function loadTemplateConfig(): {
    enableRandomTemplate: boolean;
    checkinTemplateId: string | null;
    leaderboardTemplateId: string | null;
    defaultCheckinTemplateId: string | null;
    defaultLeaderboardTemplateId: string | null;
} {
    if (!templateConfigCache) {
        templateConfigCache = pluginState.loadDataFile(TEMPLATE_CONFIG_FILE, {
            enableRandomTemplate: false,
            checkinTemplateId: null,
            leaderboardTemplateId: null,
            defaultCheckinTemplateId: null,
            defaultLeaderboardTemplateId: null,
        });
    }
    return templateConfigCache;
}

export function saveTemplateConfig(config: {
    enableRandomTemplate?: boolean;
    checkinTemplateId?: string | null;
    leaderboardTemplateId?: string | null;
    defaultCheckinTemplateId?: string | null;
    defaultLeaderboardTemplateId?: string | null;
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
    
    if (config.enableRandomTemplate) {
        return getRandomTemplate(type);
    }
    
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
    
    return getRandomTemplate(type);
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

export function initDefaultTemplates(): void {
    const templates = loadTemplates();
    
    if (templates.size > 0) return;
    
    const now = getNowDateTimeStr();
    
    const defaultCheckinTemplate: TemplateData = {
        id: 'default-checkin-1',
        name: '默认签到模板',
        type: 'checkin',
        html: DEFAULT_CHECKIN_TEMPLATE,
        enabled: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
    };
    
    const defaultLeaderboardTemplate: TemplateData = {
        id: 'default-leaderboard-1',
        name: '默认排行榜模板',
        type: 'leaderboard',
        html: DEFAULT_LEADERBOARD_TEMPLATE,
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

const DEFAULT_CHECKIN_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: transparent;
            font-family: -apple-system, "Microsoft YaHei", sans-serif;
        }
        .card {
            width: 600px;
            height: 380px;
            background: #ffffff;
            border-radius: 36px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            position: relative;
        }
        .glow {
            position: absolute;
            top: -100px;
            right: -100px;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(255, 228, 233, 0.6) 0%, rgba(255, 255, 255, 0) 70%);
        }
        .sidebar {
            position: absolute;
            left: 0;
            top: 140px;
            width: 5px;
            height: 80px;
            background: #fb7185;
            border-radius: 0 3px 3px 0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            padding: 35px 40px 0 40px;
        }
        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #fff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .nickname {
            font-size: 20px;
            font-weight: bold;
            color: #18181b;
        }
        .qq {
            font-size: 13px;
            color: #71717a;
        }
        .rank-number {
            font-size: 28px;
            font-weight: bold;
            color: #f43f5e;
            font-style: italic;
        }
        .rank-label {
            font-size: 11px;
            color: #a1a1aa;
            font-weight: 600;
        }
        .points {
            text-align: center;
            font-size: 88px;
            font-weight: bold;
            background: linear-gradient(180deg, #f43f5e 0%, #be185d 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-top: 10px;
        }
        .points-label {
            text-align: center;
            font-size: 14px;
            color: #fda4af;
            font-weight: bold;
            letter-spacing: 4px;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 30px 40px 0 40px;
            padding: 15px 0;
            background: #fff1f2;
            border-radius: 20px;
        }
        .stat-item { text-align: center; }
        .stat-label {
            font-size: 12px;
            color: #e11d48;
            font-weight: 600;
        }
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #4d1a2a;
        }
        .footer {
            position: absolute;
            bottom: 20px;
            left: 0;
            right: 0;
            text-align: center;
        }
        .date { font-size: 12px; color: #a1a1aa; }
        .quote {
            font-size: 12px;
            color: #d4d4d8;
            font-style: italic;
        }
    </style>
</head>
<body>
<div class="card">
    <div class="glow"></div>
    <div class="sidebar"></div>
    <div class="header">
        <div class="user-info">
            <img class="avatar" src="{{avatarUrl}}" alt="avatar">
            <div>
                <div class="nickname">{{nickname}}</div>
                <div class="qq">QQ: {{userId}}</div>
            </div>
        </div>
        <div style="text-align: right;">
            <div class="rank-number">#{{todayRank}}</div>
            <div class="rank-label">TODAY RANK</div>
        </div>
    </div>
    <div class="points">+{{earnedPoints}}</div>
    <div class="points-label">POINTS EARNED</div>
    <div class="stats">
        <div class="stat-item">
            <div class="stat-label">累计天数</div>
            <div class="stat-value">{{totalDays}} 天</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">累计积分</div>
            <div class="stat-value">{{totalPoints}} 分</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">签到时间</div>
            <div class="stat-value">{{checkinTime}}</div>
        </div>
    </div>
    <div class="footer">
        <div class="date">{{currentDate}}</div>
        <div class="quote">"{{quote}}"</div>
    </div>
</div>
</body>
</html>`;

const DEFAULT_LEADERBOARD_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #f1f5f9;
            font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            width: 100%;
            max-width: 480px;
            background: #ffffff;
            border-radius: 40px;
            box-shadow: 0 30px 60px -12px rgba(244, 63, 94, 0.18);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 820px;
        }
        .container::before {
            content: '';
            position: absolute;
            top: -50px;
            right: -50px;
            width: 250px;
            height: 250px;
            background: radial-gradient(circle, rgba(254, 226, 226, 0.6) 0%, rgba(255, 255, 255, 0) 70%);
            z-index: 0;
        }
        .group-header {
            position: relative;
            z-index: 1;
            padding: 35px 30px 15px 30px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .group-left { display: flex; align-items: center; gap: 14px; }
        .group-avatar {
            width: 54px;
            height: 54px;
            border-radius: 16px;
            background: linear-gradient(135deg, #f43f5e, #be185d);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
            box-shadow: 0 10px 20px rgba(244, 63, 94, 0.25);
            font-size: 20px;
        }
        .group-info h2 { font-size: 19px; color: #18181b; font-weight: 800; }
        .group-id { font-size: 12px; color: #a1a1aa; margin-top: 2px; }
        .update-tag {
            background: #fef2f2;
            color: #ef4444;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
        }
        .leaderboard-list {
            position: relative;
            z-index: 1;
            flex: 1;
            overflow-y: auto;
            padding: 0 25px;
            padding-bottom: 130px;
            scrollbar-width: none;
        }
        .leaderboard-list::-webkit-scrollbar { display: none; }
        .user-row {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 16px 8px;
            border-radius: 20px;
            transition: background 0.3s ease;
        }
        .user-row:active { background: #fff1f2; }
        .rank-badge {
            width: 30px;
            font-weight: 900;
            font-size: 15px;
            color: #d1d5db;
            text-align: center;
            font-family: 'Arial Black', sans-serif;
        }
        .rank-1 .rank-badge { color: #f59e0b; font-size: 20px; }
        .rank-2 .rank-badge { color: #94a3b8; }
        .rank-3 .rank-badge { color: #b45309; }
        .avatar-wrapper { position: relative; }
        .avatar {
            width: 44px;
            height: 44px;
            border-radius: 15px;
            object-fit: cover;
            background: #f8fafc;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .rank-1 .avatar-wrapper::after {
            content: '👑';
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
        }
        .info-content { flex: 1; }
        .user-meta { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
        .username { font-size: 15px; font-weight: 700; color: #334155; }
        .points-val { font-size: 14px; font-weight: 800; color: #0f172a; }
        .bar-container {
            width: 100%;
            height: 8px;
            background: #f1f5f9;
            border-radius: 12px;
            overflow: hidden;
        }
        .bar-fill {
            height: 100%;
            border-radius: 12px;
            background: linear-gradient(90deg, #f43f5e, #fb7185);
            position: relative;
        }
        .bar-fill::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: shine 2s infinite linear;
        }
        @keyframes shine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .rank-1 .bar-fill { background: linear-gradient(90deg, #be185d, #f43f5e); }
        .rank-2 .bar-fill { background: linear-gradient(90deg, #fb7185, #fda4af); }
        .my-status {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(15px);
            padding: 18px 24px;
            border-radius: 28px;
            box-shadow: 0 15px 30px rgba(244, 63, 94, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 10;
        }
        .my-rank-tag {
            background: #18181b;
            color: #fff;
            padding: 4px 10px;
            border-radius: 10px;
            font-weight: 800;
            font-size: 11px;
        }
        .my-avatar {
            width: 48px;
            height: 48px;
            border-radius: 16px;
            border: 2px solid #f43f5e;
            padding: 2px;
        }
        .my-info { flex: 1; }
        .my-name { font-weight: 800; font-size: 16px; color: #18181b; }
        .my-id { font-size: 12px; color: #94a3b8; font-family: monospace; }
        .my-points-val { font-weight: 900; color: #f43f5e; font-size: 22px; line-height: 1; }
        .my-points-label { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; display: block; margin-top: 4px;}
    </style>
</head>
<body>
<div class="container">
    <div class="group-header">
        <div class="group-left">
            <div class="group-avatar">GP</div>
            <div class="group-info">
                <h2>{{typeName}}</h2>
                <div class="group-id"># {{groupId}}</div>
            </div>
        </div>
        <div class="update-tag">LIVE</div>
    </div>
    <div class="leaderboard-list">
        {{usersHtml}}
    </div>
    {{myRankHtml}}
</div>
</body>
</html>`;
