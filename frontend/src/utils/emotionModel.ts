// ─── emotionModel.ts ──────────────────────────────────────────────────────────
// In-browser ONNX emotion inference. Replaces the hardcoded `predictEmotion`
// stub in RecordedCourse.tsx. The session is loaded once (lazily) and reused.
//
// Setup:
//   1. npm i onnxruntime-web          (run inside frontend/)
//   2. Put your model at frontend/public/emotion_model.onnx
//   3. VERIFY the three constants below against YOUR model (see comments)
//   4. In RecordedCourse.tsx:  import { predictEmotion } from '../utils/emotionModel';
//      then pass `predictEmotion` to useEmotionDetection (drop the inline stub).

import * as ort from 'onnxruntime-web';
import type { RawEmotion } from './emotionMapping';

// Serve the WASM runtime from a CDN so Vite doesn't have to bundle the .wasm
// binaries (the usual cause of "model loads but inference 404s" under Vite).
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

// ── VERIFY THESE THREE AGAINST YOUR MODEL ─────────────────────────────────────
// Open emotion_model.onnx in https://netron.app to read off the real values.

// (1) Output class order. THIS MUST MATCH the order your model's logits are in.
//     Wrong order = "it predicts, but always the wrong emotion." #1 gotcha.
//     Classic FER2013 (7 classes) is:
//       ['angry','disgust','fear','happy','sad','surprise','neutral']
//     Your RawEmotion set has 6 (no "surprise") — adjust to your training labels:
const LABELS: RawEmotion[] = ['angry', 'disgust', 'fear', 'happy', 'sad', 'neutral'];

// (2) Input spatial size — your model is 224×224.
const INPUT_SIZE = 224;

// (3) Normalization. Your model is RGB (3-channel, NCHW) → almost certainly a
//     PyTorch backbone trained with ImageNet stats. CONFIRM against your training
//     preprocessing — wrong normalization can collapse predictions to one class.
//       • ImageNet (default below):  (x/255 - mean) / std
//       • Plain 0..1:                MEAN = [0,0,0], STD = [1,1,1]
//       • -1..1 (some MobileNet/TF): MEAN = [0.5,0.5,0.5], STD = [0.5,0.5,0.5]
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
// ──────────────────────────────────────────────────────────────────────────────

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create('/emotion_model.onnx', {
      executionProviders: ['wasm'],
    }).then((s) => {
      // One-time sanity log. Confirm the feed/output names + count match your
      // assumptions (LABELS.length should equal the output class count).
      console.log('[emotion] model loaded. inputs:', s.inputNames, 'outputs:', s.outputNames);
      return s;
    });
  }
  return sessionPromise;
}

// Reused offscreen canvas for frame capture.
const canvas = document.createElement('canvas');
canvas.width = INPUT_SIZE;
canvas.height = INPUT_SIZE;
const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

function preprocess(video: HTMLVideoElement): ort.Tensor {
  // NOTE: this feeds the whole frame resized to 224×224. Face models usually want
  // a cropped face — add a detector (face-api.js / MediaPipe) before this step if
  // accuracy is poor. (Accuracy issue, not a "neutral" issue.)
  ctx.drawImage(video, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE); // RGBA bytes

  const n = INPUT_SIZE * INPUT_SIZE;
  const floats = new Float32Array(3 * n); // NCHW: R plane, then G plane, then B plane

  for (let i = 0; i < n; i++) {
    floats[i]         = (data[i * 4]     / 255 - MEAN[0]) / STD[0]; // R
    floats[n + i]     = (data[i * 4 + 1] / 255 - MEAN[1]) / STD[1]; // G
    floats[2 * n + i] = (data[i * 4 + 2] / 255 - MEAN[2]) / STD[2]; // B
  }

  // Shape [batch=1, channels=3, height, width]
  return new ort.Tensor('float32', floats, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

function argmax(arr: Float32Array): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
  return best;
}

export async function predictEmotion(video: HTMLVideoElement): Promise<RawEmotion> {
  // Frame not ready yet (camera still warming up) — skip this tick.
  if (video.readyState < 2 || video.videoWidth === 0) return 'neutral';

  const session = await getSession();
  const input = preprocess(video);

  // Use the model's actual input/output names rather than hardcoding 'input'.
  const feeds: Record<string, ort.Tensor> = { [session.inputNames[0]]: input };
  const results = await session.run(feeds);
  const logits = results[session.outputNames[0]].data as Float32Array;

  return LABELS[argmax(logits)] ?? 'neutral';
}