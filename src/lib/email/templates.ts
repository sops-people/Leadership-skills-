// Email templates. Plain functions, no I/O, so they're easy to test and preview.
import type { EmailTemplate } from "@/shared/formats";

export type RenderedEmail = { subject: string; text: string; html: string };

type TemplateDef = {
  /** Variables the caller must pass. */
  required: string[];
  render: (v: Record<string, string>, links: string[]) => { subject: string; lines: string[]; button: string };
};

const templates: Record<EmailTemplate, TemplateDef> = {
  "login-link": {
    required: ["name"],
    render: (v) => ({
      subject: "Your log-in link",
      lines: [`Hi ${v.name},`, "Use the button below to log in. The link works once and expires in 15 minutes."],
      button: "Log in",
    }),
  },
  "rater-invite": {
    required: ["userName"],
    render: (v) => ({
      subject: `${v.userName} would value your feedback`,
      lines: [
        ...(v.raterName ? [`Hi ${v.raterName},`] : []),
        `${v.userName} has asked you for honest feedback on their leadership skills.`,
        `It takes about 10 minutes. Your answers are anonymous: ${v.userName} only sees averages, and only once at least 3 people have rated a skill.`,
        ...(v.dueDate ? [`Please answer by ${v.dueDate}.`] : []),
      ],
      button: "Give feedback",
    }),
  },
  "rater-reminder": {
    required: ["userName"],
    render: (v) => ({
      subject: `Reminder: feedback for ${v.userName}`,
      lines: [
        ...(v.raterName ? [`Hi ${v.raterName},`] : []),
        `A quick reminder that ${v.userName} asked for your feedback.`,
        `Your answers stay anonymous: ${v.userName} only sees averages across at least 3 people.`,
        ...(v.dueDate ? [`Please answer by ${v.dueDate}.`] : []),
      ],
      button: "Give feedback",
    }),
  },
  "reassessment-reminder": {
    required: ["name"],
    render: (v) => ({
      subject: "Time to re-assess your leadership skills",
      lines: [
        `Hi ${v.name},`,
        "It's time for your next check-in. Rate yourself again and invite your raters, so you can see how your gaps have changed.",
      ],
      button: "Start re-assessment",
    }),
  },
};

export function missingVariables(template: EmailTemplate, variables: Record<string, string>): string[] {
  return templates[template].required.filter((key) => !variables[key]?.trim());
}

export function renderEmail(
  template: EmailTemplate,
  variables: Record<string, string>,
  links: string[],
): RenderedEmail {
  const missing = missingVariables(template, variables);
  if (missing.length) throw new Error(`Template "${template}" is missing: ${missing.join(", ")}`);
  if (!links[0]) throw new Error(`Template "${template}" needs a link`);

  const { subject, lines, button } = templates[template].render(variables, links);
  const text = [...lines, "", `${button}: ${links[0]}`].join("\n\n");
  const html = [
    `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1c1c1e;max-width:560px">`,
    ...lines.map((line) => `<p>${escapeHtml(line)}</p>`),
    `<p><a href="${escapeHtml(links[0])}" style="display:inline-block;background:#1f4e79;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${escapeHtml(button)}</a></p>`,
    `</div>`,
  ].join("");
  return { subject, text, html };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
