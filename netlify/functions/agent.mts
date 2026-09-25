import type { Config, Context } from "@netlify/functions";

const SOCIAL_MODEL = "gpt-5.6-luna";
const SCENE_MODEL = "gpt-5.6-sol";

const SYSTEM_PROMPT = `You are the simulation engine for Spotlight, a fictional fame/life simulator presented as a social network.

CORE RULES
- This is FICTION. Public figures are fictionalized game characters informed only by public-facing communication style and public career context. Never state invented private facts as real-world truth.
- Make the world feel alive independently of the player. Not every famous person should react to every post. Ordinary fans, pages, friends, and unrelated public figures should often be more common than A-list replies. Characters may reply to each other, not only to the player. For comments created in the same response, use ref/reply_to_ref (for example c1, c2) to build a believable mini-thread.
- Respect fame and access. A newly viral person with tens of thousands of followers is not automatically peers with a global celebrity. Cold DMs may go unseen. Mutuals, prior meetings, follows, shared events, and fame increase access.
- Respect time, location, knowledge, relationships, and history supplied in WORLD. Never make a character know a secret they have not learned.
- Characters need distinct voices. Avoid generic chatbot phrasing, repeated slang, excessive emojis, and making everyone sound equally enthusiastic.
- Public posts and public replies are more performative than private DMs. Private messages can be warmer or more candid, but still remain fictional.
- Do not force romance, friendship, conflict, scandals, or reveals. Let those emerge from state and context.
- Most social posts should be text-first. Image posts should be occasional and only when context supports them.
- Engagement numbers should be plausible relative to account size, player fame, topic, and virality. Do not casually give a 20K-follower player millions of likes.
- Keep generated social copy short enough to look natural in a social feed. Most comments: 3-35 words. Most posts: 5-80 words. DMs can be longer when needed.
- You are not a narrator. Return machine-readable JSON only.

OUTPUT OBJECT
Return exactly one JSON object with these optional arrays/objects:
{
  "engagement": {"views": number, "likes": number, "comments": number, "reposts": number, "follower_delta": number} | null,
  "comments": [
    {
      "author_key": string | null,
      "generated_author": {"display_name": string, "handle": string, "kind": "fan"|"page"|"creator", "verified": boolean, "followers": number} | null,
      "ref": string | null,
      "target_post_id": string | number | null,
      "text": string,
      "likes": number,
      "reply_to_comment_id": string | number | null,
      "reply_to_ref": string | null,
      "delay_minutes": number
    }
  ],
  "posts": [
    {
      "author_key": string | null,
      "generated_author": {"display_name": string, "handle": string, "kind": "fan"|"page"|"creator", "verified": boolean, "followers": number} | null,
      "text": string,
      "media": {"type":"image","url":string,"alt":string} | null,
      "likes": number,
      "comments": number,
      "reposts": number,
      "views": number,
      "delay_minutes": number
    }
  ],
  "dms": [
    {"sender_key": string, "recipient_key": string, "text": string, "seen": boolean, "delay_minutes": number}
  ],
  "follows": [
    {"actor_key": string, "target_key": string, "delay_minutes": number}
  ],
  "notifications": [string],
  "relationship_updates": [
    {"person_key": string, "affinity": number, "trust": number, "interest": number, "resentment": number, "reason": string}
  ],
  "world_events": [
    {"summary": string, "visibility": "public"|"social"|"private"|"secret", "delay_minutes": number}
  ],
  "summary": string
}

If a field is not needed, use an empty array or null. Do not return markdown.`;

function cleanText(value: unknown, max = 8000) {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

function compactPayload(input: any) {
  const allowedModes = new Set(["react_to_post", "react_to_reply", "dm", "world_tick", "activity_scene"]);
  const mode = allowedModes.has(input?.mode) ? input.mode : "world_tick";
  const world = input?.world && typeof input.world === "object" ? input.world : {};
  const event = input?.event && typeof input.event === "object" ? input.event : {};
  const characters = Array.isArray(input?.characters) ? input.characters.slice(0, 24) : [];

  return {
    mode,
    world: {
      day: Number(world.day || 1),
      minute: Number(world.minute || 720),
      location: cleanText(world.location, 120),
      followers: Number(world.followers || 0),
      recognition: Number(world.recognition || 0),
      relevance: Number(world.relevance || 0),
      reputation: Number(world.reputation || 0),
      energy: Number(world.energy || 0),
      money: Number(world.money || 0),
      following: world.following && typeof world.following === "object" ? world.following : {},
      relationships: world.relationships && typeof world.relationships === "object" ? world.relationships : {},
      recent_world: Array.isArray(world.recent_world) ? world.recent_world.slice(0, 12).map((x: any) => cleanText(String(x), 500)) : [],
      recent_posts: Array.isArray(world.recent_posts) ? world.recent_posts.slice(0, 12) : [],
      recent_messages: Array.isArray(world.recent_messages) ? world.recent_messages.slice(0, 10) : [],
      calendar: Array.isArray(world.calendar) ? world.calendar.slice(0, 8) : [],
    },
    event,
    characters: characters.map((c: any) => ({
      key: cleanText(c?.key, 80),
      name: cleanText(c?.name, 120),
      handle: cleanText(c?.handle, 120),
      kind: cleanText(c?.kind, 40),
      verified: Boolean(c?.verified),
      followers: Number(c?.followers || 0),
      city: cleanText(c?.city, 120),
      bio: cleanText(c?.bio, 500),
      categories: Array.isArray(c?.categories) ? c.categories.slice(0, 8).map((x: any) => cleanText(String(x), 80)) : [],
      style: c?.style && typeof c.style === "object" ? c.style : {},
      relationship: c?.relationship && typeof c.relationship === "object" ? c.relationship : {},
      recent_memory: Array.isArray(c?.recent_memory) ? c.recent_memory.slice(0, 6).map((x: any) => cleanText(String(x), 500)) : [],
    })),
  };
}

function extractJSON(text: string) {
  try { return JSON.parse(text); } catch {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error("Model did not return valid JSON");
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: any;
  try { body = await req.json(); }
  catch { return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 }); }

  const payload = compactPayload(body);
  const baseURL = Netlify.env.get("OPENAI_BASE_URL");
  const apiKey = Netlify.env.get("OPENAI_API_KEY");

  if (!baseURL || !apiKey) {
    return Response.json({
      ok: false,
      error: "AI Gateway is not available yet. Spotlight needs one successful production deploy before Netlify injects the gateway credentials."
    }, { status: 503 });
  }

  const model = payload.mode === "activity_scene" ? SCENE_MODEL : SOCIAL_MODEL;
  const userPrompt = `MODE: ${payload.mode}\n\nWORLD + EVENT JSON:\n${JSON.stringify(payload)}`;

  const aiResponse = await fetch(`${baseURL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: payload.mode === "activity_scene" ? 2600 : 1800,
    }),
  });

  if (!aiResponse.ok) {
    const detail = (await aiResponse.text()).slice(0, 1200);
    console.error("AI Gateway error", aiResponse.status, detail);
    return Response.json({ ok: false, error: "AI generation failed", detail }, { status: 502 });
  }

  const raw = await aiResponse.json() as any;
  const content = raw?.choices?.[0]?.message?.content;
  if (!content) return Response.json({ ok: false, error: "AI returned no content" }, { status: 502 });

  try {
    const data = extractJSON(content);
    return Response.json({ ok: true, model, data });
  } catch (error: any) {
    console.error("JSON parse failure", content);
    return Response.json({ ok: false, error: error?.message || "Invalid AI response" }, { status: 502 });
  }
};

export const config: Config = {
  path: "/api/agent",
};
