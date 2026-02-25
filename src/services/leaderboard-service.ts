/**
 * 排行榜服务
 * 提供周、月、年积分排行榜功能
 */

import type { LeaderboardData, LeaderboardUser, LeaderboardType } from '../types';
import { pluginState } from '../core/state';
import { getGroupAllUsersData } from './checkin-service';

/**
 * 获取排行榜数据
 * @param groupId 群ID
 * @param type 排行榜类型：week-周榜, month-月榜, year-年榜, all-总榜
 * @param currentUserId 当前用户ID（用于显示个人排名）
 * @returns 排行榜数据
 */
export function getLeaderboard(
    groupId: string,
    type: LeaderboardType,
    currentUserId?: string
): LeaderboardData {
    const groupUsers = getGroupAllUsersData(groupId);
    const now = new Date();
    
    // 计算时间范围
    const { startDate, endDate } = getTimeRange(type, now);
    
    // 统计每个用户的周期积分
    const userStats: Map<string, {
        userId: string;
        nickname: string;
        periodPoints: number;
        totalExp: number;
        balance: number;
        checkinDays: number;
    }> = new Map();

    for (const [userId, userData] of groupUsers) {
        let periodPoints = 0;
        let checkinDays = 0;

        // 遍历签到历史，统计周期内的积分
        for (const record of userData.checkinHistory) {
            const recordDate = new Date(record.date);
            if (recordDate >= startDate && recordDate <= endDate) {
                periodPoints += record.points;
                checkinDays++;
            }
        }

        if (periodPoints > 0 || type === 'all') {
            userStats.set(userId, {
                userId,
                nickname: userData.nickname,
                periodPoints: type === 'all' ? userData.totalExp : periodPoints,
                totalExp: userData.totalExp,
                balance: userData.balance,
                checkinDays: type === 'all' ? userData.totalCheckinDays : checkinDays,
            });
        }
    }
    
    // 排序并取前 N 名
    const sortedUsers = Array.from(userStats.values())
        .sort((a, b) => b.periodPoints - a.periodPoints);
    
    const topCount = pluginState.config.leaderboardTopCount || 10;
    const topUsers = sortedUsers.slice(0, topCount);
    
    // 构建排行榜用户数据
    const leaderboardUsers: LeaderboardUser[] = topUsers.map((user, index) => ({
        userId: user.userId,
        nickname: user.nickname,
        avatarUrl: `https://q1.qlogo.cn/g?b=qq&nk=${user.userId}&s=100`,
        periodPoints: user.periodPoints,
        totalPoints: user.totalExp,
        totalExp: user.totalExp,
        balance: user.balance,
        checkinDays: user.checkinDays,
        rank: index + 1,
    }));

    // 查找当前用户排名
    let myRank: LeaderboardUser | undefined;
    if (currentUserId) {
        const myIndex = sortedUsers.findIndex(u => u.userId === currentUserId);
        if (myIndex !== -1) {
            const myData = sortedUsers[myIndex];
            myRank = {
                userId: myData.userId,
                nickname: myData.nickname,
                avatarUrl: `https://q1.qlogo.cn/g?b=qq&nk=${myData.userId}&s=100`,
                periodPoints: myData.periodPoints,
                totalPoints: myData.totalExp,
                checkinDays: myData.checkinDays,
                rank: myIndex + 1,
            };
        }
    }
    
    // 类型名称
    const typeNameMap: Record<LeaderboardType, string> = {
        week: '本周排行榜',
        month: '本月排行榜',
        year: '年度排行榜',
        all: '总积分榜',
    };
    
    return {
        type,
        typeName: typeNameMap[type],
        groupId,
        groupName: `群 ${groupId}`,
        updateTime: now.toISOString(),
        users: leaderboardUsers,
        myRank,
    };
}

/**
 * 获取时间范围
 */
