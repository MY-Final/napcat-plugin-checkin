/**
 * Puppeteer 渲染服务
 * 调用 napcat-plugin-puppeteer 插件渲染 HTML 成图片
 */

import { pluginState } from '../core/state';
import type { CheckinCardData } from '../types';
import { getTemplateForSend, initDefaultTemplates } from './template-service';

// Puppeteer 插件 API 地址
const PUPPETEER_API = 'http://127.0.0.1:6099/plugin/napcat-plugin-puppeteer/api/render';

/**
 * 生成签到卡片 HTML 模板（使用 HTML/CSS，避免 Canvas 字体和跨域问题）
 */
/**
 * 检测是否为特殊 Unicode 字符（数学字母、装饰符号等）
 * 这些字符在普通中文字体中可能显示为方框
 */
function hasSpecialUnicode(text: string): boolean {
    // 检测数学字母数字符号区段、装饰符号等
    const specialRanges = [
        /[\u{1D400}-\u{1D7FF}]/u, // 数学字母数字符号
        /[\u{2100}-\u{214F}]/u,   // 字母符号
        /[\u{2460}-\u{24FF}]/u,   // 带圈字母数字
        /[\u{2600}-\u{26FF}]/u,   // 杂项符号
        /[\u{2700}-\u{27BF}]/u,   // 装饰符号
    ];
    return specialRanges.some(range => range.test(text));
}

/**
 * 处理昵称：检测特殊字符，如有必要则提供替代显示
 */
function processNickname(nickname: string, userId: string): string {
    // 如果昵称包含特殊 Unicode 字符，添加 title 提示
    const needsFallback = hasSpecialUnicode(nickname);
    if (needsFallback) {
        // 保留原昵称，但添加 title 属性显示 QQ 号
        return `<span title="QQ: ${userId}">${escapeHtml(nickname)}</span>`;
    }
    return escapeHtml(nickname);
}

