import { useState, useEffect } from 'react'
import { getUserBalanceData } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { UserBalanceData, GroupBalance } from '../types'

export default function BalancePage() {
    const [userId, setUserId] = useState('')
    const [balanceData, setBalanceData] = useState<UserBalanceData | null>(null)
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)

    const handleSearch = async () => {
        if (!userId.trim()) {
            showToast('请输入用户ID', 'error')
            return
        }
        setSearching(true)
        setLoading(true)
        try {
            const res = await getUserBalanceData(userId.trim())
            if (res.code === 0 && res.data) {
                setBalanceData(res.data)
            } else {
                showToast(res.message || '查询失败', 'error')
            }
        } catch (error) {
            showToast('查询失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    return (
        <div className="space-y-6">
            {/* 搜索框 */}
            <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">查询用户余额</h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="输入用户QQ号"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-6 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
                    >
                        {loading ? '查询中...' : '查询'}
                    </button>
                </div>
            </div>

            {/* 用户信息概览 */}
            {searching && balanceData && (
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                        <img
                            src={`http://q.qlogo.cn/headimg_dl?dst_uin=${balanceData.userId}&spec=100&img_type=jpg`}
                            alt="头像"
                            className="w-16 h-16 rounded-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(balanceData.userId)}&size=100&background=FB7299&color=fff`
                            }}
                        />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">用户 {balanceData.userId}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">已在 {balanceData.groupCount} 个群参与签到</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 分群余额详情 */}
            {searching && balanceData && balanceData.groups.length > 0 && (
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">分群余额详情</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            用户在各群内的余额分布情况
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">群名称</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">群ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">余额</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">经验值</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">签到天数</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {balanceData.groups.map((group) => (
                                    <tr key={group.groupId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {group.groupName || '未命名群'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {group.groupId}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-green-500">{group.balance.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-brand-500">{group.totalExp.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {group.totalCheckinDays} 天
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 无数据提示 */}
            {searching && balanceData && balanceData.groups.length === 0 && (
                <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                    <div className="text-6xl mb-4">(｡･ω･｡)</div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无余额数据</h3>
                    <p className="text-gray-500 dark:text-gray-400">该用户还没有在任何群签到过</p>
                </div>
            )}
        </div>
    )
}
