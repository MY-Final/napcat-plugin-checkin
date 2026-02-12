import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'

interface TemplateVariable {
  name: string
  description: string
  example: string
}

const LEADERBOARD_TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: '{{type}}', description: '排行榜类型', example: 'week' },
  { name: '{{typeName}}', description: '类型名称', example: '本周排行榜' },
  { name: '{{groupId}}', description: '群ID', example: '123456789' },
  { name: '{{groupName}}', description: '群名称', example: '测试群' },
  { name: '{{updateTime}}', description: '更新时间', example: '2026-02-11T09:13:45.123Z' },
  { name: '{{usersJson}}', description: '用户列表JSON（用于循环）', example: '[{"rank":1,...}]' },
  { name: '{{myRankJson}}', description: '我的排名JSON', example: '{"rank":5,...}' },
  { name: '{{hasMyRank}}', description: '是否有我的排名', example: 'true' },
  { name: '{{maxPoints}}', description: '最高积分', example: '1000' },
  { name: '{{user.rank}}', description: '用户排名', example: '1' },
  { name: '{{user.userId}}', description: '用户QQ号', example: '1150880493' },
  { name: '{{user.nickname}}', description: '用户昵称', example: 'Final' },
  { name: '{{user.avatarUrl}}', description: '用户头像URL', example: 'https://q1.qlogo.cn/...' },
  { name: '{{user.periodPoints}}', description: '周期内积分', example: '500' },
  { name: '{{user.totalPoints}}', description: '总积分', example: '1000' },
  { name: '{{user.checkinDays}}', description: '签到天数', example: '7' },
  { name: '{{myRank.rank}}', description: '我的排名', example: '5' },
  { name: '{{myRank.userId}}', description: '我的QQ号', example: '1150880493' },
  { name: '{{myRank.nickname}}', description: '我的昵称', example: 'Final' },
  { name: '{{myRank.avatarUrl}}', description: '我的头像URL', example: 'https://q1.qlogo.cn/...' },
  { name: '{{myRank.periodPoints}}', description: '我的周期积分', example: '300' },
]

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
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

const DEFAULT_TEST_DATA = {
  type: 'week',
  typeName: '本周排行榜',
  groupId: '123456789',
  groupName: '测试群',
  updateTime: '2026-02-11T09:13:45.123Z',
  usersJson: JSON.stringify([
    { rank: 1, userId: '1150880493', nickname: '用户A', avatarUrl: 'https://q1.qlogo.cn/g?b=qq&nk=1150880493&s=100', periodPoints: 500, totalPoints: 1000, checkinDays: 7 },
    { rank: 2, userId: '1150880494', nickname: '用户B', avatarUrl: 'https://q1.qlogo.cn/g?b=qq&nk=1150880494&s=100', periodPoints: 400, totalPoints: 800, checkinDays: 6 },
    { rank: 3, userId: '1150880495', nickname: '用户C', avatarUrl: 'https://q1.qlogo.cn/g?b=qq&nk=1150880495&s=100', periodPoints: 300, totalPoints: 600, checkinDays: 5 },
  ]),
  myRankJson: JSON.stringify({ rank: 5, userId: '1150880496', nickname: '我', avatarUrl: 'https://q1.qlogo.cn/g?b=qq&nk=1150880496&s=100', periodPoints: 200, totalPoints: 400, checkinDays: 4 }),
  hasMyRank: 'true',
  maxPoints: 500,
}

