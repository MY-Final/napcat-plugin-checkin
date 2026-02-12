import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { PluginConfig } from '../types'
import { IconTerminal } from '../components/icons'

export default function ConfigPage() {
    const [config, setConfig] = useState<PluginConfig | null>(null)
    const [saving, setSaving] = useState(false)

    const fetchConfig = useCallback(async () => {
        try {
            const res = await noAuthFetch<PluginConfig>('/config')
            if (res.code === 0 && res.data) setConfig(res.data)
        } catch { showToast('获取配置失败', 'error') }
    }, [])

    useEffect(() => { fetchConfig() }, [fetchConfig])

    const saveConfig = useCallback(async (update: Partial<PluginConfig>) => {
        if (!config) return
        setSaving(true)
        try {
            const newConfig = { ...config, ...update }
            await noAuthFetch('/config', {
                method: 'POST',
                body: JSON.stringify(newConfig),
            })
            setConfig(newConfig)
            showToast('配置已保存', 'success')
        } catch {
            showToast('保存失败', 'error')
        } finally {
            setSaving(false)
        }
    }, [config])

    const updateField = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) => {
        if (!config) return
        const updated = { ...config, [key]: value }
        setConfig(updated)
        saveConfig({ [key]: value })
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center h-64 empty-state">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner text-primary" />
                    <div className="text-gray-400 text-sm">加载配置中...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 stagger-children">
            {/* 插件信息头部 */}
            <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #FB7299 0%, #FF8FB0 100%)' }}>
                <h3 className="text-lg font-semibold text-white mb-1">✨ NapCat 签到插件</h3>
                <p className="text-sm text-white opacity-90">精美卡片式签到系统，支持连续签到加成和积分统计</p>
            </div>

            {/* 基础配置 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    📋 基础设置
                </h3>
                <div className="space-y-5">
                    <ToggleRow
                        label="启用插件"
                        desc="是否启用此插件的功能"
                        checked={config.enabled}
                        onChange={(v) => updateField('enabled', v)}
                    />
                    <ToggleRow
                        label="调试模式"
                        desc="启用后将输出详细的调试日志"
                        checked={config.debug}
                        onChange={(v) => updateField('debug', v)}
                    />
                    <InputRow
                        label="命令前缀"
                        desc="触发命令的前缀，默认为 #cmd"
                        value={config.commandPrefix}
                        onChange={(v) => updateField('commandPrefix', v)}
                    />
                    <InputRow
                        label="冷却时间 (秒)"
                        desc="同一命令请求冷却时间，0 表示不限制"
                        value={String(config.cooldownSeconds)}
                        type="number"
                        onChange={(v) => updateField('cooldownSeconds', Number(v) || 0)}
                    />
                </div>
            </div>

            {/* 签到功能设置 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    📅 签到功能设置
                </h3>
                <div className="space-y-5">
                    <ToggleRow
                        label="启用签到功能"
                        desc="是否启用签到功能"
                        checked={config.enableCheckin}
                        onChange={(v) => updateField('enableCheckin', v)}
                    />
                    <CommandListRow
                        label="签到命令列表"
                        desc="触发签到的命令关键词，可添加多个"
                        commands={config.checkinCommands || '签到'}
                        onChange={(commandsStr) => updateField('checkinCommands', commandsStr)}
                    />
                    <SelectRow
                        label="签到回复模式"
                        desc="选择签到成功后的回复方式"
                        value={config.checkinReplyMode || 'auto'}
                        options={[
                            { value: 'auto', label: '自动（有canvas用图片）' },
                            { value: 'text', label: '文字模式' },
                            { value: 'image', label: '图片模式' },
                        ]}
                        onChange={(v) => updateField('checkinReplyMode', v as 'text' | 'image' | 'auto')}
                    />
                </div>
            </div>

            {/* 签到时间设置 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    ⏰ 签到时间设置
                </h3>
                <div className="space-y-5">
                    <InputRow
                        label="每日刷新时间（小时）"
                        desc="每天几点开始算新的一天（0-23），默认0点"
                        value={String(config.checkinRefreshTime?.hour ?? 0)}
                        type="number"
                        onChange={(v) => {
                            const num = Math.max(0, Math.min(23, Number(v) || 0))
                            updateField('checkinRefreshTime', { ...config.checkinRefreshTime, hour: num })
                        }}
                    />
                    <InputRow
                        label="每日刷新时间（分钟）"
                        desc="每天几分开始算新的一天（0-59），默认0分"
                        value={String(config.checkinRefreshTime?.minute ?? 0)}
                        type="number"
                        onChange={(v) => {
                            const num = Math.max(0, Math.min(59, Number(v) || 0))
                            updateField('checkinRefreshTime', { ...config.checkinRefreshTime, minute: num })
                        }}
                    />
                    <SelectRow
                        label="签到周期类型"
                        desc="设置签到周期"
                        value={config.checkinRefreshTime?.cycleType || 'daily'}
                        options={[
                            { value: 'daily', label: '每日' },
                            { value: 'weekly', label: '每周' },
                            { value: 'monthly', label: '每月' },
                        ]}
                        onChange={(v) => updateField('checkinRefreshTime', { 
                            ...config.checkinRefreshTime, 
                            cycleType: v as 'daily' | 'weekly' | 'monthly' 
                        })}
                    />
                    <InputRow
                        label="周期内可签到次数"
                        desc="每个周期内可以签到的次数（1=每天1次，2=每天2次等）"
                        value={String(config.checkinRefreshTime?.cycleCount ?? 1)}
                        type="number"
                        onChange={(v) => {
                            const num = Math.max(1, Number(v) || 1)
                            updateField('checkinRefreshTime', { ...config.checkinRefreshTime, cycleCount: num })
                        }}
                    />
                </div>
            </div>

            {/* 积分设置 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    💎 积分设置
                </h3>
                <div className="space-y-5">
                    <InputRow
                        label="最小积分"
                        desc="每次签到最少获得的基础积分"
                        value={String(config.checkinPoints?.minPoints ?? 10)}
                        type="number"
                        onChange={(v) => updateField('checkinPoints', { ...config.checkinPoints, minPoints: Number(v) || 10 })}
                    />
                    <InputRow
                        label="最大积分"
                        desc="每次签到最多获得的基础积分"
                        value={String(config.checkinPoints?.maxPoints ?? 50)}
                        type="number"
                        onChange={(v) => updateField('checkinPoints', { ...config.checkinPoints, maxPoints: Number(v) || 50 })}
                    />
                </div>
            </div>

            {/* 连续签到加成 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    🔥 连续签到加成
                </h3>
                <div className="space-y-5">
                    <ToggleRow
                        label="启用连续签到加成"
                        desc="是否启用连续签到额外加成"
                        checked={config.checkinPoints?.enableConsecutiveBonus ?? true}
                        onChange={(v) => updateField('checkinPoints', { ...config.checkinPoints, enableConsecutiveBonus: v })}
                    />
                    <InputRow
                        label="每天加成点数"
                        desc="每连续签到一天额外获得的积分"
                        value={String(config.checkinPoints?.consecutiveBonusPerDay ?? 2)}
                        type="number"
                        onChange={(v) => updateField('checkinPoints', { ...config.checkinPoints, consecutiveBonusPerDay: Number(v) || 2 })}
                    />
                    <InputRow
                        label="最大加成上限"
                        desc="连续签到加成的上限值"
                        value={String(config.checkinPoints?.maxConsecutiveBonus ?? 20)}
                        type="number"
                        onChange={(v) => updateField('checkinPoints', { ...config.checkinPoints, maxConsecutiveBonus: Number(v) || 20 })}
                    />
                </div>
            </div>

            {/* 周末加成 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    🌟 周末加成
                </h3>
                <div className="space-y-5">
                    <ToggleRow
                        label="启用周末加成"
                        desc="是否在周末给予额外加成"
                        checked={config.checkinPoints?.enableWeekendBonus ?? false}
                        onChange={(v) => updateField('checkinPoints', { ...config.checkinPoints, enableWeekendBonus: v })}
                    />
                    <InputRow
                        label="周末加成点数"
                        desc="周末签到的额外加成积分"
                        value={String(config.checkinPoints?.weekendBonus ?? 5)}
                        type="number"
                        onChange={(v) => updateField('checkinPoints', { ...config.checkinPoints, weekendBonus: Number(v) || 5 })}
                    />
                </div>
            </div>

            {/* 排行榜设置 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    🏆 排行榜设置
                </h3>
                <div className="space-y-5">
                    <ToggleRow
                        label="启用排行榜功能"
                        desc="是否启用积分排行榜功能"
                        checked={config.enableLeaderboard ?? true}
                        onChange={(v) => updateField('enableLeaderboard', v)}
                    />
                    <InputRow
                        label="排行榜命令列表"
                        desc="触发排行榜的命令关键词，多个命令用英文逗号分隔"
                        value={config.leaderboardCommands || '排行榜,排行,rank'}
                        onChange={(v) => updateField('leaderboardCommands', v)}
                    />
                    <InputRow
                        label="排行榜显示数量"
                        desc="排行榜显示前几名（1-50）"
                        value={String(config.leaderboardTopCount ?? 10)}
                        type="number"
                        onChange={(v) => {
                            const num = Math.max(1, Math.min(50, Number(v) || 10))
                            updateField('leaderboardTopCount', num)
                        }}
                    />
                    <SelectRow
                        label="排行榜回复模式"
                        desc="选择排行榜的展示方式，auto模式下会优先尝试生成图片"
                        value={config.leaderboardReplyMode || 'auto'}
                        options={[
                            { value: 'auto', label: '自动（优先图片）' },
                            { value: 'text', label: '文字' },
                            { value: 'image', label: '图片' },
                        ]}
                        onChange={(v) => updateField('leaderboardReplyMode', v as 'text' | 'image' | 'auto')}
                    />
                </div>
            </div>

            {saving && (
                <div className="saving-indicator fixed bottom-4 right-4 bg-primary text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <div className="loading-spinner !w-3 !h-3 !border-[1.5px]" />
                    保存中...
                </div>
            )}
        </div>
    )
}

/* ---- 子组件 ---- */

function ToggleRow({ label, desc, checked, onChange }: {
    label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </div>
            <label className="toggle">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <div className="slider" />
            </label>
        </div>
    )
}

function InputRow({ label, desc, value, type = 'text', onChange }: {
    label: string; desc: string; value: string; type?: string; onChange: (v: string) => void
}) {
    const [local, setLocal] = useState(value)
    useEffect(() => { setLocal(value) }, [value])

    const handleBlur = () => {
        if (local !== value) onChange(local)
    }

    return (
        <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{label}</div>
            <div className="text-xs text-gray-400 mb-2">{desc}</div>
            <input
                className="input-field"
                type={type}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            />
        </div>
    )
}

function CommandListRow({ label, desc, commands, onChange }: {
    label: string; desc: string; commands: string; onChange: (commands: string) => void
}) {
    const [newCommand, setNewCommand] = useState('')
    
    // 解析命令列表
    const commandList = commands.split(',').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0)

    const handleAdd = () => {
        const trimmed = newCommand.trim()
        if (trimmed && !commandList.includes(trimmed)) {
            onChange(commands ? `${commands},${trimmed}` : trimmed)
            setNewCommand('')
        }
    }

    const handleRemove = (cmd: string) => {
        const newList = commandList.filter(c => c !== cmd)
        onChange(newList.join(','))
    }

    return (
        <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{label}</div>
            <div className="text-xs text-gray-400 mb-3">{desc}</div>
            
            {/* 命令列表 */}
            <div className="flex flex-wrap gap-2 mb-3">
                {commandList.map((cmd, index) => (
                    <div 
                        key={index} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full text-sm"
                    >
                        <span>{cmd}</span>
                        <button 
                            onClick={() => handleRemove(cmd)}
                            className="text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-200 font-bold"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
            
            {/* 添加新命令 */}
            <div className="flex gap-2">
                <input
                    className="input-field flex-1"
                    type="text"
                    placeholder="输入新命令..."
                    value={newCommand}
                    onChange={(e) => setNewCommand(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button
                    onClick={handleAdd}
                    disabled={!newCommand.trim()}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    添加
                </button>
            </div>
        </div>
    )
}

function SelectRow({ label, desc, value, options, onChange }: {
    label: string; desc: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void
}) {
    return (
        <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{label}</div>
            <div className="text-xs text-gray-400 mb-2">{desc}</div>
            <select
                className="input-field"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    )
}
