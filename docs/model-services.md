# AI providers

## Anthropic / Claude Sonnet

The current `.env.example` selects `anthropic` with `claude-sonnet-5-5` for both vision and text. Copy it to `.env.local` and set `ANTHROPIC_API_KEY` only in that private file or the server's process environment. `.env.local` is ignored by Git. This uses API credit; a browser subscription by itself is not an API credential.

The server sends fresh `POST https://api.anthropic.com/v1/messages` requests, including actual PNG image blocks for transcription and structured JSON output schemas. Credentials go only to the official Anthropic endpoint. Anthropic schema conversion moves unsupported numeric/string bounds into descriptions; the unchanged original schema is still enforced locally with Ajv. A missing key, refused/truncated answer, invalid response or HTTP error interrupts the current step and preserves the notice. There is no automatic fallback to a different provider.

The rendered-sign readback receives neither the original notice nor expected answers or prior attempts. That isolation applies equally to cloud and local providers. Health responses and model receipts contain the provider and model, never the API key.

Model availability and the API key were verified through the authenticated Models API. See [release verification](release-verification.md) for the boundary of live workflow evidence. Relevant implementation references: [Messages API](https://platform.claude.com/docs/en/api/overview), [vision](https://platform.claude.com/docs/en/build-with-claude/vision), [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), and [Sonnet 5.5 migration](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide).

## Optional local model profile

The app and its model hosts are separate processes. `npm ci` installs application dependencies; it does not download model weights, configure GPU drivers or launch an inference server.

### Previously validated local configuration

To retain local inference, select this profile in `.env.local` instead of Anthropic:

```dotenv
AI_PROVIDER=ollama
AI_BASE_URL=http://127.0.0.1:11434
AI_MODEL=qwen3-vl:2b-instruct
AI_CPU_ONLY=1
AI_CPU_THREADS=6
AI_TEXT_PROVIDER=vllm
AI_TEXT_BASE_URL=http://127.0.0.1:8000/v1
AI_TEXT_MODEL=gemma-4-31b-it-qat-w4a16-ct
AI_TIMEOUT_MS=180000
PORT=4176
```

- Vision: Ollama `qwen3-vl:2b-instruct`, `http://127.0.0.1:11434`. The app requests CPU execution with six threads by default.
- Text: vLLM 0.19.1, served API alias `gemma-4-31b-it-qat-w4a16-ct`, `http://127.0.0.1:8000/v1`. This service was already provisioned and uses suitable GPU hardware. It is not a small CPU-only setup.

The upstream text checkpoint is [Google's Gemma 4 31B QAT w4a16 checkpoint](https://huggingface.co/google/gemma-4-31B-it-qat-w4a16-ct). Its weights are a separate large download; they are not included in this repository. Follow the model card and [vLLM installation/serving documentation](https://docs.vllm.ai/en/latest/cli/serve/) for the chosen Linux/GPU host. The existing service was verified, but a new model-host installation was not performed during this application build.

Upstream serving reference, on a separately prepared model host:

```sh
vllm serve google/gemma-4-31B-it-qat-w4a16-ct \
  --served-model-name gemma-4-31b-it-qat-w4a16-ct \
  --host 127.0.0.1 --port 8000
```

This is an upstream setup reference, not a claim that this exact fresh-host command was tested here. Model-runtime compatibility, context size and memory settings depend on that host. FROM HERE sends only text to Gemma; the tested service rejected images. Images always go to the separate Ollama reader.

For Ollama, install the service using its [official documentation](https://docs.ollama.com/) and obtain `qwen3-vl:2b-instruct` before using the app. Configure provider URLs/model aliases in `.env.local` as shown in `.env.example`. HTTP `/api/health` describes the selected configuration; actual inference is required to verify readiness.

## A smaller configuration was rejected

A fresh experiment used the existing 2B vision model for **all** roles on CPU. It completed its JSON responses, but the readback parser lost audience, action and conditional information. The same kernel stopped after its two allowed repairs, with only 2/5 groups matched; no PDF was produced. The run took 65.6 seconds. It is not advertised as a supported portable minimum. Passing the default configuration does not justify claiming that every smaller model is adequate.

Other local models can be configured, but remain unverified until a fresh source/render/readback/export proof passes.
