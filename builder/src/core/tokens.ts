// token 的粗略估算：中日韩字符约一字一个 token，其余约四个字符一个 token。
// 只用于提示体量，不是精确计数。

const CJK = /[　-〿㐀-䶿一-鿿豈-﫿＀-￯]/g;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjk = text.match(CJK)?.length ?? 0;
  return Math.ceil(cjk + (text.length - cjk) / 4);
}

export function countLines(text: string): number {
  if (!text) return 0;
  return text.replace(/\n$/, '').split('\n').length;
}
