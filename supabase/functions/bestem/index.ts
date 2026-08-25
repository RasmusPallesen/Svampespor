/**
 * Edge Function: bestem — artsbestemmelse på feltbilleder.
 *
 * Holder ANTHROPIC_API_KEY serverside. Nøglen må ALDRIG ligge i frontend
 * (CLAUDE.md, regel 1). Frontenden sender skalerede base64-billeder hertil;
 * denne funktion kalder Anthropic og returnerer rå JSON.
 *
 * Grundregel indbygget i prompten: forslag, aldrig facit; aldrig et ord om
 * spiselighed; forvekslinger er obligatoriske, og dødelige hvidlamellede
 * forvekslinger skal med, når de overhovedet er tænkelige.
 *
 * Kør lokalt:  supabase functions serve bestem --env-file supabase/.env
 * Udrul:       supabase functions deploy bestem
 * Nøgle:       supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

import Anthropic from 'npm:@anthropic-ai/sdk@^0.68.0';

// Standardmodel kan overstyres med ANTHROPIC_MODEL (fx claude-sonnet-5 for lavere pris).
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ID_PROMPT = `Du er en erfaren dansk mykolog, der hjælper en svampesamler med at indkredse en art ud fra feltbilleder. Du arbejder efter Svampespors grundregel: du giver forslag og beviser, aldrig facit, og du udtaler dig ALDRIG om hvorvidt en svamp kan spises.

Regler du altid følger:
- Angiv 1-3 kandidater, rangeret. Vær ærligt usikker: er billederne dårlige eller arten svær, så hold confidence lav (under 45).
- Er billedet ikke af en svamp, eller er det ubrugeligt til bestemmelse, sæt quality til "utilstraekkelig" og returnér en tom candidates-liste.
- Angiv ALTID relevante danske forvekslingsarter. Har kandidaten hvide lameller, ring eller pose ved foden, SKAL grøn fluesvamp (Amanita phalloides) med som dødelig forveksling, hvis den overhovedet er tænkelig.
- Hver post i lookalikes skal være en art, samleren reelt kunne have fat i i stedet for fundet — ikke en kendt art nævnt til sammenligning. severity beskriver faren ved netop den art i name_da. En almindeligt spiselig eller ufarlig art (fx champignon, kantarel) må ALDRIG stå som sin egen lookalike-post med severity giftig eller uspiselig — nævn den i stedet i how_to_tell-teksten på den rigtige farlige forveksling.
- Under missing_evidence: nævn konkret hvad samleren skal undersøge for at komme videre — sporeaftryk, stokbasen gravet fri, snitflade, lugt, voksested.
- Skriv alt på dansk, i knap og konkret feltsprog.
- ripening_window er [tidligst, senest] antal dage efter en regnhændelse, hvor arten typisk bryder frem. rain_mm er den nedbørsmængde arten typisk kræver.

Svar KUN med rå JSON, ingen indledning og ingen markdown-backticks:
{"quality":"god|brugbar|utilstraekkelig","quality_note":"kort vurdering af billedmaterialet","candidates":[{"name_da":"","name_lat":"","confidence":0,"reasoning":"hvad i billedet peger på denne art","key_features":["kendetegn der er synlige"],"ripening_window":[5,9],"rain_mm":14}],"lookalikes":[{"name_da":"","name_lat":"","severity":"doedelig|giftig|uspiselig","how_to_tell":"det ene kendetegn der skiller dem"}],"missing_evidence":["..."]}`;

interface Body {
  images?: string[];
  habitat?: string;
  observations?: string;
  order?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return json({ error: 'Kun POST' }, 405);
  }

  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ error: 'ANTHROPIC_API_KEY mangler serverside' }, 500);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Ugyldig JSON' }, 400);
  }

  const images = (body.images ?? []).filter((s) => typeof s === 'string' && s.length > 0);
  if (!images.length) return json({ error: 'Ingen billeder' }, 400);

  const ctx =
    `Voksested: ${body.habitat ?? 'ukendt'}.` +
    (body.observations?.trim()
      ? ` Samlerens egne iagttagelser: ${body.observations.trim()}`
      : ' Samleren har ikke noteret lugt eller konsistens.') +
    ` Fundet er gjort i Danmark, sidst i august.` +
    (body.order?.length ? ` Billederne er i rækkefølgen: ${body.order.join(', ')}.` : '');

  const anthropic = new Anthropic({ apiKey: key });

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      // Rigeligt loft: Claude Opus 5 tænker som standard, og tænketokens
      // deler budget med selve JSON-svaret. 1200 var for lavt og gav
      // afkortet, ugyldig JSON — 'low' effort holder tænkningen kort,
      // så loftet reelt går til svaret.
      max_tokens: 4096,
      output_config: { effort: 'low' },
      messages: [{
        role: 'user',
        content: [
          ...images.map((data) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data },
          })),
          { type: 'text' as const, text: `${ID_PROMPT}\n\n${ctx}` },
        ],
      }],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .replace(/```json|```/g, '')
      .trim();

    const parsed = JSON.parse(text);
    return json(parsed, 200);
  } catch (err) {
    console.error('bestem-fejl:', err);
    return json({ error: 'Bestemmelsen kunne ikke gennemføres' }, 502);
  }
});

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
