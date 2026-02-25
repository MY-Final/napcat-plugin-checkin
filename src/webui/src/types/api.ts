export interface ApiParam {
    name: string
    type: string
    required: boolean
    description: string
}

export interface ApiEndpoint {
    id: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    path: string
    title: string
    description: string
    authRequired?: boolean
    params?: ApiParam[]
    response?: string
    example?: string
}

export interface TemplateVariable {
    name: string
    description: string
}

export interface Section {
    key: string
    id: string
    icon: React.ComponentType<{ size?: number; className?: string }>
}

export interface SectionMap {
    [key: string]: string[]
}
