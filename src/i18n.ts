export function getLocale(): 'en' | 'zh' {
  const lang = process.env.LANG || process.env.LC_ALL || '';
  if (lang.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

type TranslationKeys = {
  globalStats: string;
  successRequests: string;
  failedRequests: string;
  rateLimitedRequests: string;
  totalTokens: string;
  avgResponseTime: string;
  codingPlanLimit: string;
  used: string;
  remaining: string;
  usage: string;
  warningLimit: string;
  tokenNotice: string;
  startupHint: string;
  startupTokenWarning: string;
  selectPlanType: string;
  planTypeRequests: string;
  planTypeTokens: string;
  enterTotalLimit: string;
  enterStartingCount: string;
  planConfigComplete: string;
  planType: string;
  totalLimit: string;
  startingCount: string;
  currentUsage: string;
  percentageExceedsLimit: string;
  startingCountExceedsLimit: string;
  countSyncNotice: string;
};

const translations: Record<'en' | 'zh', TranslationKeys> = {
  en: {
    globalStats: 'Global Statistics (since {time})',
    successRequests: 'Success requests',
    failedRequests: 'Failed requests',
    rateLimitedRequests: 'Rate limited',
    totalTokens: 'Total tokens consumed',
    avgResponseTime: 'Average response time',
    codingPlanLimit: 'CodingPlan limit',
    used: 'Used',
    remaining: 'Remaining',
    usage: 'Usage',
    warningLimit: '⚠️ Warning: CodingPlan limit reached or exceeded!',
    tokenNotice: '⚠️ Note: Token counting only works for non-streaming requests',
    startupHint: 'ℹ️ Press Enter to view statistics, double-Enter within 2s to exit',
    startupTokenWarning: '⚠️ Note: Token counting only works for non-streaming requests',
    selectPlanType: 'Select plan type:',
    planTypeRequests: 'Requests counting',
    planTypeTokens: 'Tokens counting',
    enterTotalLimit: 'Enter total limit:',
    enterStartingCount: 'Enter starting count (number or %):',
    planConfigComplete: 'Plan configuration complete',
    planType: 'Plan type',
    totalLimit: 'Total limit',
    startingCount: 'Starting count',
    currentUsage: 'Current usage',
    percentageExceedsLimit: 'Starting percentage cannot exceed 100%',
    startingCountExceedsLimit: 'Starting count cannot exceed total limit',
    countSyncNotice: 'Note: Local counts may differ from cloud provider console. Streaming delays cause lag, console updates may not be real-time.',
  },
  zh: {
    globalStats: '全局统计 (自 {time} 起)',
    successRequests: '成功请求',
    failedRequests: '失败请求',
    rateLimitedRequests: '限流请求',
    totalTokens: '总 Token 消耗',
    avgResponseTime: '平均响应时间',
    codingPlanLimit: 'CodingPlan 限额',
    used: '已使用',
    remaining: '剩余',
    usage: '使用率',
    warningLimit: '⚠️ 警告：CodingPlan 限额已达到或超出！',
    tokenNotice: '⚠️ 提示：Token 统计仅适用于非流式请求',
    startupHint: 'ℹ️ 按回车查看统计，2秒内连按两次回车退出',
    startupTokenWarning: '⚠️ 提示：Token 统计仅适用于非流式请求',
    selectPlanType: '选择限额类型：',
    planTypeRequests: '次数记账',
    planTypeTokens: 'Token 记账',
    enterTotalLimit: '输入总限额：',
    enterStartingCount: '输入起始计数（数字或百分比）：',
    planConfigComplete: '限额配置完成',
    planType: '限额类型',
    totalLimit: '总限额',
    startingCount: '起始计数',
    currentUsage: '当前使用',
    percentageExceedsLimit: '起始百分比不能超过 100%',
    startingCountExceedsLimit: '起始计数不能超过总限额',
    countSyncNotice: '提示：本地计数可能与云服务商控制台不同步。流式响应导致延迟，控制台可能非实时更新。',
  },
};

export const t: TranslationKeys = translations[getLocale()];