export default function LeaderboardTemplatePage() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [testData, setTestData] = useState(JSON.stringify(DEFAULT_TEST_DATA, null, 2))
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [renderTime, setRenderTime] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [useCustomTemplate, setUseCustomTemplate] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await noAuthFetch<{ customLeaderboardTemplate?: string }>('/config')
        if (res.code === 0 && res.data?.customLeaderboardTemplate) {
          setTemplate(res.data.customLeaderboardTemplate)
          setUseCustomTemplate(true)
        }
      } catch {
        // 使用默认模板
      }
    }
    loadConfig()
  }, [])

  const handlePreview = useCallback(async () => {
    setIsRendering(true)
    const startTime = Date.now()
    try {
      let data: Record<string, string | number>
      try {
        data = JSON.parse(testData)
      } catch {
        showToast('测试数据 JSON 格式错误', 'error')
        setIsRendering(false)
        return
      }

      const res = await noAuthFetch<{ image: string }>('/template/preview', {
        method: 'POST',
        body: JSON.stringify({ template, data, type: 'leaderboard' }),
      })

      if (res.code === 0 && res.data?.image) {
        setPreviewImage(res.data.image)
        setRenderTime(Date.now() - startTime)
        showToast('渲染成功', 'success')
      } else {
        showToast(res.message || '渲染失败', 'error')
      }
    } catch {
      showToast('渲染请求失败', 'error')
    } finally {
      setIsRendering(false)
    }
  }, [template, testData])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await noAuthFetch('/config', {
        method: 'POST',
        body: JSON.stringify({
          customLeaderboardTemplate: useCustomTemplate ? template : undefined,
        }),
      })

      if (res.code === 0) {
        showToast('模板保存成功', 'success')
      } else {
        showToast(res.message || '保存失败', 'error')
      }
    } catch {
      showToast('保存请求失败', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [template, useCustomTemplate])

  const handleReset = () => {
    if (confirm('确定要重置为默认模板吗？当前编辑的内容将丢失。')) {
      setTemplate(DEFAULT_TEMPLATE)
      showToast('已重置为默认模板', 'success')
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('leaderboard-template-editor') as HTMLTextAreaElement
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = template.substring(0, start) + variable + template.substring(end)
    setTemplate(newValue)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between mb-4 bg-white dark:bg-[#1a1b1d] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">排行榜卡片模板</h3>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={useCustomTemplate}
              onChange={(e) => setUseCustomTemplate(e.target.checked)}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            使用自定义模板
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">重置默认</button>
          <button onClick={handlePreview} disabled={isRendering} className="px-4 py-2 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-lg text-sm font-medium hover:bg-brand-200 dark:hover:bg-brand-900/50 disabled:opacity-50 transition-colors">{isRendering ? '渲染中...' : '预览'}</button>
          <button onClick={handleSave} disabled={isSaving || !useCustomTemplate} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{isSaving ? '保存中...' : '保存模板'}</button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">HTML 模板</span>
              <span className="text-xs text-gray-400">支持双括号变量语法</span>
            </div>
            <textarea
              id="leaderboard-template-editor"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              disabled={!useCustomTemplate}
              className="flex-1 w-full p-4 text-sm font-mono bg-gray-50 dark:bg-[#0f0f10] text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
              placeholder="在此输入 HTML 模板..."
              spellCheck={false}
            />
          </div>
          <div className="h-48 bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">测试数据 (JSON)</span>
            </div>
            <textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              className="flex-1 w-full p-4 text-sm font-mono bg-gray-50 dark:bg-[#0f0f10] text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="输入测试数据 JSON..."
              spellCheck={false}
            />
          </div>
          <div className="h-48 bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">可用变量 (点击插入)</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-2 gap-1">
                {LEADERBOARD_TEMPLATE_VARIABLES.map((variable) => (
                  <button
                    key={variable.name}
                    onClick={() => insertVariable(variable.name)}
                    disabled={!useCustomTemplate}
                    className="flex items-center gap-2 px-3 py-2 text-left text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group disabled:opacity-50"
                  >
                    <code className="text-brand-600 dark:text-brand-400 font-mono bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded">{variable.name}</code>
                    <span className="text-gray-500 dark:text-gray-400">{variable.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-100 dark:bg-[#0f0f10] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#1a1b1d]">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">渲染预览</span>
            {renderTime !== null && <span className="text-xs text-gray-400">耗时: {renderTime}ms</span>}
          </div>
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            {previewImage ? (
              <img src={previewImage} alt="预览" className="max-w-full max-h-full rounded-lg shadow-lg" />
            ) : (
              <div className="text-center text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>点击"预览"按钮查看渲染效果</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