function getTimeRange(type: LeaderboardType, now: Date): { startDate: Date; endDate: Date } {
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(now);
    
    switch (type) {
        case 'week': {
            // 本周一 00:00:00
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            startDate.setDate(diff);
            startDate.setHours(0, 0, 0, 0);
            break;
        }
        case 'month': {
            // 本月1号 00:00:00
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            break;
        }
        case 'year': {
            // 本年1月1号 00:00:00
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        }
        case 'all':
        default: {
            // 所有时间（从2020年开始）
            startDate.setFullYear(2020, 0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        }
    }
    
    return { startDate, endDate };
}

/**
 * 解析排行榜命令
 * @param command 命令字符串
 * @returns 排行榜类型
 */
export function parseLeaderboardCommand(command: string): LeaderboardType | null {
    const lowerCmd = command.toLowerCase().trim();
    
    // 周榜关键词
    if (lowerCmd.includes('周') || lowerCmd.includes('week') || lowerCmd.includes('weekly')) {
        return 'week';
    }
    
    // 月榜关键词
    if (lowerCmd.includes('月') || lowerCmd.includes('month') || lowerCmd.includes('monthly')) {
        return 'month';
    }
    
    // 年榜关键词
    if (lowerCmd.includes('年') || lowerCmd.includes('year') || lowerCmd.includes('yearly') || lowerCmd.includes('年度')) {
        return 'year';
    }
    
    // 总榜关键词
    if (lowerCmd.includes('总') || lowerCmd.includes('all') || lowerCmd.includes('全部')) {
        return 'all';
    }
    
    // 默认周榜
    if (lowerCmd.includes('排行') || lowerCmd.includes('rank')) {
        return 'week';
    }
    
    return null;
}

/**
 * 生成排行榜文本消息
 */
export function generateLeaderboardText(data: LeaderboardData): string {
    const lines: string[] = [
        `🏆 ${data.typeName}`,
        ``,
    ];
    
    if (data.users.length === 0) {
        lines.push('暂无数据，快来签到吧~');
    } else {
        data.users.forEach(user => {
            const medal = user.rank <= 3 ? ['🥇', '🥈', '🥉'][user.rank - 1] : `${user.rank}.`;
            lines.push(`${medal} ${user.nickname}`);
            lines.push(`   💎 ${user.periodPoints}积分  📅 ${user.checkinDays}天`);
        });
    }
    
    if (data.myRank) {
        lines.push('');
        lines.push(`👤 你的排名: #${data.myRank.rank}`);
        lines.push(`💎 ${data.myRank.periodPoints}积分  📅 ${data.myRank.checkinDays}天`);
    }
    
    return lines.join('\n');
}

/**
 * 使用自定义模板生成排行榜 HTML
 */
export function generateLeaderboardHTMLWithTemplate(
    data: LeaderboardData,
    template: string
): string {
    const maxPoints = data.users.length > 0 ? data.users[0].periodPoints : 1;
    
    // 准备模板数据
    const templateData: Record<string, string> = {
        type: data.type,
        typeName: data.typeName,
        groupId: data.groupId,
        groupName: data.groupName,
        updateTime: data.updateTime,
        usersJson: JSON.stringify(data.users),
        myRankJson: data.myRank ? JSON.stringify(data.myRank) : '',
        hasMyRank: data.myRank ? 'true' : 'false',
        maxPoints: String(maxPoints),
    };
    
    // 替换简单变量
    let html = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = templateData[key];
        return value !== undefined ? value : match;
    });
    
    // 生成用户列表 HTML（如果模板中包含 {{usersHtml}}）
    if (html.includes('{{usersHtml}}')) {
        const usersHtml = generateUsersHtml(data.users, maxPoints);
        html = html.replace('{{usersHtml}}', usersHtml);
    }
    
    // 生成我的排名 HTML（如果模板中包含 {{myRankHtml}}）
    if (html.includes('{{myRankHtml}}')) {
        const myRankHtml = data.myRank ? generateMyRankHtml(data.myRank) : '';
        html = html.replace('{{myRankHtml}}', myRankHtml);
    }
    
    return html;
}

/**
 * 生成用户列表 HTML
 */
function generateUsersHtml(users: LeaderboardUser[], maxPoints: number): string {
    return users.map(user => {
        const barWidth = maxPoints > 0 ? (user.periodPoints / maxPoints) * 100 : 0;
        const rankClass = user.rank <= 3 ? `rank-${user.rank}` : '';
        
        return `
        <div class="user-row ${rankClass}">
            <div class="rank-badge">${user.rank}</div>
            <div class="avatar-wrapper">
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
        </div>
        `;
    }).join('');
}

/**
 * 生成我的排名 HTML
 */
function generateMyRankHtml(myRank: LeaderboardUser): string {
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
    </div>
    `;
}

/**
 * 生成排行榜 HTML
 */
export function generateLeaderboardHTML(data: LeaderboardData): string {
    // 检查是否有自定义模板
    const customTemplate = pluginState.config.customLeaderboardTemplate;
    if (customTemplate) {
        return generateLeaderboardHTMLWithTemplate(data, customTemplate);
    }
    
    // 使用默认模板
    const maxPoints = data.users.length > 0 ? data.users[0].periodPoints : 1;
    const usersHtml = generateUsersHtml(data.users, maxPoints);
    const myStatusHtml = data.myRank ? generateMyRankHtml(data.myRank) : '';
    
    return `<!DOCTYPE html>
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
                <h2>${data.typeName}</h2>
                <div class="group-id"># ${data.groupId}</div>
            </div>
        </div>
        <div class="update-tag">LIVE 更新中</div>
    </div>
    <div class="leaderboard-list">
        ${usersHtml}
    </div>
    ${myStatusHtml}
</div>
</body>
</html>`;
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
    const div = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => div[m as keyof typeof div]);
}
