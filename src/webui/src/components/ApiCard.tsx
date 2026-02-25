import { useState } from 'react';
import type { ApiEndpoint } from '../types/api';

interface ApiCardProps {
    endpoint: ApiEndpoint;
}

export function ApiCard({ endpoint }: ApiCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                const successful = document.execCommand('copy');
                textArea.remove();
                if (!successful) throw new Error('execCommand failed');
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className={`border rounded-xl overflow-hidden mb-4 ${endpoint.authRequired ? 'border-orange-200 dark:border-orange-800' : 'border-gray-200 dark:border-gray-800'}`}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between bg-white dark:bg-[#1a1b1d] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                        endpoint.method === 'GET'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                        {endpoint.method}
                    </span>
                    <span className="font-mono text-sm text-gray-600 dark:text-gray-400 truncate">{endpoint.path}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(endpoint.path);
                        }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                        title="复制接口路径"
                    >
                        {copied ? (
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{endpoint.title}</span>
                    {endpoint.authRequired && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium flex-shrink-0">
              需鉴权
            </span>
                    )}
                </div>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isExpanded && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-[#0f0f10] border-t border-gray-200 dark:border-gray-800">
                    {endpoint.authRequired && (
                        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="font-medium text-orange-700 dark:text-orange-400">此接口需要鉴权</span>
                            </div>
                            <p className="text-sm text-orange-600 dark:text-orange-300">
                调用此接口需要在请求头中携带认证信息：
                            </p>
                            <pre className="mt-2 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 p-2 rounded text-xs overflow-x-auto">
                                {`Authorization: Bearer <your-token>`}
                            </pre>
                        </div>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{endpoint.description}</p>

                    {endpoint.params && endpoint.params.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                Request Body / Query Params
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white dark:bg-[#1a1b1d]">
                                        <tr className="border-b border-gray-200 dark:border-gray-800">
                                            <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">参数名</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">类型</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">必填</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">说明</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#1a1b1d]">
                                        {endpoint.params.map((param) => (
                                            <tr key={param.name} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                                                <td className="px-4 py-2 font-mono text-brand-600 dark:text-brand-400">{param.name}</td>
                                                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{param.type}</td>
                                                <td className="px-4 py-2">
                                                    {param.required ? (
                                                        <span className="text-red-500 font-medium">YES</span>
                                                    ) : (
                                                        <span className="text-gray-400">NO</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{param.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {endpoint.example && (
                        <div className="mb-4">
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                请求示例
                            </h4>
                            <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                                <code>{endpoint.example}</code>
                            </pre>
                        </div>
                    )}

                    {endpoint.response && (
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                Response JSON
                            </h4>
                            <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                                <code>{endpoint.response}</code>
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
