import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getUserCheckinData } from '../utils/api'
import type { UserCheckinData } from '../types'

interface UserDetailModalProps {
  userId: string
  nickname: string
  onClose: () => void
}

export default function UserDetailModal({ userId, nickname, onClose }: UserDetailModalProps) {
  const [userData, setUserData] = useState<UserCheckinData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await getUserCheckinData(userId)
        if (res.code === 0 && res.data) {
          setUserData(res.data)
        }
      } catch (error) {
        console.error('获取用户数据失败:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [userId])

  // 获取最近签到记录
  const getLastCheckin = () => {
    if (!userData?.checkinHistory?.length) return null
    return userData.checkinHistory[userData.checkinHistory.length - 1]
  }

  const lastCheckin = getLastCheckin()

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999]"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 内容容器 - 垂直水平居中 */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white dark:bg-[#1a1b1d] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部渐变背景 */}
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6 relative">
            {/* 关闭按钮 */}
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all z-10"
              aria-label="关闭"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            
            {/* 用户信息 */}
            <div className="flex items-center gap-4 pt-2">
              <div className="relative">
                <img
                  src={`http://q.qlogo.cn/headimg_dl?dst_uin=${userId}&spec=640&img_type=jpg`}
                  alt={nickname}
                  className="w-16 h-16 rounded-full border-4 border-white/40 shadow-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&size=200&background=FB7299&color=fff`
                  }}
                />
              </div>
              <div className="text-white flex-1 min-w-0">
                <h3 className="text-lg font-bold truncate pr-8">{nickname}</h3>
                <p className="text-white/70 text-sm">QQ: {userId}</p>
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="loading-spinner text-brand-500" />
              </div>
            ) : userData ? (
              <>
                {/* 统计卡片 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-brand-500">{userData.totalPoints}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">累计积分</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-green-500">{userData.totalCheckinDays}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">签到天数</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-blue-500">{userData.activeDays || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">活跃天数</div>
                  </div>
                </div>

                {/* 连续签到 */}
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-800 dark:text-orange-200">连续签到</span>
                    <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {userData.consecutiveDays} 天
                    </span>
                  </div>
                </div>

                {/* 最近签到 */}
                {lastCheckin && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">最近签到</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">日期</span>
                        <span className="text-gray-900 dark:text-white">{lastCheckin.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">时间</span>
                        <span className="text-gray-900 dark:text-white">{lastCheckin.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">获得积分</span>
                        <span className="text-brand-500 font-medium">+{lastCheckin.points}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">当日排名</span>
                        <span className="text-gray-900 dark:text-white">#{lastCheckin.rank}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                暂无用户数据
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // 使用 Portal 渲染到 body，避免被父容器限制
  return createPortal(modalContent, document.body)
}