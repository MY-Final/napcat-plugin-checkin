/**
 * 签到服务主入口
 * 整合所有签到相关功能，提供统一的API接口
 */

import { performCheckin } from './checkin-core';
import { 
    getUserCheckinData, 
    getGroupUserCheckinData, 
    getAllUsersData, 
    getActiveRanking, 
    getGroupAllUsersData,
    getTodayCheckinCount,
    getGroupTodayCheckinCount,
    getUserTodayRank,
    getUserGroupTodayRank,
    getTodayRanking,
    getGroupTodayRanking,
    cleanupOldData,
    getGroupCheckinStats,
    getAllGroupsStats
} from './checkin-queries';
import { 
    getGroupUserPoints, 
    updateGroupUserPoints, 
    getGroupUserPointsHistory, 
    resetGroupUserPoints,
    setGroupUserPoints
} from './checkin-points';
import { loadGroupUsersData, saveGroupUsersData, loadGroupDailyStats, saveGroupDailyStats, canCheckinToday, getGroupDataFile } from './checkin-data';

// 导出所有功能
export {
    // 核心签到功能
    performCheckin,
    
    // 查询和统计功能
    getUserCheckinData,
    getGroupUserCheckinData,
    getAllUsersData,
    getActiveRanking,
    getGroupAllUsersData,
    getTodayCheckinCount,
    getGroupTodayCheckinCount,
    getUserTodayRank,
    getUserGroupTodayRank,
    getTodayRanking,
    getGroupTodayRanking,
    cleanupOldData,
    getGroupCheckinStats,
    getAllGroupsStats,
    
    // 积分管理功能
    getGroupUserPoints,
    updateGroupUserPoints,
    getGroupUserPointsHistory,
    resetGroupUserPoints,
    setGroupUserPoints,
    
    // 数据管理功能
    loadGroupUsersData,
    saveGroupUsersData,
    loadGroupDailyStats,
    saveGroupDailyStats,
    canCheckinToday,
    getGroupDataFile,
};

// 导出类型
export type { CheckinResult } from '../../types';
