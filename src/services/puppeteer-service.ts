/**
 * Puppeteer 渲染服务
 * 调用 napcat-plugin-puppeteer 插件渲染 HTML 成图片
 */

import { pluginState } from '../core/state';
import type { CheckinCardData } from '../types';

// Puppeteer 插件 API 地址
const PUPPETEER_API = 'http://127.0.0.1:6099/plugin/napcat-plugin-puppeteer/api/render';

/**
 * 生成签到卡片 HTML 模板（使用 HTML/CSS，避免 Canvas 字体和跨域问题）
 */
function generateCheckinHtml(data: CheckinCardData): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>签到卡片</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+SC:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: transparent;
            font-family: "Noto Sans", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
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
            background: linear-gradient(180deg, #f43f5e 0%, #be185d 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
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
                <div class="nickname">${escapeHtml(data.nickname)}</div>
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
    const div = { replace: (s: string) => s };
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 调用 Puppeteer 插件渲染 HTML 成图片
 */
export async function renderCheckinCard(data: CheckinCardData): Promise<Buffer | null> {
    try {
        pluginState.logger.info('开始调用 Puppeteer 渲染签到卡片...');
        
        const html = generateCheckinHtml(data);
        
        pluginState.logger.debug(`发送请求到: ${PUPPETEER_API}`);
        
        const response = await fetch(PUPPETEER_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                html: html,
                encoding: 'base64',
                setViewport: {
                    width: 600,
                    height: 380,
                    deviceScaleFactor: 2,
                },
                omitBackground: true,
            }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            pluginState.logger.error(`Puppeteer API 请求失败: ${response.status} - ${errorText}`);
            return null;
        }
        
        const result = await response.json();
        
        if (result.code !== 0 || !result.data) {
            pluginState.logger.error(`Puppeteer 渲染失败: ${result.message || '未知错误'}`);
            return null;
        }
        
        pluginState.logger.info('Puppeteer 渲染成功');
        
        // 将 Base64 转换为 Buffer
        const base64Data = result.data.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
        
    } catch (error) {
        pluginState.logger.error('调用 Puppeteer 失败:', error instanceof Error ? error.message : String(error));
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