function generateCheckinHtml(data: CheckinCardData): string {
    const displayNickname = processNickname(data.nickname, data.userId);
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>签到卡片</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: transparent;
            /* 使用系统字体栈，不依赖外部 CDN */
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "Noto Sans CJK SC", sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
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
            pointer-events: none;
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
            align-items: flex-start;
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
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            background: #fecdd3;
        }
        .user-text {
            display: flex;
            flex-direction: column;
        }
        .nickname {
            font-size: 20px;
            font-weight: bold;
            color: #18181b;
            margin-bottom: 4px;
        }
        .qq {
            font-size: 13px;
            color: #71717a;
        }
        .rank {
            text-align: right;
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
        .points-section {
            text-align: center;
            margin-top: 20px;
        }
        .points {
            font-size: 88px;
            font-weight: bold;
            color: #f43f5e;
            line-height: 1;
        }
        .points-label {
            font-size: 14px;
            color: #fda4af;
            font-weight: bold;
            margin-top: 5px;
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
        .stat-item {
            text-align: center;
        }
        .stat-label {
            font-size: 12px;
            color: #e11d48;
            font-weight: 600;
            margin-bottom: 5px;
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
        .date {
            font-size: 12px;
            color: #a1a1aa;
            margin-bottom: 5px;
        }
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
            <img class="avatar" src="${data.avatarUrl}" alt="avatar" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23fecdd3%22/></svg>'">
            <div class="user-text">
                <div class="nickname">${displayNickname}</div>
                <div class="qq">QQ: ${data.userId}</div>
            </div>
        </div>
        <div class="rank">
            <div class="rank-number">#${data.todayRank}</div>
            <div class="rank-label">TODAY RANK</div>
        </div>
    </div>
    
    <div class="points-section">
        <div class="points">+${data.earnedPoints}</div>
        <div class="points-label">POINTS EARNED</div>
    </div>
    
    <div class="stats">
        <div class="stat-item">
            <div class="stat-label">累计天数</div>
            <div class="stat-value">${data.totalDays} 天</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">累计积分</div>
            <div class="stat-value">${data.totalPoints} 分</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">签到时间</div>
            <div class="stat-value">${data.checkinTime}</div>
        </div>
    </div>
    
    <div class="footer">
        <div class="date">${data.currentDate}</div>
        <div class="quote">"${escapeHtml(data.quote)}"</div>
    </div>
</div>
</body>
</html>`;
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 将模板变量替换为实际数据
 */
export function replaceTemplateVariables(template: string, data: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = data[key];
        return value !== undefined ? String(value) : match;
    });
}

/**
 * 调用 Puppeteer 插件渲染任意 HTML 成图片
 */
export async function renderHtmlToImage(
    html: string,
    viewport?: { width: number; height: number; deviceScaleFactor?: number }
): Promise<{ image: string; time: number } | null> {
    const startTime = Date.now();
    
    try {
        const response = await fetch(PUPPETEER_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                html: html,
                encoding: 'base64',
                setViewport: viewport || {
                    width: 600,
                    height: 380,
                    deviceScaleFactor: 2,
                },
                omitBackground: true,
            }),
        });
        
        if (!response.ok) {
            pluginState.logger.error(`Puppeteer API 请求失败: ${response.status}`);
            return null;
        }
        
        const result = await response.json();
        
        if (result.code !== 0 || !result.data) {
            pluginState.logger.error(`Puppeteer 渲染失败: ${result.message || '未知错误'}`);
            return null;
        }
        
        const renderTime = Date.now() - startTime;
        
        // 返回完整的 base64 data URL
        const imageData = result.data.startsWith('data:') 
            ? result.data 
            : `data:image/png;base64,${result.data}`;
        
        return { image: imageData, time: renderTime };
        
    } catch (error) {
        pluginState.logger.error('调用 Puppeteer 失败:', error instanceof Error ? error.message : String(error));
        return null;
    }
}

/**
 * 调用 Puppeteer 插件渲染签到卡片
 */
export async function renderCheckinCard(data: CheckinCardData): Promise<Buffer | null> {
    try {
        pluginState.logger.info('开始调用 Puppeteer 渲染签到卡片...');
        
        let html: string;
        
        initDefaultTemplates();
        const template = getTemplateForSend('checkin');
        
        if (template) {
            pluginState.logger.debug(`使用模板: ${template.name} (${template.id})`);
            // 将数据转换为模板变量格式
            const templateData: Record<string, string | number> = {
                nickname: data.nickname,
                userId: data.userId,
                avatarUrl: data.avatarUrl,
                earnedPoints: data.earnedPoints,
                totalPoints: data.totalPoints,
                totalDays: data.totalDays,
                todayRank: data.todayRank,
                checkinTime: data.checkinTime,
                currentDate: data.currentDate,
                quote: data.quote,
                consecutiveDays: data.consecutiveDays || 0,
                weekday: data.weekday || 0,
                weekdayName: data.weekdayName || '',
                isWeekend: data.isWeekend ? 'true' : 'false',
                groupName: data.groupName || '',
                activeDays: data.activeDays || 0,
                basePoints: data.basePoints || data.earnedPoints,
                consecutiveBonus: data.consecutiveBonus || 0,
                weekendBonus: data.weekendBonus || 0,
            };
            html = replaceTemplateVariables(template.html, templateData);
        } else {
            pluginState.logger.debug('使用内置默认 HTML 模板');
            html = generateCheckinHtml(data);
        }
        
        const result = await renderHtmlToImage(html);
        
        if (!result) {
            return null;
        }
        
        pluginState.logger.info(`Puppeteer 渲染成功，耗时 ${result.time}ms`);
        
        // 将 Base64 转换为 Buffer
        const base64Data = result.image.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
        
    } catch (error) {
        pluginState.logger.error('调用 Puppeteer 失败:', error instanceof Error ? error.message : String(error));
        return null;
    }
}

/**
 * 调用 Puppeteer 插件渲染排行榜卡片
 */
export async function renderLeaderboardCard(data: import('../types').LeaderboardData): Promise<Buffer | null> {
    try {
        pluginState.logger.info('开始调用 Puppeteer 渲染排行榜卡片...');
        
        // 导入 leaderboard-service 生成 HTML
        const { generateLeaderboardHTML } = await import('./leaderboard-service');
        const html = generateLeaderboardHTML(data);
        
        const result = await renderHtmlToImage(html, {
            width: 480,
            height: 820,
            deviceScaleFactor: 2,
        });
        
        if (!result) {
            return null;
        }
        
        pluginState.logger.info(`Puppeteer 渲染排行榜成功，耗时 ${result.time}ms`);
        
        // 将 Base64 转换为 Buffer
        const base64Data = result.image.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
        
    } catch (error) {
        pluginState.logger.error('调用 Puppeteer 渲染排行榜失败:', error instanceof Error ? error.message : String(error));
        return null;
    }
}

/**
 * 预览模板（用于 WebUI 编辑器）
 */
export async function previewTemplate(
    template: string,
    data: Record<string, string | number>
): Promise<{ image: string; time: number } | null> {
    try {
        pluginState.logger.info('开始预览模板...');
        
        const html = replaceTemplateVariables(template, data);
        const result = await renderHtmlToImage(html);
        
        if (result) {
            pluginState.logger.info(`模板预览成功，耗时 ${result.time}ms`);
        }
        
        return result;
        
    } catch (error) {
        pluginState.logger.error('模板预览失败:', error instanceof Error ? error.message : String(error));
        return null;
    }
}

/**
 * 检查 Puppeteer 插件是否可用
 */
export async function checkPuppeteerAvailable(): Promise<boolean> {
    try {
        const response = await fetch(PUPPETEER_API.replace('/render', '/status'), {
            method: 'GET',
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * 生成头像 URL
 */
export function getAvatarUrl(userId: string): string {
    return `http://q.qlogo.cn/headimg_dl?dst_uin=${userId}&spec=640&img_type=jpg`;
}