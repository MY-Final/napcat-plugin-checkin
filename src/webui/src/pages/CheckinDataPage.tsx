import { useState, useEffect } from 'react'
import { getGroupsStats, getGroupStats } from '../utils/api'
import { showToast } from '../hooks/useToast'
import UserDetailModal from '../components/UserDetailModal'
import type { GroupCheckinStats } from '../types'

export default function CheckinDataPage() {
    const [groupsStats, setGroupsStats] = useState<GroupCheckinStats[]>([])
    const [selectedGroup, setSelectedGroup] = useState<string>('')
    const [selectedGroupData, setSelectedGroupData] = useState<GroupCheckinStats | null>(null)
    const [loading, setLoading] = useState(false)
    const [selectedUser, setSelectedUser] = useState<{ userId: string; nickname: string } | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            // 获取所有群统计
            const groupsRes = await getGroupsStats()
            if (groupsRes.code === 0 && groupsRes.data) {
                setGroupsStats(groupsRes.data)
                // 如果没有选中群，默认选中第一个
                if (groupsRes.data.length > 0 && !selectedGroup) {
                    setSelectedGroup(groupsRes.data[0].groupId)
                    setSelectedGroupData(groupsRes.data[0])
                }
            }
        } catch (error) {
            showToast('获取数据失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
        } finally {
            setLoading(false)
        }
    }

    // 当选择的群改变时，获取该群详细数据
    const handleGroupChange = async (groupId: string) => {
        setSelectedGroup(groupId)
        setLoading(true)
        try {
            const res = await getGroupStats(groupId)
            if (res.code === 0 && res.data) {
                setSelectedGroupData(res.data)
            }
        } catch (error) {
            showToast('获取群数据失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="space-y-6">
            {/* 群选择器 - 卡片式 */}
            {groupsStats.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            选择群聊 ({groupsStats.length}个群)
                        </span>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? '刷新中...' : '刷新数据'}
                        </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {groupsStats.map(group => (
                            <button
                                key={group.groupId}
                                onClick={() => handleGroupChange(group.groupId)}
                                className={`flex-shrink-0 text-left p-4 rounded-xl border transition-all duration-200 min-w-[200px] max-w-[280px] ${
                                    selectedGroup === group.groupId
                                        ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 dark:border-brand-500 shadow-sm'
                                        : 'bg-white dark:bg-[#1a1b1d] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        selectedGroup === group.groupId
                                            ? 'bg-brand-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                    }`}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-medium text-sm truncate ${
                                            selectedGroup === group.groupId
                                                ? 'text-brand-700 dark:text-brand-300'
                                                : 'text-gray-900 dark:text-white'
                                        }`}>
                                            {group.groupName || '未命名群'}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {group.groupId}
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs">
                                            <span className="text-gray-600 dark:text-gray-400">
                                                <span className="font-medium text-gray-900 dark:text-white">{group.totalCheckins}</span> 人
                                            </span>
                                            <span className="text-gray-300 dark:text-gray-700">|</span>
                                            <span className="text-gray-600 dark:text-gray-400">
                                                <span className="font-medium text-brand-500">{group.totalPoints.toLocaleString()}</span> 分
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {selectedGroup === group.groupId && (
                                    <div className="mt-3 pt-3 border-t border-brand-200 dark:border-brand-800">
                                        <div className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            当前选中
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 分群排行 */}
            {selectedGroupData && (
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedGroupData.groupName ? (
                                <>{selectedGroupData.groupName} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({selectedGroupData.groupId})</span></>
                            ) : selectedGroupData.groupId} 签到排行
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            群内共 {selectedGroupData.totalCheckins} 人签到，总积分 {selectedGroupData.totalPoints.toLocaleString()}，今日 {selectedGroupData.todayCheckins} 人签到
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">排名</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">用户</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">群内积分</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">签到次数</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">最后签到</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {selectedGroupData.users.map((user, index) => (
                                    <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {index < 3 ? (
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
                                                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 dark:text-gray-400 font-medium ml-2">{index + 1}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div 
                                                className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setSelectedUser({ userId: user.userId, nickname: user.nickname })}
                                            >
                                                <img
                                                    className="w-8 h-8 rounded-full mr-3 object-cover"
                                                    src={`http://q.qlogo.cn/headimg_dl?dst_uin=${user.userId}&spec=100&img_type=jpg`}
                                                    alt={user.nickname}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname)}&size=100&background=FB7299&color=fff`;
                                                    }}
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.nickname}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.userId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-brand-500">{user.groupPoints.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {user.groupCheckinDays} 次
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.lastCheckinDate}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {selectedGroupData.users.length === 0 && (
                            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                                该群暂无签到数据
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 无群数据提示 */}
            {groupsStats.length === 0 && (
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无群签到数据</h3>
                    <p className="text-gray-500 dark:text-gray-400">还没有用户在群内签到，快去群聊中使用签到功能吧！</p>
                </div>
            )}

            {/* 用户详情弹窗 */}
            {selectedUser && (
                <UserDetailModal
                    userId={selectedUser.userId}
                    nickname={selectedUser.nickname}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    )
}