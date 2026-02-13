import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'

interface Template {
    id: string
    name: string
    type: 'checkin' | 'leaderboard'
    html: string
    enabled: boolean
    isDefault: boolean
    createdAt: string
    updatedAt: string
}

interface TemplateConfig {
    randomMode: 'none' | 'random' | 'sequential' | 'daily'
    checkinTemplateId: string | null
    leaderboardTemplateId: string | null
    defaultCheckinTemplateId: string | null
    defaultLeaderboardTemplateId: string | null
    sequentialIndex: number
    lastRotationDate: string
}

const EMPTY_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, "Microsoft YaHei", sans-serif; }
        .card {
            width: 600px;
            height: 380px;
            background: #ffffff;
            border-radius: 36px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            position: relative;
        }
        .glow {
            position: absolute;
            top: -100px;
            right: -100px;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(255, 228, 233, 0.6) 0%, rgba(255, 255, 255, 0) 70%);
        }
        .sidebar {
            position: absolute;
            left: 0;
            top: 140px;
            width: 5px;
            height: 80px;
            background: #fb7185;
            border-radius: 0 3px 3px 0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            padding: 35px 40px 0 40px;
        }
        .avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #fff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .nickname { font-size: 20px; font-weight: bold; color: #18181b; }
        .qq { font-size: 13px; color: #71717a; }
        .rank-number { font-size: 28px; font-weight: bold; color: #f43f5e; font-style: italic; }
        .points { text-align: center; font-size: 88px; font-weight: bold; background: linear-gradient(180deg, #f43f5e 0%, #be185d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .stats { display: flex; justify-content: space-around; margin: 30px 40px 0 40px; padding: 15px 0; background: #fff1f2; border-radius: 20px; }
        .stat-label { font-size: 12px; color: #e11d48; font-weight: 600; }
        .stat-value { font-size: 20px; font-weight: bold; color: #4d1a2a; }
        .footer { position: absolute; bottom: 20px; left: 0; right: 0; text-align: center; }
        .date { font-size: 12px; color: #a1a1aa; }
        .quote { font-size: 12px; color: #d4d4d8; font-style: italic; }
    </style>
</head>
<body>
<div class="card">
    <div class="glow"></div>
    <div class="sidebar"></div>
    <div class="header">
        <img class="avatar" src="{{avatarUrl}}" alt="avatar">
        <div>
            <div class="nickname">{{nickname}}</div>
            <div class="qq">QQ: {{userId}}</div>
        </div>
        <div style="text-align: right;">
            <div class="rank-number">#{{todayRank}}</div>
        </div>
    </div>
    <div class="points">+{{earnedPoints}}</div>
    <div class="stats">
        <div class="stat-item">
            <div class="stat-label">累计天数</div>
            <div class="stat-value">{{totalDays}} 天</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">累计积分</div>
            <div class="stat-value">{{totalPoints}} 分</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">签到时间</div>
            <div class="stat-value">{{checkinTime}}</div>
        </div>
    </div>
    <div class="footer">
        <div class="date">{{currentDate}}</div>
        <div class="quote">"{{quote}}"</div>
    </div>
</div>
</body>
</html>`

const EMPTY_LEADERBOARD_HTML = `<!DOCTYPE html>
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
                <h2>{{typeName}}</h2>
                <div class="group-id"># {{groupId}}</div>
            </div>
        </div>
        <div class="update-tag">LIVE</div>
    </div>
    <div class="leaderboard-list">
        {{usersHtml}}
    </div>
    {{myRankHtml}}
</div>
</body>
</html>`

const CHECKIN_TEST_DATA = {
    nickname: 'Final',
    userId: '1150880493',
    avatarUrl: 'http://q.qlogo.cn/headimg_dl?dst_uin=1150880493&spec=640&img_type=jpg',
    earnedPoints: 21,
    totalPoints: 44,
    totalDays: 1,
    todayRank: 1,
    checkinTime: '09:13:45',
    currentDate: '2026年2月11日',
    quote: '只因你太美',
    consecutiveDays: 1,
}

const LEADERBOARD_TEST_DATA = {
    type: 'week',
    typeName: '本周排行榜',
    groupId: '123456789',
    groupName: '测试群',
    updateTime: '2026-02-11T09:13:45.123Z',
    usersJson: '[{"rank":1,"userId":"1150880493","nickname":"用户A","avatarUrl":"https://q1.qlogo.cn/g?b=qq&nk=1150880493&s=100","periodPoints":500,"totalPoints":1000,"checkinDays":7},{"rank":2,"userId":"1150880494","nickname":"用户B","avatarUrl":"https://q1.qlogo.cn/g?b=qq&nk=1150880494&s=100","periodPoints":400,"totalPoints":800,"checkinDays":6},{"rank":3,"userId":"1150880495","nickname":"用户C","avatarUrl":"https://q1.qlogo.cn/g?b=qq&nk=1150880495&s=100","periodPoints":300,"totalPoints":600,"checkinDays":5}]',
    myRankJson: '{"rank":5,"userId":"1150880496","nickname":"我","avatarUrl":"https://q1.qlogo.cn/g?b=qq&nk=1150880496&s=100","periodPoints":200,"totalPoints":400,"checkinDays":4}',
    hasMyRank: 'true',
    maxPoints: 500,
}

const CHECKIN_VARIABLES = [
    { name: '{{nickname}}', desc: '用户昵称' },
    { name: '{{userId}}', desc: '用户QQ号' },
    { name: '{{avatarUrl}}', desc: '用户头像URL' },
    { name: '{{earnedPoints}}', desc: '本次获得积分' },
    { name: '{{totalPoints}}', desc: '累计积分' },
    { name: '{{totalDays}}', desc: '累计签到天数' },
    { name: '{{todayRank}}', desc: '今日排名' },
    { name: '{{checkinTime}}', desc: '签到时间' },
    { name: '{{currentDate}}', desc: '当前日期' },
    { name: '{{quote}}', desc: '随机寄语' },
    { name: '{{consecutiveDays}}', desc: '连续签到天数' },
    { name: '{{weekdayName}}', desc: '星期几' },
    { name: '{{activeDays}}', desc: '活跃天数' },
    { name: '{{groupName}}', desc: '群名称' },
]

const LEADERBOARD_VARIABLES = [
    { name: '{{type}}', desc: '排行榜类型 (week/month/year/all)' },
    { name: '{{typeName}}', desc: '排行榜类型名称' },
    { name: '{{groupId}}', desc: '群号' },
    { name: '{{groupName}}', desc: '群名称' },
    { name: '{{updateTime}}', desc: '更新时间' },
    { name: '{{usersJson}}', desc: '用户列表JSON' },
    { name: '{{myRankJson}}', desc: '我的排名JSON' },
    { name: '{{hasMyRank}}', desc: '是否有我的排名' },
    { name: '{{maxPoints}}', desc: '最高积分' },
]

export default function TemplateListPage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [randomMode, setRandomMode] = useState<'none' | 'random' | 'sequential' | 'daily'>('none')
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({ name: '', html: '' })
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [isPreviewing, setIsPreviewing] = useState(false)
    const [activeTab, setActiveTab] = useState<'checkin' | 'leaderboard'>('checkin')
    const [lastRenderedTemplateId, setLastRenderedTemplateId] = useState<string | null>(null)
    const [testData, setTestData] = useState(JSON.stringify(CHECKIN_TEST_DATA, null, 2))

    const currentVariables = activeTab === 'checkin' ? CHECKIN_VARIABLES : LEADERBOARD_VARIABLES
    const currentTestData = activeTab === 'checkin' ? CHECKIN_TEST_DATA : LEADERBOARD_TEST_DATA

    const loadTemplates = useCallback(async () => {
        try {
            const res = await noAuthFetch<Template[]>('/templates')
            if (res.code === 0 && res.data) {
                setTemplates(res.data)
            }
        } catch (error) {
            console.error('加载模板失败:', error)
        }
    }, [])

    const loadConfig = useCallback(async () => {
        try {
            const res = await noAuthFetch<TemplateConfig>('/templates/config')
            if (res.code === 0 && res.data) {
                setRandomMode(res.data.randomMode || 'none')
            }
        } catch (error) {
            console.error('加载配置失败:', error)
        }
    }, [])

    useEffect(() => {
        const init = async () => {
            setLoading(true)
            await loadTemplates()
            await loadConfig()
            setLoading(false)
        }
        init()
    }, [loadTemplates, loadConfig])

    useEffect(() => {
        setTestData(JSON.stringify(currentTestData, null, 2))
    }, [activeTab, currentTestData])

    const doPreview = useCallback(async (html: string, type: 'checkin' | 'leaderboard', data: Record<string, any>) => {
        setIsPreviewing(true)
        try {
            const res = await noAuthFetch<{ image: string }>('/template/preview', {
                method: 'POST',
                body: JSON.stringify({
                    template: html,
                    data,
                    type,
                }),
            })

            if (res.code === 0 && res.data?.image) {
                setPreviewImage(res.data.image)
            } else {
                setPreviewImage(null)
            }
        } catch (error) {
            console.error('预览请求失败:', error)
            setPreviewImage(null)
        } finally {
            setIsPreviewing(false)
        }
    }, [])

    useEffect(() => {
        if (selectedTemplate && selectedTemplate.id !== lastRenderedTemplateId) {
            setPreviewImage(null)
            let data: Record<string, any>
            try {
                data = JSON.parse(testData)
            } catch {
                data = currentTestData
            }
            doPreview(selectedTemplate.html, selectedTemplate.type, data)
            setLastRenderedTemplateId(selectedTemplate.id)
        }
    }, [selectedTemplate, lastRenderedTemplateId, doPreview, testData, currentTestData])

    const handleCreateBlank = async () => {
        const newTemplate: Partial<Template> = {
            name: '空白模板',
            type: activeTab,
            html: activeTab === 'checkin' ? EMPTY_HTML : EMPTY_LEADERBOARD_HTML,
        }
        try {
            const res = await noAuthFetch<Template>('/templates', {
                method: 'POST',
                body: JSON.stringify(newTemplate),
            })
            if (res.code === 0 && res.data) {
                showToast('创建成功', 'success')
                loadTemplates()
            } else {
                showToast(res.message || '创建失败', 'error')
            }
        } catch {
            showToast('创建失败', 'error')
        }
    }

    const handleSave = async () => {
        if (!selectedTemplate) return
        try {
            const res = await noAuthFetch<Template>(`/templates/${selectedTemplate.id}`, {
                method: 'PUT',
                body: JSON.stringify(editForm),
            })
            if (res.code === 0 && res.data) {
                showToast('保存成功', 'success')
                setIsEditing(false)
                setSelectedTemplate(res.data)
                setEditForm({ name: res.data.name, html: res.data.html })
                setLastRenderedTemplateId(null)
                loadTemplates()
            } else {
                showToast(res.message || '保存失败', 'error')
            }
        } catch {
            showToast('保存失败', 'error')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这个模板吗？')) return
        try {
            const res = await noAuthFetch(`/templates/${id}`, { method: 'DELETE' })
            if (res.code === 0) {
                showToast('删除成功', 'success')
                if (selectedTemplate?.id === id) {
                    setSelectedTemplate(null)
                    setPreviewImage(null)
                    setLastRenderedTemplateId(null)
                }
                loadTemplates()
            } else {
                showToast(res.message || '删除失败', 'error')
            }
        } catch {
            showToast('删除失败', 'error')
        }
    }

    const handleDuplicate = async (id: string, name: string) => {
        try {
            const res = await noAuthFetch<Template>(`/templates/${id}/duplicate`, {
                method: 'POST',
                body: JSON.stringify({ name: `${name} (副本)` }),
            })
            if (res.code === 0 && res.data) {
                showToast('复制成功', 'success')
                loadTemplates()
            } else {
                showToast(res.message || '复制失败', 'error')
            }
        } catch {
            showToast('复制失败', 'error')
        }
    }

    const handleSetDefault = async (id: string) => {
        try {
            const res = await noAuthFetch(`/templates/${id}/set-default`, { method: 'POST' })
            if (res.code === 0) {
                showToast('已设为默认', 'success')
                loadTemplates()
                loadConfig()
            } else {
                showToast(res.message || '设置失败', 'error')
            }
        } catch {
            showToast('设置失败', 'error')
        }
    }

    const handleConfigChange = async (key: string, value: any) => {
        try {
            const res = await noAuthFetch('/templates/config', {
                method: 'POST',
                body: JSON.stringify({ [key]: value }),
            })
            if (res.code === 0) {
                if (key === 'randomMode') {
                    setRandomMode(value)
                }
                showToast('配置已更新', 'success')
                loadConfig()
            } else {
                showToast(res.message || '更新失败', 'error')
            }
        } catch {
            showToast('更新失败', 'error')
        }
    }

    const handleEditPreview = () => {
        if (selectedTemplate) {
            setLastRenderedTemplateId(null)
            let data: Record<string, any>
            try {
                data = JSON.parse(testData)
            } catch {
                data = currentTestData
            }
            doPreview(editForm.html, selectedTemplate.type, data)
        }
    }

    const handleSelectTemplate = (template: Template) => {
        setSelectedTemplate(template)
        setEditForm({ name: template.name, html: template.html })
        setIsEditing(false)
        setLastRenderedTemplateId(null)
        setPreviewImage(null)
    }

    const insertVariable = (variable: string) => {
        const textarea = document.getElementById('template-editor') as HTMLTextAreaElement
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newValue = editForm.html.substring(0, start) + variable + editForm.html.substring(end)
        setEditForm(prev => ({ ...prev, html: newValue }))

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + variable.length, start + variable.length)
        }, 0)
    }

    const handleInitDefaults = async () => {
        try {
            const res = await noAuthFetch('/templates/init-defaults', { method: 'POST' })
            if (res.code === 0) {
                showToast('已初始化默认模板', 'success')
                loadTemplates()
            } else {
                showToast(res.message || '初始化失败', 'error')
            }
        } catch {
            showToast('初始化失败', 'error')
        }
    }

    const filteredTemplates = templates.filter(t => t.type === activeTab)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner text-brand-500" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setActiveTab('checkin')
                            setSelectedTemplate(null)
                            setPreviewImage(null)
                            setLastRenderedTemplateId(null)
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'checkin'
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        签到模板
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('leaderboard')
                            setSelectedTemplate(null)
                            setPreviewImage(null)
                            setLastRenderedTemplateId(null)
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'leaderboard'
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        排行榜模板
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCreateBlank}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        + 空白模板
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex-1 flex flex-col">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
                            <h3 className="font-medium text-gray-900 dark:text-white">模板列表</h3>
                            <button
                                onClick={handleInitDefaults}
                                className="text-xs text-gray-500 hover:text-brand-500 transition-colors"
                            >
                                初始化默认
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {filteredTemplates.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    暂无模板，点击"空白模板"创建
                                </div>
                            ) : (
                                filteredTemplates.map(template => (
                                    <div
                                        key={template.id}
                                        onClick={() => handleSelectTemplate(template)}
                                        className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                            selectedTemplate?.id === template.id ? 'bg-brand-50 dark:bg-brand-900/20 border-l-4 border-l-brand-500' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {template.isDefault && (
                                                    <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                                                        默认
                                                    </span>
                                                )}
                                                <span className="font-medium text-gray-900 dark:text-white">{template.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSelectTemplate(template)
                                                    setIsEditing(true)
                                                }}
                                                className="px-2 py-1 text-xs text-gray-500 hover:text-brand-500 transition-colors"
                                            >
                                                编辑
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSetDefault(template.id)
                                                }}
                                                className="px-2 py-1 text-xs text-gray-500 hover:text-brand-500 transition-colors"
                                            >
                                                设为默认
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDuplicate(template.id, template.name)
                                                }}
                                                className="px-2 py-1 text-xs text-gray-500 hover:text-brand-500 transition-colors"
                                            >
                                                复制
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDelete(template.id)
                                                }}
                                                className="px-2 py-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex-shrink-0">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="font-medium text-gray-900 dark:text-white">模板设置</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    模板选择模式
                                </label>
                                <select
                                    value={randomMode}
                                    onChange={(e) => handleConfigChange('randomMode', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0f0f10] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                >
                                    <option value="none">禁用（使用指定模板）</option>
                                    <option value="random">随机模式</option>
                                    <option value="sequential">轮询模式</option>
                                    <option value="daily">每日一换</option>
                                </select>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {randomMode === 'none' && '使用下方指定的模板'}
                                {randomMode === 'random' && '每次签到随机选择一个模板'}
                                {randomMode === 'sequential' && '每次签到轮换到下一个模板'}
                                {randomMode === 'daily' && '每天首次签到随机选择模板，当天固定使用'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 h-[calc(100vh-240px)]">
                    {selectedTemplate ? (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="px-2 py-1 border border-transparent rounded bg-transparent text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setIsEditing(false)
                                                        setEditForm({ name: selectedTemplate.name, html: selectedTemplate.html })
                                                    }}
                                                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                                >
                                                    取消
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                                                >
                                                    保存
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="px-3 py-1.5 text-sm bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-200 dark:hover:bg-brand-900/50 transition-colors"
                                            >
                                                编辑模板
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 p-4 overflow-hidden">
                                    <div className="h-full grid grid-cols-2 gap-4">
                                        <div className="flex flex-col overflow-hidden space-y-3">
                                            <div className="flex-1 flex flex-col overflow-hidden">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex-shrink-0">
                                                    HTML 模板 {isEditing ? '(点击下方变量可插入)' : ''}
                                                </label>
                                                <textarea
                                                    id="template-editor"
                                                    value={editForm.html}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, html: e.target.value }))}
                                                    disabled={!isEditing}
                                                    className="flex-1 w-full px-3 py-2 font-mono text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#0f0f10] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 resize-none"
                                                    placeholder="输入 HTML 模板..."
                                                />
                                            </div>
                                            <div className="flex-shrink-0">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    可用变量 (点击插入)
                                                </label>
                                                <div className="max-h-28 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-[#0f0f10]">
                                                    <div className="grid grid-cols-2 gap-1">
                                                        {currentVariables.map((v) => (
                                                            <button
                                                                key={v.name}
                                                                onClick={() => insertVariable(v.name)}
                                                                disabled={!isEditing}
                                                                className="flex items-center gap-1 px-2 py-1 text-left text-xs rounded hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <code className="text-brand-600 dark:text-brand-400 font-mono">{v.name}</code>
                                                                <span className="text-gray-500 dark:text-gray-400 truncate">{v.desc}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    测试数据 (JSON)
                                                </label>
                                                <textarea
                                                    value={testData}
                                                    onChange={(e) => setTestData(e.target.value)}
                                                    className="h-20 w-full px-3 py-2 font-mono text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#0f0f10] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setLastRenderedTemplateId(null)
                                                    let data: Record<string, any>
                                                    try {
                                                        data = JSON.parse(testData)
                                                    } catch {
                                                        data = currentTestData
                                                    }
                                                    doPreview(editForm.html, selectedTemplate.type, data)
                                                }}
                                                disabled={isPreviewing}
                                                className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex-shrink-0"
                                            >
                                                {isPreviewing ? '渲染中...' : '刷新预览'}
                                            </button>
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex-shrink-0">
                                                预览效果
                                            </label>
                                            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                                                {isPreviewing ? (
                                                    <div className="loading-spinner text-brand-500" />
                                                ) : previewImage ? (
                                                    <img src={previewImage} alt="预览" className="max-w-full max-h-full object-contain" />
                                                ) : (
                                                    <div className="text-center text-gray-400 p-4">
                                                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-sm">点击"刷新预览"查看效果</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center">
                            <div className="text-center text-gray-400">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                </svg>
                                <p className="mb-2">从左侧选择一个模板</p>
                                <p className="text-sm text-gray-400">或点击右上角"空白模板"创建新模板</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
