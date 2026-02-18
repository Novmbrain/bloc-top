/**
 * 线路表单校验
 */
export function validateRouteForm(data: { name: string; area: string }): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.name.trim()) errors.name = '请输入线路名称'
  if (!data.area.trim()) errors.area = '请选择区域'
  return errors
}
