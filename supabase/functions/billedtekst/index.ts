/**
 * Edge Function: billedtekst — foreslår en billedtekst til et delt fund.
 *
 * Nøglen bor serverside (CLAUDE.md, regel 1). Vinklen er altid vejret som
 * forklaring på fundet. Teksten udtaler sig ALDRIG om spiselighed.
 *
 * Udrul:  supabase functions deploy billedtekst
 */

import Anthropic from 'npm:@anthropic-ai/sdk@^0.68.0';

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TONE: Record<string, string> = {
  instagram: '2-4 linjer, sanseligt og nærværende, ét linjeskift mellem hver. Slut med 5-8 danske hashtags på egen linje.',
  facebook: 'En lille fortælling på 3-5 linjer til folk der kender dig. Ingen hashtags. Gerne et spørgsmål til sidst.',
  tiktok: 'Én kort, fængende linje der virker som hook på under 2 sekunder, plus 4-6 hashtags. Maks 150 tegn i alt.',
  snapchat: 'Maks 90 tegn. Rå, hurtig, som en besked til en ven. Ingen hashtags.',
};

interface Snapshot { rain14: number; daysSince: number; rh: number; tmax: number; }
interface Body {
  species?: string; quantity?: string; habitat?: string; spot?: string;
  note?: string; snapshot?: Snapshot; platform?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Kun POST' }, 405);

  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ error: 'ANTHROPIC_API_KEY mangler serverside' }, 500);

  let b: Body;
  try { b = await req.json(); } catch { return json({ error: 'Ugyldig JSON' }, 400); }

  const s = b.snapshot ?? { rain14: 0, daysSince: 0, rh: 0, tmax: 0 };
  const tone = TONE[b.platform ?? 'instagram'] ?? TONE.instagram;

  const prompt = `Skriv en billedtekst på dansk til et opslag om et svampefund. Svar KUN med selve teksten, ingen forklaring, ingen anførselstegn.

Fundet: ${b.species}, ${b.quantity} stk, ${b.habitat}, ${b.spot}.
Vejret: det regnede ${s.rain14} mm over fjorten dage, fundet kom ${s.daysSince} dage efter regnen, luftfugtighed ${s.rh}%, ${s.tmax}°.
${b.note ? 'Samlerens egen note: ' + b.note : ''}

Platform: ${b.platform}. ${tone}
Vinklen skal være vejret som forklaring på fundet — det er det, der gør historien værd at dele. Skriv jordnært og konkret, ingen svulstige naturklichéer, ingen udråbstegn. Udtal dig aldrig om, at svampen kan spises.`;

  try {
    const anthropic = new Anthropic({ apiKey: key });
    const msg = await anthropic.messages.create({
      model: MODEL,
      // Samme grund som i bestem/index.ts: tænketokens deler budget med
      // svaret på Claude Opus 5, så loftet skal have luft ud over 500.
      max_tokens: 1500,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content
      .filter((x): x is Anthropic.TextBlock => x.type === 'text')
      .map((x) => x.text)
      .join('')
      .trim();
    return json({ text }, 200);
  } catch (err) {
    console.error('billedtekst-fejl:', err);
    return json({ error: 'Kunne ikke skrive tekst' }, 502);
  }
});

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
