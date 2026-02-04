// 环境变量配置 - 静态部署兼容
// 这个文件处理环境变量，使其在静态部署时能够正常工作

// 获取环境变量的安全方法
export function getEnvVariable(key: string, defaultValue?: string): string {
  // 在静态部署中，环境变量需要在构建时确定
  if (typeof window !== 'undefined') {
    // 客户端环境，从 window.__ENV__ 获取
    return (window as any).__ENV__?.[key] || defaultValue || '';
  }
  
  // 服务器端环境，直接从 process.env 获取
  return process.env?.[key] || defaultValue || '';
}

// 检查是否为静态部署
export function isStaticDeployment(): boolean {
  return getEnvVariable('NEXT_PUBLIC_STATIC_DEPLOYMENT', 'false') === 'true';
}

// 获取部署平台
export function getDeploymentPlatform(): string {
  return getEnvVariable('NEXT_PUBLIC_DEPLOYMENT_PLATFORM', 'unknown');
}

// 获取基础 URL
export function getBaseUrl(): string {
  return getEnvVariable('NEXT_PUBLIC_BASE_URL', '');
}

// AI 服务配置
export function getAIServiceConfig() {
  return {
    provider: getEnvVariable('NEXT_PUBLIC_AI_PROVIDER', ''),
    apiKey: getEnvVariable('NEXT_PUBLIC_AI_API_KEY', ''),
    model: getEnvVariable('NEXT_PUBLIC_AI_MODEL', ''),
    endpoint: getEnvVariable('NEXT_PUBLIC_AI_ENDPOINT', ''),
  };
}

// 导出环境变量类型
export interface EnvConfig {
  NEXT_PUBLIC_STATIC_DEPLOYMENT: string;
  NEXT_PUBLIC_DEPLOYMENT_PLATFORM: string;
  NEXT_PUBLIC_BASE_URL: string;
  NEXT_PUBLIC_AI_PROVIDER: string;
  NEXT_PUBLIC_AI_API_KEY: string;
  NEXT_PUBLIC_AI_MODEL: string;
  NEXT_PUBLIC_AI_ENDPOINT: string;
}

// 默认环境变量配置
export const defaultEnvConfig: EnvConfig = {
  NEXT_PUBLIC_STATIC_DEPLOYMENT: 'false',
  NEXT_PUBLIC_DEPLOYMENT_PLATFORM: 'unknown',
  NEXT_PUBLIC_BASE_URL: '',
  NEXT_PUBLIC_AI_PROVIDER: '',
  NEXT_PUBLIC_AI_API_KEY: '',
  NEXT_PUBLIC_AI_MODEL: '',
  NEXT_PUBLIC_AI_ENDPOINT: '',
};
