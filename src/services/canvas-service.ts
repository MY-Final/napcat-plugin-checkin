/**
 * Canvas 服务
 * 负责绘制精美的签到卡片
 * 
 * 注意：canvas 是可选依赖，如果不可用会自动降级为文字模式
 */

import type { CheckinCardData } from '../types';
import { pluginState } from '../core/state';

// 画布尺寸
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

// 颜色配置
const COLORS = {
    background: '#FAFAFA',
    accent: '#E91E63',
    accentLight: '#FFE4E9',
    textDark: '#333333',
    textLight: '#888888',
    textQuote: '#AAAAAA',
    border: '#F0F0F0',
    shadow: 'rgba(0, 0, 0, 0.1)',
};

// 缓存 canvas 模块
let canvasModule: typeof import('canvas') | null = null;
let axiosModule: typeof import('axios') | null = null;
let modulesLoaded = false;

/**
 * 尝试加载 canvas 和 axios 模块
 */
async function loadModules(): Promise<boolean> {
    if (modulesLoaded) {
        return canvasModule !== null && axiosModule !== null;
    }

    try {
        // 尝试加载 canvas
        canvasModule = await import('canvas');
        pluginState.logger.info('✅ Canvas 模块加载成功');
    } catch (error) {
        pluginState.logger.warn('❌ Canvas 模块不可用:', error instanceof Error ? error.message : String(error));
        canvasModule = null;
    }

    try {
        // 尝试加载 axios
        axiosModule = await import('axios');
        pluginState.logger.info('✅ Axios 模块加载成功');
    } catch (error) {
        pluginState.logger.warn('❌ Axios 模块不可用:', error instanceof Error ? error.message : String(error));
        axiosModule = null;
    }

    modulesLoaded = true;
    const result = canvasModule !== null && axiosModule !== null;
    pluginState.logger.info(`模块加载结果: Canvas=${canvasModule !== null}, Axios=${axiosModule !== null}`);
    return result;
}

/**
 * 下载并加载头像
 */
async function loadAvatar(avatarUrl: string): Promise<Buffer> {
    if (!axiosModule) {
        throw new Error('Axios 模块未加载');
    }
    try {
        pluginState.logger.debug(`正在下载头像: ${avatarUrl}`);
        const response = await axiosModule.default.get(avatarUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.data || response.data.length === 0) {
            throw new Error('头像数据为空');
        }
        
        pluginState.logger.debug(`头像下载成功，大小: ${response.data.length} bytes`);
        return Buffer.from(response.data);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        pluginState.logger.error(`下载头像失败 (${avatarUrl}):`, errorMsg);
        throw error;
    }
}

/**
 * 绘制圆角矩形
 */
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * 绘制圆形头像
 */
async function drawAvatar(
    ctx: CanvasRenderingContext2D,
    avatarBuffer: Buffer,
    x: number,
    y: number,
    size: number
): Promise<void> {
    if (!canvasModule) return;
    
    ctx.save();
    ctx.shadowColor = COLORS.shadow;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = COLORS.background;
    ctx.fill();

    const avatar = await canvasModule.loadImage(avatarBuffer);
    ctx.clip();
    ctx.drawImage(avatar, x, y, size, size);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
}

/**
 * 绘制渐变光晕效果
 */
function drawGradientGlow(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
        CANVAS_WIDTH * 0.8, CANVAS_HEIGHT * 0.3, 0,
        CANVAS_WIDTH * 0.8, CANVAS_HEIGHT * 0.3, 200
    );
    gradient.addColorStop(0, 'rgba(255, 228, 233, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 228, 233, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/**
 * 绘制左侧装饰条
 */
function drawSideBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = 6;
    const barHeight = 120;
    const x = 0;
    const y = (CANVAS_HEIGHT - barHeight) / 2;

    ctx.fillStyle = COLORS.accent;
    roundRect(ctx, x, y, barWidth, barHeight, 3);
    ctx.fill();
}

/**
 * 绘制顶部区域
 */
function drawHeader(ctx: CanvasRenderingContext2D, data: CheckinCardData): void {
    const avatarSize = 70;
    const avatarX = 30;
    const avatarY = 35;

    ctx.fillStyle = COLORS.textDark;
    ctx.font = 'bold 20px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(data.nickname || '未知用户', avatarX + avatarSize + 20, avatarY + 25);

    ctx.fillStyle = COLORS.textLight;
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillText(`ID: ${data.userId}`, avatarX + avatarSize + 20, avatarY + 50);

    ctx.fillStyle = COLORS.accent;
    ctx.font = 'italic bold 36px "Arial Rounded MT Bold", "Arial", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`#${data.todayRank}`, CANVAS_WIDTH - 30, avatarY + 40);

    ctx.fillStyle = COLORS.textLight;
    ctx.font = '12px "Arial", sans-serif';
    ctx.fillText('TODAY RANK', CANVAS_WIDTH - 30, avatarY + 58);
}

