export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function researchLightEmail({
  eyebrow = "Research Hub",
  title,
  intro,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: string;
  footer?: string;
}) {
  return `
    <div style="margin:0;padding:0;background:#242424;font-family:Inter,Arial,sans-serif;color:#e4e4e4;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:34px 16px;background:#242424;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#2c2c2c;border:1px solid #444444;border-radius:0;overflow:hidden;box-shadow:0 22px 70px rgba(0,0,0,0.35);">
              <tr>
                <td style="padding:30px 34px 24px;border-bottom:1px solid #444444;background:#2c2c2c;">
                  <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a8dadc;">${escapeEmailHtml(eyebrow)}</div>
                  <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:500;color:#e4e4e4;">${escapeEmailHtml(title)}</h1>
                  ${
                    intro
                      ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.75;color:#b0b0b0;">${escapeEmailHtml(intro)}</p>`
                      : ""
                  }
                </td>
              </tr>
              ${
                children
                  ? `<tr><td style="padding:28px 34px;background:#2c2c2c;">${children}</td></tr>`
                  : ""
              }
              <tr>
                <td style="padding:18px 34px;background:#242424;border-top:1px solid #444444;font-size:12px;line-height:1.7;color:#b0b0b0;">
                  ${escapeEmailHtml(
                    footer ??
                      "This message was sent by Tamph Research Hub. You can ignore it if it was not expected.",
                  )}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export function researchEmailButton(href: string, label: string) {
  return `<a href="${escapeEmailHtml(href)}" style="display:inline-block;background:transparent;color:#a8dadc;text-decoration:none;font-size:14px;font-weight:700;padding:13px 18px;border-radius:0;border:1px solid #a8dadc;">${escapeEmailHtml(label)}</a>`;
}

export function researchEmailLink(href: string) {
  return `<p style="margin:10px 0 0;font-size:12px;line-height:1.65;word-break:break-all;color:#a8dadc;">${escapeEmailHtml(href)}</p>`;
}

export function researchEmailParagraph(
  text: string,
  options?: { preLine?: boolean },
) {
  return `<p style="margin:0 0 18px;font-size:14px;line-height:1.75;color:#b0b0b0;${options?.preLine ? "white-space:pre-line;" : ""}">${escapeEmailHtml(text)}</p>`;
}

export function researchEmailInfoTable(
  rows: Array<{ label: string; value: string | null | undefined }>,
) {
  const visibleRows = rows.filter((row) => row.value && row.value.trim());
  if (visibleRows.length === 0) return "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border-collapse:collapse;border:1px solid #444444;background:#242424;">
      ${visibleRows
        .map(
          (row, index) => `
            <tr>
              <td style="width:34%;padding:11px 14px;border-top:${index === 0 ? "0" : "1px solid #444444"};font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#b0b0b0;">${escapeEmailHtml(row.label)}</td>
              <td style="padding:11px 14px;border-top:${index === 0 ? "0" : "1px solid #444444"};font-size:14px;line-height:1.65;color:#e4e4e4;">${escapeEmailHtml(row.value ?? "")}</td>
            </tr>
          `,
        )
        .join("")}
    </table>
  `;
}
