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
                    <InputRow
                        label="签到命令"
                        desc="触发签到的命令关键词"
                        value={config.checkinCommand}
                        onChange={(v) => updateField('checkinCommand', v)}
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
