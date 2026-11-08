#!/usr/bin/env python3
"""
Local Scientific LLM Server for Open Science Desktop.
Exposes an OpenAI-compatible API on http://127.0.0.1:8000/v1.

Loads:
- Base model: nDimensional/Qwen3.5-9B-Uncensored-Safetensors
- Fine-tuned scientific adapter: checkpoints/qwen35_9b_balanced_20step_adapter
  (from scientific_llm_pipeline)
"""

import argparse
import asyncio
import gc
import json
import os
import sys
import threading
import time
from typing import Any, Dict, List, Optional, Union

import torch
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from peft import PeftModel
from transformers import (
    AutoConfig,
    AutoModelForImageTextToText,
    AutoTokenizer,
    BitsAndBytesConfig,
    TextIteratorStreamer,
)

DEFAULT_BASE_MODEL = "nDimensional/Qwen3.5-9B-Uncensored-Safetensors"
DEFAULT_ADAPTER_DIR = (
    r"C:\Users\user\OneDrive\Desktop\antigravity\scientific_llm_pipeline\checkpoints\qwen35_9b_balanced_20step_adapter"
)
MODEL_ID = "qwen3.5-9b-scientific"

app = FastAPI(title="Local Scientific Qwen3.5 Server for Open Science Desktop")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
state: Dict[str, Any] = {
    "tokenizer": None,
    "model": None,
    "lock": threading.Lock(),
    "model_id": MODEL_ID,
}


class ChatMessage(BaseModel):
    role: str
    content: Union[str, List[Any]]


class ChatCompletionRequest(BaseModel):
    model: Optional[str] = MODEL_ID
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    max_tokens: Optional[int] = Field(default=2048, alias="max_completion_tokens")
    stream: Optional[bool] = False


def load_model(base_model_path: str, adapter_path: Optional[str]):
    print("=" * 80)
    print("LOADING LOCAL SCIENTIFIC LLM FOR OPEN SCIENCE DESKTOP")
    print(f"Base Checkpoint : {base_model_path}")
    print(f"LoRA Adapter    : {adapter_path}")
    print("=" * 80)

    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    print("1. Loading Tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(base_model_path, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print("2. Configuring 4-bit NF4 Quantization...")
    config = AutoConfig.from_pretrained(base_model_path, trust_remote_code=True)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    device_map = {
        "model.visual": 0,
        "model.language_model.embed_tokens": 0,
        "model.language_model.norm": 0,
        "model.language_model.rotary_emb": 0,
        "lm_head": 0,
    }
    num_layers = getattr(config.text_config, "num_hidden_layers", 32)
    for i in range(num_layers):
        device_map[f"model.language_model.layers.{i}"] = 0

    t0 = time.time()
    print("3. Loading Base Qwen3.5 Model onto GPU...")
    base_model = AutoModelForImageTextToText.from_pretrained(
        base_model_path,
        quantization_config=bnb_config,
        device_map=device_map,
        trust_remote_code=True,
        dtype=torch.bfloat16,
    )
    base_model.eval()
    print(f"   Base model loaded in {time.time() - t0:.2f}s.")

    if adapter_path and os.path.exists(adapter_path):
        t1 = time.time()
        print(f"4. Attaching Scientific Adapter ({adapter_path})...")
        model = PeftModel.from_pretrained(base_model, adapter_path)
        model.eval()
        print(f"   Scientific adapter attached in {time.time() - t1:.2f}s.")
    else:
        print("4. No adapter path provided or path not found; using base model directly.")
        model = base_model

    state["tokenizer"] = tokenizer
    state["model"] = model
    print("\nLocal Scientific LLM is ready to serve requests.")


@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": state["model_id"],
        "cuda_available": torch.cuda.is_available(),
    }


@app.get("/v1/models")
def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": state["model_id"],
                "object": "model",
                "created": 1700000000,
                "owned_by": "local-scientific",
            },
            {
                "id": "qwen3.5-9b-scientific",
                "object": "model",
                "created": 1700000000,
                "owned_by": "local-scientific",
            },
            {
                "id": "local-scientific/qwen3.5-9b-scientific",
                "object": "model",
                "created": 1700000000,
                "owned_by": "local-scientific",
            },
        ],
    }


def normalize_messages(messages: List[ChatMessage]) -> List[Dict[str, str]]:
    formatted = []
    for m in messages:
        content = m.content
        if isinstance(content, list):
            # Convert multi-part list to plain string for text processing
            text_parts = [
                part.get("text", "")
                if isinstance(part, dict)
                else str(part)
                for part in content
            ]
            content = " ".join(text_parts)
        formatted.append({"role": m.role, "content": str(content)})
    return formatted


