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
};

const translations: Record<'en' | 'zh', TranslationKeys> = {
  en: {
    globalStats: 'Global Statistics (since {time})',
    successRequests: 'Success requests',
    failedRequests: 'Failed requests',
    totalTokens: 'Total tokens consumed',
    avgResponseTime: 'Average response time',
    codingPlanLimit: 'CodingPlan limit',
    used: 'Used',
    remaining: 'Remaining',
    usage: 'Usage',
    warningLimit: '⚠️ Warning: CodingPlan limit reached or exceeded!',
    tokenNotice: '⚠️ Note: Token counts are for reference only',
    startupHint: 'ℹ️ Press Enter to view statistics, double-Enter within 2s to exit',
    startupTokenWarning: '⚠️ Note: Token counts are untested, for reference only',
  },
  zh: {
    globalStats: '全局统计 (自 {time} 起)',
    successRequests: '成功请求',
    failedRequests: '失败请求',
    totalTokens: '总 Token 消耗',
    avgResponseTime: '平均响应时间',
    codingPlanLimit: 'CodingPlan 限额',
    used: '已使用',
    remaining: '剩余',
    usage: '使用率',
    warningLimit: '⚠️ 警告：CodingPlan 限额已达到或超出！',
    tokenNotice: '⚠️ 提示：token数量未经测试，仅供参考',
    startupHint: 'ℹ️ 按回车查看统计，2秒内连按两次回车退出',
    startupTokenWarning: '⚠️ 提示：token数量未经测试，仅供参考',
  },
};

export const t: TranslationKeys = translations[getLocale()];
