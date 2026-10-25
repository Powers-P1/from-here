# Local model services

The app and its model hosts are separate processes. `npm ci` installs application dependencies; it does not download model weights, configure GPU drivers or launch an inference server.

## Validated application configuration

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

Other local providers/models can be configured, but remain unverified until a fresh source/render/readback/export proof passes. Cloud credentials and authenticated cloud inference are not implemented by this local adapter.
