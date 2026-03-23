import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const SYSTEM_PROMPTS: Record<string, string> = {
  'fill-gaps': `You are a nutrition advisor. Given a day's current nutrient totals, goals, and available recipes, suggest specific meals to add that fill nutritional gaps. Be specific about which recipes to add and why. Keep suggestions concise and actionable. Format your response in markdown with headers and bullet points.`,

  'detect-problems': `You are a nutrition advisor. Given a day's meals with per-meal nutrient contributions and daily goals, identify which meals are causing nutrient overages and suggest specific swaps or portion adjustments. Consider trade-offs across multiple nutrients. Format your response in markdown.`,

  'adjust-recipe': `You are a culinary nutrition advisor. Given a recipe with its full ingredient list and per-ingredient nutrition breakdown, suggest specific ingredient substitutions or adjustments to make it healthier while maintaining flavor. Be practical — suggest real alternatives a home cook would use. Format your response in markdown.`,

  'meal-prep': `You are a meal prep planning advisor. Given a weekly meal plan with all recipes and their ingredients, analyze which meals are good candidates for batch cooking and freezing. Consider:
- Which recipes freeze well (soups, stews, grain bowls = great; salads, raw dishes = poor)
- Which components can be prepped in advance
- Shared ingredients across recipes (efficiency wins)
- Portion sizes appropriate for Souper Cubes (silicone freezer molds, typically 1-cup or 0.5-cup portions)
- Suggest a concrete prep day plan: what to make, how much, how to store

Format your response in markdown with clear sections.`,

  'scale-recipe': `You are a cooking advisor. Given a recipe and a target scale factor, adjust all ingredient quantities. Flag any ingredients that don't scale linearly (spices, leavening agents, salt). Provide the adjusted ingredient list and any cooking time/temperature notes. Format your response in markdown.`,
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.AI_API_KEY;
  const provider = process.env.AI_PROVIDER || 'openai';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI_API_KEY not configured. Add it to .env.local.' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { type, context } = body;

  if (!type || !context) {
    return NextResponse.json(
      { error: 'Missing required fields: type, context' },
      { status: 400 }
    );
  }

  const systemPrompt = SYSTEM_PROMPTS[type];
  if (!systemPrompt) {
    return NextResponse.json(
      { error: `Unknown analysis type: ${type}. Valid types: ${Object.keys(SYSTEM_PROMPTS).join(', ')}` },
      { status: 400 }
    );
  }

  try {
    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: JSON.stringify(context, null, 2) }] }],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      return NextResponse.json({ analysis: text });
    }

    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: systemPrompt,
          messages: [
            { role: 'user', content: JSON.stringify(context, null, 2) },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Anthropic API error: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || 'No response generated.';
      return NextResponse.json({ analysis: text });
    }

    // Default: OpenAI
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(context, null, 2) },
      ],
    });

    const text = completion.choices[0]?.message?.content || 'No response generated.';
    return NextResponse.json({ analysis: text });
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI analysis failed' },
      { status: 500 }
    );
  }
}
