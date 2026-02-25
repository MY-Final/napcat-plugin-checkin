import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getLeaderboard, noAuthFetch, setUserPoints } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { LeaderboardData, LeaderboardType, GroupInfo } from '../types'
import { IconSearch, IconX } from '../components/icons'

interface EditUser {
    userId: string
    nickname: string
    totalExp: number
    balance: number
}

export default function LeaderboardPage() {
    const [groups, setGroups] = useState<{ groupId: string; groupName: string }[]>([])
    const [selectedGroup, setSelectedGroup] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
    const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('week')
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null)
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const searchRef = useRef<HTMLDivElement>(null)
    
    // 编辑模态框状态
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<EditUser | null>(null)
    const [editTotalExp, setEditTotalExp] = useState('')
    const [editBalance, setEditBalance] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editLoading, setEditLoading] = useState(false)

    const typeNames: Record<LeaderboardType, string> = {
        week: '本周排行榜',
        month: '本月排行榜',
        year: '年度排行榜',
        all: '总积分榜',
    }

    const typeIcons: Record<LeaderboardType, string> = {
        week: '📅',
        month: '📆',
        year: '📊',
        all: '🏆',
    }

    const fetchGroups = async () => {
        try {
            setError(null)
            const res = await noAuthFetch<GroupInfo[]>('/groups')
            if (res.code === 0 && res.data) {
                const formattedGroups = res.data.map(g => ({
                    groupId: String(g.group_id),
                    groupName: g.group_name
                }))
                setGroups(formattedGroups)
                if (formattedGroups.length > 0 && !selectedGroup) {
                    setSelectedGroup(formattedGroups[0].groupId)
                    setSearchQuery(formattedGroups[0].groupName || `群 ${formattedGroups[0].groupId}`)
                }
            } else {
                setError('获取群组列表失败')
            }
        } catch (error) {
            console.error('获取群组列表失败:', error)
            setError('获取群组列表失败: ' + (error instanceof Error ? error.message : '未知错误'))
        }
    }

    const fetchLeaderboard = async () => {
        if (!selectedGroup) return
        
        setLoading(true)
        setError(null)
        try {
            const res = await getLeaderboard(selectedGroup, leaderboardType)
            if (res.code === 0 && res.data) {
                setLeaderboardData(res.data)
            } else {
                setError(res.message || '获取排行榜失败')
            }
        } catch (error) {
            console.error('获取排行榜失败:', error)
            setError('获取排行榜失败: ' + (error instanceof Error ? error.message : '未知错误'))
        } finally {
            setLoading(false)
            setInitialLoading(false)
        }
    }

    useEffect(() => {
        fetchGroups()
    }, [])

    useEffect(() => {
        if (selectedGroup) {
            fetchLeaderboard()
        }
    }, [selectedGroup, leaderboardType])

    // 点击外部关闭下拉框
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const getRankStyle = (rank: number) => {
        if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg shadow-yellow-200'
        if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-lg shadow-gray-200'
        if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-200'
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
    }

    // 搜索过滤逻辑 - 优化：始终显示所有群组作为可选项，搜索只是过滤显示
    const filteredGroups = groups.filter(group => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        const matchName = group.groupName?.toLowerCase().includes(query)
        const matchId = group.groupId.includes(query)
        return matchName || matchId
    })

    // 选择群组
    const handleSelectGroup = (group: { groupId: string; groupName: string }) => {
        setSelectedGroup(group.groupId)
        // 选中后显示群名称，方便用户识别
        setSearchQuery(group.groupName || `群 ${group.groupId}`)
        setDropdownOpen(false)
    }

    // 清空搜索 - 真正清空搜索内容并打开下拉框
    const handleClearSearch = () => {
        // Clear the input value and reset selection, then open dropdown
        setSearchQuery('')
        setSelectedGroup('')
        setDropdownOpen(true)
        // Focus the input to give user immediate typing feedback
        setTimeout(() => {
            const input = searchRef.current?.querySelector('input') as HTMLInputElement | null
            if (input) input.focus()
        }, 0)
    }

    const maxPoints = leaderboardData?.users[0]?.periodPoints || 1

    // 打开编辑模态框
    const handleOpenEdit = (user: { userId: string; nickname: string; totalExp?: number; totalPoints?: number; balance?: number }) => {
        setEditingUser({
            userId: user.userId,
            nickname: user.nickname,
            totalExp: user.totalExp || user.totalPoints || 0,
            balance: user.balance || 0
        })
        setEditTotalExp(String(user.totalExp || user.totalPoints || 0))
        setEditBalance(String(user.balance || 0))
        setEditDescription('')
        setEditModalOpen(true)
    }

    // 保存编辑
    const handleSaveEdit = async () => {
        if (!editingUser || !selectedGroup) return
        
        const totalExp = editTotalExp === '' ? undefined : parseInt(editTotalExp)
        const balance = editBalance === '' ? undefined : parseInt(editBalance)
        
        if (totalExp !== undefined && isNaN(totalExp)) {
            showToast('经验值必须是有效数字', 'error')
            return
        }
        if (balance !== undefined && isNaN(balance)) {
            showToast('余额必须是有效数字', 'error')
            return
        }
        if (totalExp !== undefined && totalExp < 0) {
            showToast('经验值不能为负数', 'error')
            return
        }
        if (balance !== undefined && balance < 0) {
            showToast('余额不能为负数', 'error')
            return
        }
        
        setEditLoading(true)
        try {
            const res = await setUserPoints(selectedGroup, editingUser.userId, {
                totalExp,
                balance,
                description: editDescription || '管理员调整'
            })
            
            if (res.code === 0) {
                showToast('修改成功', 'success')
                setEditModalOpen(false)
                fetchLeaderboard()
            } else {
                showToast(res.message || '修改失败', 'error')
            }
        } catch (error) {
            console.error('修改积分失败:', error)
            showToast('修改失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
        } finally {
            setEditLoading(false)
        }
    }

    if (initialLoading && !leaderboardData && !error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">加载中...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 标题和选择器 */}
            <div className="bg-white dark:bg-[#1a1b1d] rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-3xl">{typeIcons[leaderboardType]}</span>
                            {typeNames[leaderboardType]}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            查看群内积分排行，激励群友积极签到
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full">
                        {/* 搜索选择器 - 组合框 */}
                        <div className="relative flex-1 max-w-md" ref={searchRef}>
                            <div className="relative">
                                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="搜索群名称或群号..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value)
                                        setDropdownOpen(true)
                                    }}
                                    onFocus={() => setDropdownOpen(true)}
                                    className="w-full rounded-lg pl-9 pr-9 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={handleClearSearch}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <IconX size={14} />
                                    </button>
                                )}
                            </div>
                            
                            {/* 下拉列表 */}
                            {dropdownOpen && filteredGroups.length > 0 && (
                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-auto">
                                    {filteredGroups.map(group => (
                                        <div
                                            key={group.groupId}
                                            onClick={() => handleSelectGroup(group)}
                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                                selectedGroup === group.groupId ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                                            }`}
                                        >
                                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                {group.groupName || '未知群'}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                群号: {group.groupId}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {dropdownOpen && searchQuery && filteredGroups.length === 0 && (
                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                                    未找到匹配的群组
                                </div>
                            )}
                        </div>

                        {/* 类型切换 */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            {(Object.keys(typeNames) as LeaderboardType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setLeaderboardType(type)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                        leaderboardType === type
                                            ? 'bg-white dark:bg-[#1a1b1d] text-brand-600 dark:text-brand-400 shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {type === 'week' ? '周榜' : type === 'month' ? '月榜' : type === 'year' ? '年榜' : '总榜'}
                                </button>
                            ))}
                        </div>

                        {/* 刷新按钮 */}
                        <button
                            onClick={fetchLeaderboard}
                            disabled={loading || !selectedGroup}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    加载中
                                </span>
                            ) : (
                                '刷新'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* 错误提示 */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    </div>
                </div>
            )}

            {/* 排行榜内容 */}
            {leaderboardData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左侧：排行榜列表 */}
                    <div className="lg:col-span-2 space-y-4">
                        {leaderboardData.users.length === 0 ? (
                            <div className="bg-white dark:bg-[#1a1b1d] rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
                                <div className="text-6xl mb-4">🏃</div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无数据</h3>
                                <p className="text-gray-500 dark:text-gray-400">该周期内还没有人签到，快来做第一个签到的人吧！</p>
                            </div>
                        ) : (
                            leaderboardData.users.map((user, index) => {
                                const percentage = maxPoints > 0 ? (user.periodPoints / maxPoints) * 100 : 0
                                const isTop3 = user.rank <= 3
                                
                                return (
                                    <div
                                        key={user.userId}
                                        className={`bg-white dark:bg-[#1a1b1d] rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg ${
                                            isTop3 
                                                ? 'border-brand-200 dark:border-brand-800 shadow-brand-100 dark:shadow-none' 
                                                : 'border-gray-200 dark:border-gray-800 hover:border-brand-200 dark:hover:border-brand-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* 排名 */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${getRankStyle(user.rank)}`}>
                                                {user.rank <= 3 ? (
                                                    <span>{['🥇', '🥈', '🥉'][user.rank - 1]}</span>
                                                ) : (
                                                    <span>#{user.rank}</span>
                                                )}
                                            </div>

                                            {/* 头像 */}
                                            <div className="relative">
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.nickname}
                                                    className={`w-14 h-14 rounded-2xl object-cover border-2 ${
                                                        isTop3 ? 'border-brand-400' : 'border-gray-200 dark:border-gray-700'
                                                    }`}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname)}&size=100&background=FB7299&color=fff`
                                                    }}
                                                />
                                                {isTop3 && (
                                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs">
                                                        👑
                                                    </div>
                                                )}
                                            </div>

                                            {/* 用户信息 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                        {user.nickname}
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-bold text-brand-500">
                                                            {(user.periodPoints || 0).toLocaleString()}
                                                            <span className="text-xs text-gray-400 ml-1">积分</span>
                                                        </span>
                                                        <button
                                                            onClick={() => handleOpenEdit(user)}
                                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-brand-100 dark:hover:bg-brand-900/30 text-gray-500 hover:text-brand-500 transition-colors"
                                                            title="编辑积分"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* 进度条 */}
                                                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${
                                                            user.rank === 1 
                                                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' 
                                                                : user.rank === 2 
                                                                    ? 'bg-gradient-to-r from-gray-300 to-gray-400' 
                                                                    : user.rank === 3 
                                                                        ? 'bg-gradient-to-r from-orange-400 to-orange-500' 
                                                                        : 'bg-gradient-to-r from-brand-400 to-brand-500'
                                                        }`}
                                                        style={{ width: `${Math.max(percentage, 5)}%` }}
                                                    />
                                                </div>
                                                
                                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        签到 {user.checkinDays} 天
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        累计 {(user.totalExp || user.totalPoints || 0).toLocaleString()} 积分
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* 右侧：统计信息 */}
                    <div className="space-y-4">
                        {/* 统计卡片 */}
                        <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                排行榜统计
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-brand-100">上榜人数</span>
                                    <span className="text-2xl font-bold">{leaderboardData.users.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-brand-100">总积分</span>
                                    <span className="text-xl font-bold">
                                        {leaderboardData.users.reduce((sum, u) => sum + u.periodPoints, 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-brand-100">平均积分</span>
                                    <span className="text-xl font-bold">
                                        {leaderboardData.users.length > 0 
                                            ? Math.round(leaderboardData.users.reduce((sum, u) => sum + u.periodPoints, 0) / leaderboardData.users.length).toLocaleString()
                                            : 0
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 我的排名 */}
                        {leaderboardData.myRank ? (
                            <div className="bg-white dark:bg-[#1a1b1d] rounded-2xl p-6 border-2 border-brand-200 dark:border-brand-800">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    我的排名
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${getRankStyle(leaderboardData.myRank.rank)}`}>
                                        #{leaderboardData.myRank.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                                            {leaderboardData.myRank.nickname}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                            <span>{(leaderboardData.myRank?.periodPoints || 0).toLocaleString()} 积分</span>
                                            <span>·</span>
                                            <span>{leaderboardData.myRank.checkinDays} 天</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                                    <div className="text-center">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">超过群友</span>
                                        <p className="text-2xl font-bold text-brand-500 mt-1">
                                            {leaderboardData.users.length > 0 
                                                ? Math.round(((leaderboardData.users.length - leaderboardData.myRank.rank) / leaderboardData.users.length) * 100)
                                                : 0
                                            }%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 text-center border border-dashed border-gray-300 dark:border-gray-700">
                                <div className="text-4xl mb-3">📝</div>
                                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">尚未上榜</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">快去签到获取积分，冲击排行榜吧！</p>
                            </div>
                        )}

                        {/* 更新时间 */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                更新时间: {new Date(leaderboardData.updateTime).toLocaleString('zh-CN')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!leaderboardData && !loading && !error && selectedGroup && (
                <div className="bg-white dark:bg-[#1a1b1d] rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无数据</h3>
                    <p className="text-gray-500 dark:text-gray-400">该群组暂无排行榜数据</p>
                </div>
            )}

            {!selectedGroup && !loading && (
                <div className="bg-white dark:bg-[#1a1b1d] rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">请先选择群组</h3>
                    <p className="text-gray-500 dark:text-gray-400">请从上方搜索并选择群组查看排行榜</p>
                </div>
            )}

            {/* 编辑积分模态框 */}
            {editModalOpen && editingUser && createPortal(
                <div 
                    className="fixed inset-0 z-[9999]"
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                    {/* 背景遮罩 */}
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
                        onClick={() => setEditModalOpen(false)}
                    />
                    
                    {/* 内容容器 - 垂直水平居中 */}
                    <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                        <div 
                            className="bg-white dark:bg-[#1a1b1d] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 头部 */}
                            <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6 relative">
                                <button
                                    onClick={() => setEditModalOpen(false)}
                                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
                                    aria-label="关闭"
                                >
                                    <IconX size={16} />
                                </button>
                                <h3 className="text-lg font-bold text-white pr-8">编辑用户积分</h3>
                            </div>

                            {/* 内容区域 */}
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        用户
                                    </label>
                                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white">
                                        {editingUser.nickname} ({editingUser.userId})
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        累计经验值 (totalExp)
                                    </label>
                                    <input
                                        type="number"
                                        value={editTotalExp}
                                        onChange={(e) => setEditTotalExp(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="留空表示不修改"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">用于排名和等级计算，留空则不修改</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        可用余额 (balance)
                                    </label>
                                    <input
                                        type="number"
                                        value={editBalance}
                                        onChange={(e) => setEditBalance(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="留空表示不修改"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">可用于消费和兑换，留空则不修改</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        操作说明
                                    </label>
                                    <input
                                        type="text"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="可选，用于记录本次操作原因"
                                    />
                                </div>
                                
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => setEditModalOpen(false)}
                                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={editLoading}
                                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        {editLoading ? '保存中...' : '保存'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
