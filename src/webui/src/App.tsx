import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ToastContainer from './components/ToastContainer'
import StatusPage from './pages/StatusPage'
import HelpPage from './pages/HelpPage'
import ConfigPage from './pages/ConfigPage'
import GroupsPage from './pages/GroupsPage'
import ActiveRankingPage from './pages/ActiveRankingPage'
import LeaderboardPage from './pages/LeaderboardPage'
import CheckinDataPage from './pages/CheckinDataPage'
import TemplatePage from './pages/TemplatePage'
import LeaderboardTemplatePage from './pages/LeaderboardTemplatePage'
import ApiDocsPage from './pages/ApiDocsPage'
import BalancePage from './pages/BalancePage'
import { useStatus } from './hooks/useStatus'
import { useTheme } from './hooks/useTheme'

export type PageId = 'status' | 'help' | 'config' | 'groups' | 'leaderboard' | 'active-ranking' | 'checkin' | 'balance' | 'template' | 'leaderboard-template' | 'apidocs'

const pageConfig: Record<PageId, { title: string; desc: string }> = {
    status: { title: '仪表盘', desc: '插件运行状态与数据概览' },
    help: { title: '使用说明', desc: '插件使用指南与扩展开发文档' },
    config: { title: '插件配置', desc: '基础设置与参数配置' },
    groups: { title: '群管理', desc: '管理群的启用与禁用' },
    leaderboard: { title: '排行榜', desc: '查看周榜、月榜、年榜和总榜' },
    'active-ranking': { title: '活跃排行', desc: '查看全服活跃排行榜（识别忠实用户）' },
    checkin: { title: '分群排行', desc: '查看各群的签到排行' },
    balance: { title: '我的余额', desc: '查看用户在各群的余额详情' },
    template: { title: '模板编辑', desc: '自定义签到卡片 HTML 模板' },
    'leaderboard-template': { title: '排行榜模板', desc: '自定义排行榜卡片 HTML 模板' },
    apidocs: { title: '接口文档', desc: 'API 接口文档与调用参考' }
}

function App() {
    const [currentPage, setCurrentPage] = useState<PageId>('status')
    const [isScrolled, setIsScrolled] = useState(false)
    const { status, fetchStatus } = useStatus()

    useTheme()

    useEffect(() => {
        fetchStatus()
        const interval = setInterval(fetchStatus, 5000)
        return () => clearInterval(interval)
    }, [fetchStatus])

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 10)
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'status': return <StatusPage status={status} onRefresh={fetchStatus} />
            case 'help': return <HelpPage />
            case 'config': return <ConfigPage />
            case 'groups': return <GroupsPage />
            case 'leaderboard': return <LeaderboardPage />
            case 'active-ranking': return <ActiveRankingPage />
            case 'checkin': return <CheckinDataPage />
            case 'balance': return <BalancePage />
            case 'template': return <TemplatePage />
            case 'leaderboard-template': return <LeaderboardTemplatePage />
            case 'apidocs': return <ApiDocsPage />
            default: return <StatusPage status={status} onRefresh={fetchStatus} />
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#f8f9fa] dark:bg-[#18191C] text-gray-800 dark:text-gray-200 transition-colors duration-300">
            <ToastContainer />
            <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto" onScroll={handleScroll}>
                    <Header
                        title={pageConfig[currentPage].title}
                        description={pageConfig[currentPage].desc}
                        isScrolled={isScrolled}
                        status={status}
                        currentPage={currentPage}
                    />
                    <div className="px-4 md:px-8 pb-8">
                        <div key={currentPage} className="page-enter">
                            {renderPage()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default App