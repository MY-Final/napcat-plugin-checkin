import type { TemplateVariable } from '../types/api';

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
    { name: '{{nickname}}', description: '用户昵称' },
    { name: '{{userId}}', description: '用户QQ号' },
    { name: '{{avatarUrl}}', description: '头像URL' },
    { name: '{{earnedPoints}}', description: '本次获得积分' },
    { name: '{{totalPoints}}', description: '累计积分' },
    { name: '{{totalDays}}', description: '累计签到天数' },
    { name: '{{todayRank}}', description: '今日排名' },
    { name: '{{checkinTime}}', description: '签到时间' },
    { name: '{{currentDate}}', description: '当前日期' },
    { name: '{{quote}}', description: '随机寄语' },
    { name: '{{consecutiveDays}}', description: '连续签到天数' },
    { name: '{{weekday}}', description: '星期几（0-6数字）' },
    { name: '{{weekdayName}}', description: '星期几（中文：周一...周日）' },
    { name: '{{isWeekend}}', description: '是否周末（true/false）' },
    { name: '{{groupName}}', description: '群名称（群内签到时显示）' },
    { name: '{{activeDays}}', description: '活跃天数（使用次数）' },
    { name: '{{basePoints}}', description: '本次基础积分（不含加成）' },
    { name: '{{consecutiveBonus}}', description: '连续签到加成' },
    { name: '{{weekendBonus}}', description: '周末加成' },
];

export const LEADERBOARD_TEMPLATE_VARIABLES: TemplateVariable[] = [
    { name: '{{type}}', description: '排行榜类型(week/month/year/all)' },
    { name: '{{typeName}}', description: '排行榜类型名称(如"本周排行榜")' },
    { name: '{{groupId}}', description: '群ID' },
    { name: '{{groupName}}', description: '群名称' },
    { name: '{{updateTime}}', description: '更新时间' },
    { name: '{{usersJson}}', description: '用户列表JSON字符串' },
    { name: '{{usersHtml}}', description: '生成的用户列表HTML(自动转换)' },
    { name: '{{myRankJson}}', description: '我的排名JSON字符串' },
    { name: '{{myRankHtml}}', description: '生成的个人状态栏HTML(自动转换)' },
    { name: '{{hasMyRank}}', description: '是否有我的排名(true/false)' },
    { name: '{{maxPoints}}', description: '最高积分(用于进度条)' },
];
