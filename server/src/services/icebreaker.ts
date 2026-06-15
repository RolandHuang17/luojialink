import { env } from "../config/env.js";

export type IcebreakerContext = {
  myNickname: string;
  peerNickname: string;
  postTitle: string;
  postCategory: string;
  placeText: string;
  timeText: string;
  tagText: string;
  fromCommonFree: boolean;
};

export type IcebreakerResult = {
  icebreaker: string;
  icebreakers: string[];
  sourceType: string;
  sourceLabel: string;
  fallback: boolean;
};

function uniqueLines(lines: string[]) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
}

export function buildTemplateIcebreakers(context: IcebreakerContext) {
  const { peerNickname, postTitle, postCategory, placeText, timeText, tagText, fromCommonFree } = context;
  const timeHint = fromCommonFree ? `我看 ${timeText} 我们都有空` : `想聊一下 ${timeText} 的安排`;
  return uniqueLines([
    `嗨 ${peerNickname}，我也对「${postTitle}」感兴趣～${placeText} 方便吗？`,
    `${timeHint}，要不先从 ${placeText} 碰个头？`,
    `我们都跟「${tagText}」有关，你平时更喜欢怎么开始一次 ${postCategory} 搭子？`,
    `第一次搭伴有点紧张哈哈，你更想先轻松聊聊，还是直接把 ${postCategory} 的细节定下来？`,
    `看到你也在找 ${postCategory} 搭子，如果 ${placeText} OK，我可以先从简单问候开始～`,
  ]);
}

async function buildOpenAiIcebreakers(context: IcebreakerContext) {
  if (env.aiMode !== "openai" || !env.openaiApiKey) {
    return null;
  }

  const systemPrompt =
    "你是武汉大学校园社交产品 LuoJiaLink 的聊天破冰助手。请用轻松、自然、不过界的中文，生成 4 条可直接发送的开场白。不要提及真实姓名、学号、微信号、手机号。每条 40 字以内，不要编号。";
  const userPrompt = [
    `我的昵称：${context.myNickname}`,
    `对方昵称：${context.peerNickname}`,
    `想搭主题：${context.postTitle}`,
    `分类：${context.postCategory}`,
    `地点：${context.placeText}`,
    `时间：${context.timeText}`,
    `共同兴趣：${context.tagText}`,
  ].join("\n");

  try {
    const response = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: 0.9,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const lines = uniqueLines(
      content
        .split(/\n+/)
        .map((line) => line.replace(/^\d+[\.\)、]\s*/, "").replace(/^[-*]\s*/, ""))
        .filter((line) => line.length >= 8 && line.length <= 80),
    );
    return lines.length > 0 ? lines.slice(0, 4) : null;
  } catch {
    return null;
  }
}

export async function buildIcebreakers(context: IcebreakerContext): Promise<IcebreakerResult> {
  const templateLines = buildTemplateIcebreakers(context);
  const aiLines = await buildOpenAiIcebreakers(context);
  const icebreakers = aiLines && aiLines.length > 0 ? aiLines : templateLines;

  return {
    icebreaker: icebreakers[0],
    icebreakers,
    sourceType: aiLines && aiLines.length > 0 ? "openai" : "template",
    sourceLabel: aiLines && aiLines.length > 0 ? "AI 破冰" : "智能模板",
    fallback: !(aiLines && aiLines.length > 0),
  };
}

export function rotateIcebreaker(icebreakers: string[], current: string) {
  if (icebreakers.length <= 1) {
    return icebreakers[0] || current;
  }
  const index = icebreakers.findIndex((line) => line === current);
  const nextIndex = index >= 0 ? (index + 1) % icebreakers.length : 0;
  return icebreakers[nextIndex];
}
