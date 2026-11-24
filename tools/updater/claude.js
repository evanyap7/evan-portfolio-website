/**
 * Minimal Anthropic Messages client plus a dependency-free JSON Schema subset
 * validator. The reply is forced through a single tool call so the model
 * returns structured JSON, then validated here before anything trusts it.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const TOOL_NAME = 'submit_result';

export class DraftSchemaError extends Error {
  constructor(message, problems = []) {
    super(message);
    this.name = 'DraftSchemaError';
    this.problems = problems;
  }
}

/**
 * Supports: type (object|array|string|integer|number|boolean), properties, required,
 * additionalProperties:false, items, minItems, maxItems, minLength, maxLength.
 * @returns {string[]} problems, empty when valid
 */
export function validate(value, schema, path = '$') {
  const problems = [];
  const t = schema.type;
  const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  const ok =
    t === undefined ||
    (t === 'integer' ? Number.isInteger(value) : t === 'number' ? actual === 'number' : actual === t);
  if (!ok) return [`${path}: expected ${t}, got ${actual}`];
  if (t === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) problems.push(`${path}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) problems.push(`${path}: longer than ${schema.maxLength}`);
  } else if (t === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) problems.push(`${path}: fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) problems.push(`${path}: more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => problems.push(...validate(v, schema.items, `${path}[${i}]`)));
  } else if (t === 'object') {
    const props = schema.properties ?? {};
    for (const key of schema.required ?? []) if (!(key in value)) problems.push(`${path}.${key}: missing`);
    for (const [key, v] of Object.entries(value)) {
      if (key in props) problems.push(...validate(v, props[key], `${path}.${key}`));
      else if (schema.additionalProperties === false) problems.push(`${path}.${key}: not allowed`);
    }
  }
  return problems;
}

/**
 * @param {{ model: string, system: string, user: string, schema: object }} req
 * @returns {Promise<object>} the reply, validated against `schema`
 */
export async function callClaude({ model, system, user, schema }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set; export it before drafting a Mark');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 16000, // the art step returns an SVG of tens of KB; a low cap truncates the tool input
      // Some models reject a forced tool_choice, so ask for the tool in the prompt and let the
      // missing-tool_use check below fail closed if the model answers in prose instead.
      system: `${system}\n\nReply only by calling the ${TOOL_NAME} tool exactly once.`,
      messages: [{ role: 'user', content: user }],
      tools: [{ name: TOOL_NAME, description: 'Return the result.', input_schema: schema }],
      tool_choice: { type: 'auto' },
    }),
  });
  if (!res.ok) {
    // Status and API error text only: never echo headers, so the key cannot leak.
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  if (data.stop_reason === 'max_tokens') throw new DraftSchemaError('Model reply was cut off at the token limit', ['stop_reason max_tokens']);
  const block = (data.content ?? []).find((b) => b.type === 'tool_use');
  if (!block) throw new DraftSchemaError('Model reply had no structured result', ['no tool_use block']);
  const problems = validate(block.input, schema);
  if (problems.length) throw new DraftSchemaError(`Model reply failed schema: ${problems.join('; ')}`, problems);
  return block.input;
}
