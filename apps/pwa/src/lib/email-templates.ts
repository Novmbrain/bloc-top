/**
 * Magic Link 登录邮件 HTML 模板
 *
 * 使用纯内联样式确保各邮件客户端兼容。
 * 不引用外部资源（CSS/图片），避免被标记为垃圾邮件。
 */
export function magicLinkEmailTemplate(url: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px 20px;">
      <h2 style="color: #1a1a2e; font-size: 20px; margin-bottom: 8px;">寻岩记 BlocTop</h2>
      <p style="color: #555; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
        点击下方按钮登录你的账号：
      </p>
      <a href="${url}"
         style="display: inline-block; padding: 14px 28px;
                background-color: #667eea; color: #ffffff;
                text-decoration: none; border-radius: 10px;
                font-weight: 600; font-size: 15px;">
        登录寻岩记
      </a>
      <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 28px;">
        此链接 10 分钟内有效。如果不是你发起的请求，请忽略此邮件。
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #bbb; font-size: 12px;">
        寻岩记 — 野外抱石指南
      </p>
    </div>
  `
}
