import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'

interface TemplateVariable {
  name: string
  description: string
  example: string
}

const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: '{{nickname}}', description: '用户昵称', example: '小甜心' },
  { name: '{{userId}}', description: '用户QQ号', example: '1150880493' },
  { name: '{{avatarUrl}}', description: '用户头像URL', example: 'http://q.qlogo.cn/...' },
  { name: '{{earnedPoints}}', description: '本次获得积分', example: '21' },
  { name: '{{totalPoints}}', description: '累计积分', example: '44' },
  { name: '{{totalDays}}', description: '累计签到天数', example: '1' },
  { name: '{{todayRank}}', description: '今日排名', example: '1' },
  { name: '{{checkinTime}}', description: '签到时间', example: '22:37:08' },
  { name: '{{currentDate}}', description: '当前日期', example: '2026年2月10日' },
  { name: '{{quote}}', description: '随机寄语', example: '保持热爱，奔赴山海' },
  { name: '{{consecutiveDays}}', description: '连续签到天数', example: '3' },
]

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: transparent;
            font-family: -apple-system, "Microsoft YaHei", sans-serif;
        }
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
        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #fff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .nickname {
            font-size: 20px;
            font-weight: bold;
            color: #18181b;
        }
        .qq {
            font-size: 13px;
            color: #71717a;
        }
        .rank-number {
            font-size: 28px;
            font-weight: bold;
            color: #f43f5e;
            font-style: italic;
        }
        .rank-label {
            font-size: 11px;
            color: #a1a1aa;
            font-weight: 600;
        }
        .points {
            text-align: center;
            font-size: 88px;
            font-weight: bold;
            background: linear-gradient(180deg, #f43f5e 0%, #be185d 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-top: 10px;
        }
        .points-label {
            text-align: center;
            font-size: 14px;
            color: #fda4af;
            font-weight: bold;
            letter-spacing: 4px;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 30px 40px 0 40px;
            padding: 15px 0;
            background: #fff1f2;
            border-radius: 20px;
        }
        .stat-item { text-align: center; }
        .stat-label {
            font-size: 12px;
            color: #e11d48;
            font-weight: 600;
        }
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #4d1a2a;
        }
        .footer {
            position: absolute;
            bottom: 20px;
            left: 0;
            right: 0;
            text-align: center;
        }
        .date { font-size: 12px; color: #a1a1aa; }
        .quote {
            font-size: 12px;
            color: #d4d4d8;
            font-style: italic;
        }
    </style>
</head>
<body>
<div class="card">
    <div class="glow"></div>
    <div class="sidebar"></div>
    <div class="header">
        <div class="user-info">
            <img class="avatar" src="{{avatarUrl}}" alt="avatar">
            <div>
                <div class="nickname">{{nickname}}</div>
                <div class="qq">QQ: {{userId}}</div>
            </div>
        </div>
        <div style="text-align: right;">
            <div class="rank-number">#{{todayRank}}</div>
            <div class="rank-label">TODAY RANK</div>
        </div>
    </div>
    <div class="points">+{{earnedPoints}}</div>
    <div class="points-label">POINTS EARNED</div>
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

const DEFAULT_TEST_DATA = {
  nickname: '小甜心',
  userId: '1150880493',
  avatarUrl: 'http://q.qlogo.cn/headimg_dl?dst_uin=1150880493&spec=640&img_type=jpg',
  earnedPoints: 21,
  totalPoints: 44,
  totalDays: 1,
  todayRank: 1,
  checkinTime: '22:37:08',
  currentDate: '2026年2月10日',
  quote: '保持热爱，奔赴山海。新的一天也要加油呀！',
  consecutiveDays: 1,
}

export default function TemplatePage() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [testData, setTestData] = useState(JSON.stringify(DEFAULT_TEST_DATA, null, 2))
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [renderTime, setRenderTime] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [useCustomTemplate, setUseCustomTemplate] = useState(false)

  // 加载保存的配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await noAuthFetch<{ customHtmlTemplate?: string }>('/config')
        if (res.code === 0 && res.data?.customHtmlTemplate) {
          setTemplate(res.data.customHtmlTemplate)
          setUseCustomTemplate(true)
        }
      } catch {
        // 使用默认模板
      }
    }
    loadConfig()
  }, [])

  // 渲染预览
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
        body: JSON.stringify({ template, data }),
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

  // 保存模板
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await noAuthFetch('/config', {
        method: 'POST',
        body: JSON.stringify({
          customHtmlTemplate: useCustomTemplate ? template : undefined,
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

  // 重置为默认模板
  const handleReset = () => {
    if (confirm('确定要重置为默认模板吗？当前编辑的内容将丢失。')) {
      setTemplate(DEFAULT_TEMPLATE)
      showToast('已重置为默认模板', 'success')
    }
  }

  // 插入变量
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-editor') as HTMLTextAreaElement
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = template.substring(0, start) + variable + template.substring(end)
    setTemplate(newValue)
    
    // 恢复光标位置
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between mb-4 bg-white dark:bg-[#1a1b1d] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">签到卡片模板</h3>
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
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            重置默认
          </button>
          <button
            onClick={handlePreview}
            disabled={isRendering}
            className="px-4 py-2 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-lg text-sm font-medium hover:bg-brand-200 dark:hover:bg-brand-900/50 disabled:opacity-50 transition-colors"
          >
            {isRendering ? '渲染中...' : '预览'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !useCustomTemplate}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? '保存中...' : '保存模板'}
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* 左侧：编辑器 */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* HTML 编辑器 */}
          <div className="flex-1 bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">HTML 模板</span>
              <span className="text-xs text-gray-400">支持双括号变量语法</span>
            </div>
            <textarea
              id="template-editor"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              disabled={!useCustomTemplate}
              className="flex-1 w-full p-4 text-sm font-mono bg-gray-50 dark:bg-[#0f0f10] text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
              placeholder="在此输入 HTML 模板..."
              spellCheck={false}
            />
          </div>

          {/* 测试数据 */}
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

          {/* 变量说明 */}
          <div className="h-48 bg-white dark:bg-[#1a1b1d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">可用变量 (点击插入)</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-2 gap-1">
                {TEMPLATE_VARIABLES.map((variable) => (
                  <button
                    key={variable.name}
                    onClick={() => insertVariable(variable.name)}
                    disabled={!useCustomTemplate}
                    className="flex items-center gap-2 px-3 py-2 text-left text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group disabled:opacity-50"
                  >
                    <code className="text-brand-600 dark:text-brand-400 font-mono bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded">
                      {variable.name}
                    </code>
                    <span className="text-gray-500 dark:text-gray-400">{variable.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：预览 */}
        <div className="bg-gray-100 dark:bg-[#0f0f10] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#1a1b1d]">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">渲染预览</span>
            {renderTime !== null && (
              <span className="text-xs text-gray-400">耗时: {renderTime}ms</span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            {previewImage ? (
              <img
                src={previewImage}
                alt="预览"
                className="max-w-full max-h-full rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">🖼️</div>
                <p>点击"预览"按钮查看渲染效果</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
