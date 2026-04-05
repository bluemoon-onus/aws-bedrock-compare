import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const MODELS = [
  { id: "us.anthropic.claude-haiku-4-5-20251001-v1:0", provider: "anthropic" },
  { id: "us.meta.llama3-1-8b-instruct-v1:0", provider: "llama" },
  { id: "us.amazon.nova-2-lite-v1:0", provider: "nova" },
  { id: "mistral.mistral-7b-instruct-v0:2", provider: "mistral" },
  { id: "us.deepseek.r1-v1:0", provider: "deepseek" },
];

function buildRequestBody(provider, prompt) {
  switch (provider) {
    case "anthropic":
      return {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      };
    case "nova":
      return {
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 1000 },
      };
    case "llama":
      return {
        prompt: `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
        max_gen_len: 1000,
      };
    case "mistral":
      return { prompt: `<s>[INST] ${prompt} [/INST]`, max_tokens: 1000 };
    case "deepseek":
      return {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      };
  }
}

function parseResponse(provider, result) {
  switch (provider) {
    case "anthropic":
      return result.content[0].text;
    case "nova":
      return result.output.message.content[0].text;
    case "llama":
      return result.generation;
    case "mistral":
      return result.outputs[0].text;
    case "deepseek":
      return result.choices[0].message.content;
  }
}

async function invokeModel(model, prompt) {
  const start = Date.now();
  const body = buildRequestBody(model.provider, prompt);

  const command = new InvokeModelCommand({
    modelId: model.id,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  });

  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  const text = parseResponse(model.provider, result);
  const time = Date.now() - start;

  return { modelId: model.id, text, time };
}

export async function POST(request) {
  const { prompt } = await request.json();

  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const settled = await Promise.allSettled(
    MODELS.map((model) => invokeModel(model, prompt))
  );

  const results = settled.map((outcome, i) => {
    if (outcome.status === "fulfilled") {
      return outcome.value;
    }
    return {
      modelId: MODELS[i].id,
      error: outcome.reason?.message || "Unknown error",
      time: null,
    };
  });

  return Response.json({ results });
}