/**
 * 绘制中部：积分
 */
function drawPoints(ctx: CanvasRenderingContext2D, points: number): void {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2 - 10;

    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 72px "Arial Rounded MT Bold", "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+${points}`, centerX, centerY);

    ctx.fillStyle = COLORS.accent;
    ctx.font = '16px "Arial", sans-serif';
    ctx.fillText('PTS', centerX, centerY + 28);
}

/**
 * 绘制底部统计区域
 */
function drawStats(ctx: CanvasRenderingContext2D, data: CheckinCardData): void {
    const statsY = CANVAS_HEIGHT - 100;
    const colWidth = CANVAS_WIDTH / 3;

    const stats = [
        { label: '累计天数', value: `${data.totalDays} DAYS` },
        { label: '累计积分', value: `${data.totalPoints} PTS` },
        { label: '签到时间', value: data.checkinTime },
    ];

    stats.forEach((stat, index) => {
        const x = colWidth * index + colWidth / 2;

        ctx.fillStyle = COLORS.textLight;
        ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(stat.label, x, statsY);

        ctx.fillStyle = COLORS.textDark;
        ctx.font = 'bold 18px "Arial", "Microsoft YaHei", sans-serif';
        ctx.fillText(stat.value, x, statsY + 25);
    });
}

/**
 * 绘制底部日期和寄语
 */
function drawFooter(ctx: CanvasRenderingContext2D, data: CheckinCardData): void {
    const footerY = CANVAS_HEIGHT - 35;

    ctx.fillStyle = COLORS.textLight;
    ctx.font = '12px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.currentDate, CANVAS_WIDTH / 2, footerY - 15);

    ctx.fillStyle = COLORS.textQuote;
    ctx.font = 'italic 13px "Microsoft YaHei", "KaiTi", serif';
    ctx.fillText(`"${data.quote}"`, CANVAS_WIDTH / 2, footerY);
}

/**
 * 绘制卡片边框
 */
function drawBorder(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, CANVAS_WIDTH - 1, CANVAS_HEIGHT - 1, 40);
    ctx.stroke();
}

/**
 * 生成签到卡片（图片模式）
 */
async function generateImageCard(data: CheckinCardData): Promise<Buffer> {
    if (!canvasModule) {
        throw new Error('Canvas 模块未加载');
    }

    pluginState.logger.debug('创建画布...');
    const canvas = canvasModule.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    pluginState.logger.debug('绘制背景...');
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    pluginState.logger.debug('绘制装饰效果...');
    drawGradientGlow(ctx);
    drawSideBar(ctx);

    pluginState.logger.debug('下载用户头像...');
    let avatarBuffer: Buffer;
    try {
        avatarBuffer = await loadAvatar(data.avatarUrl);
        pluginState.logger.debug('头像下载成功');
    } catch (error) {
        pluginState.logger.warn('头像下载失败，使用默认占位:', error instanceof Error ? error.message : String(error));
        // 创建一个透明的占位头像
        avatarBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    }
    
    pluginState.logger.debug('绘制头像...');
    await drawAvatar(ctx, avatarBuffer, 30, 35, 70);

    pluginState.logger.debug('绘制文字内容...');
    drawHeader(ctx, data);
    drawPoints(ctx, data.earnedPoints);
    drawStats(ctx, data);
    drawFooter(ctx, data);
    drawBorder(ctx);

    pluginState.logger.debug('生成图片buffer...');
    return canvas.toBuffer('image/png');
}

/**
 * 生成签到卡片
 * @returns 图片Buffer（如果canvas可用）或 null（如果不可用）
 */
export async function generateCheckinCard(data: CheckinCardData): Promise<Buffer | null> {
    try {
        pluginState.logger.info('开始生成签到卡片...');
        
        // 先尝试加载模块
        const canUseCanvas = await loadModules();
        
        if (!canUseCanvas) {
            pluginState.logger.warn('Canvas 或 Axios 模块不可用，无法生成图片');
            return null;
        }
        
        pluginState.logger.info('模块检查通过，开始绘制卡片...');
        const result = await generateImageCard(data);
        pluginState.logger.info('签到卡片生成成功');
        return result;
    } catch (error) {
        pluginState.logger.error('生成签到卡片失败:', error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
            pluginState.logger.error('错误堆栈:', error.stack);
        }
        return null;
    }
}

/**
 * 生成头像URL
 */
export function getAvatarUrl(userId: string): string {
    return `http://q.qlogo.cn/headimg_dl?dst_uin=${userId}&spec=640&img_type=jpg`;
}