@app.post("/v1/chat/completions")
async def chat_completions(req: ChatCompletionRequest):
    tokenizer = state["tokenizer"]
    model = state["model"]

    if tokenizer is None or model is None:
        raise HTTPException(status_code=503, detail="Model is still initializing.")

    formatted_messages = normalize_messages(req.messages)

    try:
        chat_prompt = tokenizer.apply_chat_template(
            formatted_messages, tokenize=False, add_generation_prompt=True
        )
    except Exception as e:
        # Fallback if chat template fails
        chat_prompt = "\n".join(
            f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>"
            for m in formatted_messages
        ) + "\n<|im_start|>assistant\n"

    inputs = tokenizer(chat_prompt, return_tensors="pt")
    input_ids = inputs["input_ids"].to(0)
    input_len = input_ids.shape[1]

    created_timestamp = int(time.time())
    completion_id = f"chatcmpl-{created_timestamp}"

    max_tokens = req.max_tokens or 2048
    temperature = req.temperature if req.temperature is not None else 0.7
    do_sample = temperature > 0.0

    if req.stream:
        # Streaming response using Server-Sent Events (SSE)
        streamer = TextIteratorStreamer(
            tokenizer, skip_prompt=True, skip_special_tokens=True
        )
        gen_kwargs = {
            "input_ids": input_ids,
            "streamer": streamer,
            "max_new_tokens": max_tokens,
            "do_sample": do_sample,
            "temperature": temperature if do_sample else None,
            "top_p": req.top_p if do_sample else None,
            "pad_token_id": tokenizer.pad_token_id,
        }

        # Run model.generate in a background thread
        thread = threading.Thread(target=model.generate, kwargs=gen_kwargs)
        thread.start()

        async def event_generator():
            # Send initial role chunk
            initial_chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created_timestamp,
                "model": state["model_id"],
                "choices": [
                    {
                        "index": 0,
                        "delta": {"role": "assistant", "content": ""},
                        "finish_reason": None,
                    }
                ],
            }
            yield f"data: {json.dumps(initial_chunk)}\n\n"

            loop = asyncio.get_event_loop()

            def get_next_token():
                try:
                    return next(streamer)
                except StopIteration:
                    return None

            while True:
                token = await loop.run_in_executor(None, get_next_token)
                if token is None:
                    break

                chunk = {
                    "id": completion_id,
                    "object": "chat.completion.chunk",
                    "created": created_timestamp,
                    "model": state["model_id"],
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"content": token},
                            "finish_reason": None,
                        }
                    ],
                }
                yield f"data: {json.dumps(chunk)}\n\n"

            stop_chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created_timestamp,
                "model": state["model_id"],
                "choices": [
                    {
                        "index": 0,
                        "delta": {},
                        "finish_reason": "stop",
                    }
                ],
            }
            yield f"data: {json.dumps(stop_chunk)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    else:
        # Non-streaming response
        with state["lock"]:
            with torch.no_grad():
                outputs = model.generate(
                    input_ids=input_ids,
                    max_new_tokens=max_tokens,
                    do_sample=do_sample,
                    temperature=temperature if do_sample else None,
                    top_p=req.top_p if do_sample else None,
                    pad_token_id=tokenizer.pad_token_id,
                )

        generated_ids = outputs[0][input_len:]
        completion_text = tokenizer.decode(generated_ids, skip_special_tokens=True)

        return {
            "id": completion_id,
            "object": "chat.completion",
            "created": created_timestamp,
            "model": state["model_id"],
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": completion_text,
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": input_len,
                "completion_tokens": len(generated_ids),
                "total_tokens": input_len + len(generated_ids),
            },
        }


def main():
    parser = argparse.ArgumentParser(
        description="Local Scientific Qwen3.5 LLM server for Open Science Desktop"
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host address")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument(
        "--base-model",
        default=DEFAULT_BASE_MODEL,
        help="HuggingFace repository or local path to base model",
    )
    parser.add_argument(
        "--adapter",
        default=DEFAULT_ADAPTER_DIR,
        help="Path to trained scientific LoRA adapter",
    )
    args = parser.parse_args()

    load_model(args.base_model, args.adapter)
    print(f"\nStarting API server on http://{args.host}:{args.port}/v1 ...")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
