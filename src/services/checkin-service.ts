/**
 * 重构后的签到服务
 * 支持分群签到，每个群独立统计
 */

// 从新的文件夹结构导入
import {
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
} from './checkin/checkin-service';

// 重新导出所有功能，保持接口不变
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

// 确保类型也被导出
export type { CheckinResult } from '../types';
