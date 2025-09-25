// app/api/generate-email/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { transcript, tone, length, includeActionItems, includeNextSteps } = await request.json();

    // Revised prompt requesting HTML formatted email body
    const systemPrompt = `Write an email for sending the highlights of a project discussion based on a transcript. The email must be factual, structured, and detailed. Return the email body as HTML formatted string, including:

- Introduction paragraph
- Discussion Highlights as unordered list (<ul><li>)
- Each bullet's title should be inside <strong> tags
- Next Steps and Action Items as an HTML table with columns: Action Item, Responsible, Due Date, Notes
- Closing paragraph
- Use semantic and clean HTML only

Follow this format exactly and produce clean HTML that can be directly inserted and copied from a webpage.

Settings:
- Email tone: ${tone}
- Email length: ${length}
- Include action items: ${includeActionItems}
- Include next steps: ${includeNextSteps}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Please analyze this meeting transcript and generate a professional follow-up email following the exact format specified:\n\n${transcript}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            schema: {
              type: 'object',
              properties: {
                subject: { type: 'string' },
                // Body is HTML string with formatting preserved
                body: { type: 'string' },
                estimated_tokens: { type: 'number' },
              },
              required: ['subject', 'body'],
            },
          },
        },
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const completion = await response.json();
    const emailData = JSON.parse(completion.choices[0].message.content);

    const usage = completion.usage;
    const cost = (usage.prompt_tokens * 3 + usage.completion_tokens * 15) / 1_000_000 + 0.005;

    return NextResponse.json({
      email: emailData,
      usage: {
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        estimated_cost: cost.toFixed(4),
      },
      success: true,
    });
  } catch (error: unknown) {
    let errorMessage = 'Failed to generate email. Please try again.';
    if (error instanceof Error) {
      console.error('Email generation failed:', error.message);
      errorMessage = error.message;
    } else {
      console.error('Email generation failed:', error);
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
