/**
 * 模板预览路由 - HTML模板渲染API
 */
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';

interface LeaderboardUser {
    rank: number;
    userId: string;
    nickname: string;
    avatarUrl: string;
    periodPoints: number;
    totalPoints?: number;
    checkinDays?: number;
}

interface MyRank {
    rank: number;
    userId: string;
    nickname: string;
    avatarUrl: string;
    periodPoints: number;
}

export function registerTemplateRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    /** 预览 HTML 模板 */
    router.postNoAuth('/template/preview', async (req, res) => {
        try {
            const body = req.body as { 
                template?: string; 
                data?: Record<string, string | number>;
                type?: 'checkin' | 'leaderboard';
            } | undefined;
            
            if (!body?.template) {
                return res.status(400).json({ code: -1, message: '缺少 template 参数' });
            }

            const { previewTemplate, renderHtmlToImage, replaceTemplateVariables } = await import('../puppeteer-service');
            
            const isLeaderboard = body.type === 'leaderboard';
            let html = body.template;
            const data = body.data || {};
            
            if (isLeaderboard) {
                // 处理排行榜模板
                if (data.usersJson && html.includes('{{usersHtml}}')) {
                    try {
                        const users: LeaderboardUser[] = JSON.parse(String(data.usersJson));
                        const maxPoints = parseInt(String(data.maxPoints || '1')) || 1;
                        data.usersHtml = generateLeaderboardUsersHtml(users, maxPoints);
                    } catch (e) {
                        ctx.logger.warn('解析用户列表失败:', e);
                        data.usersHtml = '';
                    }
                }
                
                if (data.myRankJson && html.includes('{{myRankHtml}}')) {
                    try {
                        const myRank: MyRank = JSON.parse(String(data.myRankJson));
                        data.myRankHtml = generateLeaderboardMyRankHtml(myRank);
                    } catch (e) {
                        ctx.logger.warn('解析我的排名失败:', e);
                        data.myRankHtml = '';
                    }
                }
                
                html = replaceTemplateVariables(html, data);
                
                const result = await renderHtmlToImage(html, {
                    width: 480,
                    height: 820,
                    deviceScaleFactor: 2,
                });
                
                if (!result) {
                    return res.status(500).json({ code: -1, message: '模板渲染失败' });
                }

                res.json({
                    code: 0,
                    data: {
                        image: result.image,
                        time: result.time,
                    },
                });
            } else {
                // 签到卡片
                const result = await previewTemplate(body.template, body.data || {});
                
                if (!result) {
                    return res.status(500).json({ code: -1, message: '模板渲染失败' });
                }

                res.json({
                    code: 0,
                    data: {
                        image: result.image,
                        time: result.time,
                    },
                });
            }
        } catch (err) {
            ctx.logger.error('模板预览失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });
}

function generateLeaderboardUsersHtml(users: LeaderboardUser[], maxPoints: number): string {
    return users.map(user => {
        const barWidth = maxPoints > 0 ? (user.periodPoints / maxPoints) * 100 : 0;
        const rankClass = user.rank <= 3 ? `rank-${user.rank}` : '';
        const avatarWrapperClass = user.rank <= 3 ? 'avatar-wrapper' : '';
        
        return `
    <div class="user-row ${rankClass}">
        <div class="rank-badge">${user.rank}</div>
        <div class="${avatarWrapperClass}">
            <img class="avatar" src="${user.avatarUrl}" alt="avatar">
        </div>
        <div class="info-content">
            <div class="user-meta">
                <span class="username">${escapeHtml(user.nickname)}</span>
                <span class="points-val">${user.periodPoints.toLocaleString()}</span>
            </div>
            <div class="bar-container">
                <div class="bar-fill" style="width: ${barWidth}%;"></div>
            </div>
        </div>
    </div>`;
    }).join('');
}

function generateLeaderboardMyRankHtml(myRank: MyRank): string {
    return `
<div class="my-status">
    <div class="my-rank-tag">RANK ${myRank.rank}</div>
    <img class="my-avatar" src="${myRank.avatarUrl}" alt="my avatar">
    <div class="my-info">
        <div class="my-name">${escapeHtml(myRank.nickname)} (我)</div>
        <div class="my-id">ID: ${myRank.userId}</div>
    </div>
    <div style="text-align: right;">
        <span class="my-points-val">${myRank.periodPoints.toLocaleString()}</span>
        <span class="my-points-label">MY SCORE</span>
    </div>
</div>`;
}

function escapeHtml(text: string): string {
    const div: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => div[m] || m);
}
