import type { ApiResponse } from '../response'

export async function safeCall<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    const data = await fn()
    return { code: 0, data }
  } catch (err: any) {
    const msg = err?.message ?? '操作失败'
    return { code: -1, message: String(msg) }
  }
}
