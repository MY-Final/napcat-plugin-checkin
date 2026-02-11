/**
 * Puppeteer 渲染服务
 * 调用 napcat-plugin-puppeteer 插件渲染 HTML 成图片
 */

import { pluginState } from '../core/state';
import type { CheckinCardData } from '../types';

// Puppeteer 插件 API 地址
const PUPPETEER_API = 'http://127.0.0.1:6099/plugin/napcat-plugin-puppeteer/api/render';

/**
 * 生成签到卡片 HTML 模板
 */
function generateCheckinHtml(data: CheckinCardData): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>签到卡片</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: transparent;
            font-family: -apple-system, "Noto Sans SC", "Microsoft YaHei", sans-serif;
        }
        #card {
            width: 600px;
            height: 380px;
            background: #ffffff;
            border-radius: 36px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            position: relative;
        }
    </style>
</head>
<body>
<div id="card">
    <canvas id="checkInCanvas"></canvas>
</div>
<script>
    const canvas = document.getElementById('checkInCanvas');
    const ctx = canvas.getContext('2d');
    
    const config = { width: 600, height: 380, dpr: 2 };
    canvas.width = config.width * config.dpr;
    canvas.height = config.height * config.dpr;
    canvas.style.width = config.width + 'px';
    canvas.style.height = config.height + 'px';
    ctx.scale(config.dpr, config.dpr);
    
    const userData = {
        nickname: "${data.nickname}",
        qq: "${data.userId}",
        avatarUrl: "${data.avatarUrl}",
        pointsEarned: ${data.earnedPoints},
        totalPoints: ${data.totalPoints},
        totalDays: ${data.totalDays},
        rank: ${data.todayRank},
        time: "${data.currentDate} ${data.checkinTime}",
        quote: "${data.quote}"
    };
    
    async function render() {
        // 绘制底色
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 380);
        
        // 绘制粉色光晕装饰
        const radialGrad = ctx.createRadialGradient(550, 50, 20, 500, 100, 300);
        radialGrad.addColorStop(0, 'rgba(255, 241, 242, 1)');
        radialGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = radialGrad;
        ctx.fillRect(0, 0, 600, 380);
        
        // 绘制侧边高亮条
        ctx.fillStyle = '#fb7185';
        roundRect(0, 140, 5, 80, 3);
        ctx.fill();
        
        // 绘制用户头像
        try {
            const avatar = await loadImg(userData.avatarUrl);
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.1)';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(70, 70, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(70, 70, 28, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, 42, 42, 56, 56);
            ctx.restore();
        } catch (e) {
            ctx.fillStyle = '#fecdd3';
            ctx.beginPath();
            ctx.arc(70, 70, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 绘制名字与QQ
        ctx.textAlign = 'left';
        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 20px "PingFang SC"';
        ctx.fillText(userData.nickname, 115, 68);
        ctx.fillStyle = '#71717a';
        ctx.font = '500 13px "Arial"';
        ctx.fillText('QQ: ' + userData.qq, 115, 88);
        
        // 绘制右侧排名
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'italic bold 28px "Arial"';
        ctx.fillText('#' + userData.rank, 560, 70);
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '600 11px "PingFang SC"';
        ctx.fillText('TODAY RANK', 560, 85);
        
        // 绘制中部积分
        ctx.textAlign = 'center';
        const textGrad = ctx.createLinearGradient(0, 140, 0, 210);
        textGrad.addColorStop(0, '#f43f5e');
        textGrad.addColorStop(1, '#be185d');
        ctx.fillStyle = textGrad;
        ctx.font = 'bold 88px "Arial Rounded MT Bold", "Arial"';
        ctx.fillText('+' + userData.pointsEarned, 300, 205);
        
        ctx.fillStyle = '#fda4af';
        ctx.font = 'bold 14px "PingFang SC"';
        ctx.fillText('POINTS EARNED', 300, 235);
        
        // 绘制底部数据看板
        const statsY = 295;
        const col = 600 / 3;
        
        ctx.fillStyle = '#fff1f2';
        roundRect(40, 265, 520, 65, 20);
        ctx.fill();
        
        drawStatColumn('累计天数', userData.totalDays + ' 天', col * 0.5, statsY);
        drawStatColumn('累计积分', userData.totalPoints + ' 分', col * 1.5, statsY);
        drawStatColumn('签到时间', userData.time.split(' ')[1], col * 2.5, statsY);
        
        // 绘制页脚
        ctx.textAlign = 'center';
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '12px "PingFang SC"';
        ctx.fillText(userData.time.split(' ')[0], 300, 352);
        
        ctx.fillStyle = '#d4d4d8';
        ctx.font = 'italic 12px "PingFang SC"';
        ctx.fillText('"' + userData.quote + '"', 300, 368);
    }
    
    function drawStatColumn(label, value, x, y) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e11d48';
        ctx.font = '600 12px "PingFang SC"';
        ctx.fillText(label, x, y);
        ctx.fillStyle = '#4d1a2a';
        ctx.font = 'bold 20px "Arial"';
        ctx.fillText(value, x, y + 24);
    }
    
    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
    
    function loadImg(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Avatar load error'));
            img.src = url;
        });
    }
    
    render();
</script>
</body>
</html>`;
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
            timeout: 5000,
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