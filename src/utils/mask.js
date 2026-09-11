/**
 * 隐私脱敏工具函数
 */

/**
 * 姓名脱敏：保留姓，其余用 * 替代
 * maskName('张三')   → '张*'
 * maskName('张三丰') → '张**'
 * maskName('')       → ''
 */
export function maskName(name) {
  if (!name) return ''
  const first = name.charAt(0)
  const rest = name.slice(1)
  return first + '*'.repeat(rest.length || 1)
}

/**
 * 手机号脱敏：保留前3位和后4位，中间用 **** 替代
 * maskPhone('13812345678') → '138****5678'
 * maskPhone('')            → ''
 */
export function maskPhone(phone) {
  if (!phone) return ''
  if (phone.length !== 11) {
    return phone.length <= 5
      ? phone.substring(0, 1) + '*'.repeat(phone.length - 1)
      : phone.substring(0, 3) + '****' + phone.substring(phone.length - 2)
  }
  return phone.substring(0, 3) + '****' + phone.substring(7)
}
