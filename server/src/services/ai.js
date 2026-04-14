const Anthropic = require('@anthropic-ai/sdk');

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
}) : null;

/**
 * Analyzes incoming message to determine sentiment and extract key details if needed.
 * Returns { sentiment: "positive" | "negative" | "neutral" | "urgent" }
 */
async function analyzeMessage(body) {
  if (!anthropic) return { sentiment: 'neutral' };

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      temperature: 0,
      system: "You are an SMS analysis bot. Reply ONLY with valid JSON containing a 'sentiment' field (positive, negative, neutral, urgent).",
      messages: [{ role: 'user', content: `Analyze this SMS: "${body}"` }]
    });

    const parsed = JSON.parse(response.content[0].text);
    return {
      sentiment: parsed.sentiment || 'neutral'
    };
  } catch (error) {
    console.error('Anthropic API Error:', error);
    return { sentiment: 'neutral' };
  }
}

/**
 * Drafts a reply to an incoming message context.
 */
async function draftReply(inboundBody, pastContext = []) {
  if (!anthropic) return "AI is disabled. Missing API key.";

  try {
    const messages = pastContext.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.body
    }));

    messages.push({ role: 'user', content: inboundBody });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 250,
      system: "You are an assistant drafting a reply to a customer via SMS. Be concise, under 160 characters if possible. Be helpful and polite.",
      messages: messages
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Anthropic API Error:', error);
    return "Error generating draft.";
  }
}

module.exports = {
  analyzeMessage,
  draftReply
};
