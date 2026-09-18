"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type EditorSettings = {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  warmth: number;
  vignette: number;
};

type Preset = {
  label: string;
  prompt: string;
  values: EditorSettings;
};

const presets: Preset[] = [
  {
    label: "Studio Glow",
    prompt: "Professional portrait lighting with soft glow and crisp detail",
    values: { brightness: 109, contrast: 122, saturation: 112, hue: 2, blur: 0, warmth: 18, vignette: 6 },
  },
  {
    label: "Cinematic",
    prompt: "High contrast cinematic color grade with dramatic depth",
    values: { brightness: 104, contrast: 138, saturation: 120, hue: -4, blur: 0, warmth: 12, vignette: 12 },
  },
  {
    label: "Restore",
    prompt: "Clean restoration with natural tones and crisp detail",
    values: { brightness: 112, contrast: 118, saturation: 110, hue: 0, blur: 0, warmth: 0, vignette: 0 },
  },
  {
    label: "Dreamy",
    prompt: "Soft airy edit with pastel tones and subtle bloom",
    values: { brightness: 116, contrast: 110, saturation: 100, hue: 8, blur: 0.6, warmth: 16, vignette: 10 },
  },
  {
    label: "Focus Cutout",
    prompt: "Remove distractions and sharpen the main subject",
    values: { brightness: 108, contrast: 130, saturation: 105, hue: 2, blur: 0, warmth: 5, vignette: 2 },
  },
];

const defaultSettings: EditorSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  warmth: 0,
  vignette: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildFilter(settings: EditorSettings) {
  const brightness = settings.brightness;
  const contrast = settings.contrast;
  const saturate = settings.saturation;
  const hueRotate = `${settings.hue}deg`;
  const blur = `${settings.blur}px`;
  const sepia = `${(settings.warmth / 100) * 0.45}`;
  const brightnessValue = `${brightness}%`;
  const contrastValue = `${contrast}%`;
  const saturateValue = `${saturate}%`;

  return `brightness(${brightnessValue}) contrast(${contrastValue}) saturate(${saturateValue}) hue-rotate(${hueRotate}) blur(${blur}) sepia(${sepia})`;
}

function createPresetFromPrompt(prompt: string): Preset | undefined {
  const lower = prompt.toLowerCase();

  if (lower.includes("background") || lower.includes("cutout") || lower.includes("remove")) {
    return presets[4];
  }

  if (lower.includes("cinematic") || lower.includes("dramatic") || lower.includes("movie")) {
    return presets[1];
  }

  if (lower.includes("dream") || lower.includes("soft") || lower.includes("pastel")) {
    return presets[3];
  }

  if (lower.includes("restore") || lower.includes("clean") || lower.includes("fix")) {
    return presets[2];
  }

  if (lower.includes("portrait") || lower.includes("glow") || lower.includes("beauty")) {
    return presets[0];
  }

  return undefined;
}

export default function AIImageEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [settings, setSettings] = useState<EditorSettings>(defaultSettings);
  const [prompt, setPrompt] = useState("Enhance photo quality and improve lighting");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<EditorSettings[]>([defaultSettings]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);

  const activePreset = useMemo(() => createPresetFromPrompt(prompt) ?? presets[0], [prompt]);

  const pushHistory = (nextSettings: EditorSettings) => {
    setHistory((previous) => {
      const trimmed = previous.slice(0, historyIndex + 1);
      const hasSameValues = trimmed[trimmed.length - 1] && JSON.stringify(trimmed[trimmed.length - 1]) === JSON.stringify(nextSettings);

      if (hasSameValues) {
        return trimmed;
      }

      const updated = [...trimmed, nextSettings];
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  };

  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !sourceImage) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const image = imageRef.current;

    if (!context) {
      return;
    }

    const aspectRatio = image.naturalWidth / image.naturalHeight;
    const width = 1200;
    const height = width / aspectRatio;

    canvas.width = width;
    canvas.height = height;

    context.clearRect(0, 0, width, height);

    const baseImage = document.createElement("img");
    baseImage.src = sourceImage;

    const draw = () => {
      context.filter = buildFilter(settings);
      context.drawImage(baseImage, 0, 0, width, height);
      context.filter = "none";

      if (settings.vignette > 0) {
        const gradient = context.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.2,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.8,
        );

        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, `rgba(15, 23, 42, ${settings.vignette / 100})`);
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }
    };

    if (baseImage.complete) {
      draw();
    } else {
      baseImage.onload = draw;
    }
  }, [settings, sourceImage]);

  useEffect(() => {
    const img = new Image();
    if (sourceImage) {
      img.src = sourceImage;
      imageRef.current = img;
    }
  }, [sourceImage]);

  const updateSetting = (key: keyof EditorSettings, nextValue: number) => {
    const next = { ...settings, [key]: clamp(nextValue, 0, key === "blur" ? 8 : 200) } as EditorSettings;
    setSettings(next);
    pushHistory(next);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      setSourceImage(dataUrl);
      setShowBeforeAfter(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePromptApply = () => {
    const preset = createPresetFromPrompt(prompt) ?? activePreset;
    if (!preset) {
      return;
    }

    const next = { ...preset.values };
    setSettings(next);
    pushHistory(next);
  };

  const undo = () => {
    setHistoryIndex((previous) => {
      const target = Math.max(0, previous - 1);
      setSettings(history[target] ?? defaultSettings);
      return target;
    });
  };

  const redo = () => {
    setHistoryIndex((previous) => {
      const target = Math.min(history.length - 1, previous + 1);
      setSettings(history[target] ?? defaultSettings);
      return target;
    });
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    link.download = "aiedit-export.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const reset = () => {
    setSettings(defaultSettings);
    setPrompt("Enhance photo quality and improve lighting");
    pushHistory(defaultSettings);
  };

  return (
    <main className="editor-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="logo">AI</div>
          <div>
            <p className="eyebrow">Creative Studio</p>
            <h1>AIEdit</h1>
          </div>
        </div>

        <div className="panel">
          <label className="upload-button">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />
            Upload image
          </label>
        </div>

        <div className="panel">
          <label className="field-label">Prompt</label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            placeholder="Describe your edit"
          />
          <div className="prompt-actions">
            <button className="primary" onClick={handlePromptApply}>Generate edit</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span>AI presets</span>
          </div>
          <div className="preset-list">
            {presets.map((preset) => (
              <button
                key={preset.label}
                className={`preset ${activePreset.label === preset.label ? "selected" : ""}`}
                onClick={() => {
                  setPrompt(preset.prompt);
                  setSettings(preset.values);
                  pushHistory(preset.values);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span>Adjustments</span>
          </div>

          {[
            { key: "brightness", label: "Brightness", min: 0, max: 200, step: 1 },
            { key: "contrast", label: "Contrast", min: 0, max: 200, step: 1 },
            { key: "saturation", label: "Saturation", min: 0, max: 200, step: 1 },
            { key: "hue", label: "Hue", min: -180, max: 180, step: 1 },
            { key: "blur", label: "Blur", min: 0, max: 8, step: 0.1 },
            { key: "warmth", label: "Warmth", min: 0, max: 100, step: 1 },
            { key: "vignette", label: "Vignette", min: 0, max: 100, step: 1 },
          ].map((control) => (
            <div key={control.key} className="slider-group">
              <div className="slider-meta">
                <label>{control.label}</label>
                <span>{settings[control.key as keyof EditorSettings]}</span>
              </div>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={settings[control.key as keyof EditorSettings]}
                onChange={(event) =>
                  updateSetting(control.key as keyof EditorSettings, Number(event.target.value))
                }
              />
            </div>
          ))}
        </div>
      </aside>

      <section className="workspace-panel">
        <div className="toolbar">
          <div className="toolbar-group">
            <button onClick={undo} disabled={historyIndex === 0}>Undo</button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1}>Redo</button>
            <button onClick={reset}>Reset</button>
          </div>

          <div className="toolbar-group">
            <button className="secondary" onClick={() => setShowBeforeAfter((current) => !current)}>
              {showBeforeAfter ? "Hide before/after" : "Show before/after"}
            </button>
            <button className="primary" onClick={exportImage}>Export PNG</button>
          </div>
        </div>

        <div
          className="canvas-wrapper"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (!file) {
              return;
            }

            const reader = new FileReader();
            reader.onload = (loadEvent) => {
              const result = loadEvent.target?.result as string;
              setSourceImage(result);
            };
            reader.readAsDataURL(file);
          }}
        >
          {sourceImage ? (
            <>
              <canvas ref={canvasRef} className={showBeforeAfter ? "split" : ""} />
              {showBeforeAfter && <div className="before-after-overlay">Before</div>}
            </>
          ) : (
            <div className={`empty-state ${isDragging ? "dragging" : ""}`}>
              <div className="empty-icon">+</div>
              <h2>Drop image here</h2>
              <p>or choose a file to begin editing</p>
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        .editor-shell {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          min-height: 100vh;
          gap: 20px;
          padding: 20px;
        }

        .sidebar,
        .workspace-panel {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(20px);
        }

        .sidebar {
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .brand-block {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 8px;
        }

        .eyebrow {
          margin: 0;
          opacity: 0.7;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        h1 {
          margin: 4px 0 0;
          font-size: 2rem;
        }

        .logo {
          width: 54px;
          height: 54px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          font-weight: 700;
          font-size: 1.1rem;
        }

        .panel {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 18px;
          padding: 16px;
        }

        .upload-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 46px;
          padding: 12px 18px;
          border-radius: 12px;
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .upload-button:hover {
          transform: translateY(-1px);
        }

        .upload-button input {
          display: none;
        }

        textarea {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(15, 23, 42, 0.75);
          border-radius: 12px;
          padding: 12px 14px;
          color: white;
          resize: vertical;
          min-height: 90px;
          margin-top: 8px;
        }

        .prompt-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
        }

        button {
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          color: #e2e8f0;
          background: rgba(148, 163, 184, 0.12);
          transition: 0.2s ease;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: rgba(148, 163, 184, 0.18);
        }

        button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
        }

        .secondary {
          background: rgba(59, 130, 246, 0.12);
          color: #bfdbfe;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-weight: 700;
        }

        .preset-list {
          display: grid;
          gap: 10px;
        }

        .preset {
          text-align: left;
          padding: 12px 14px;
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .preset.selected {
          background: rgba(59, 130, 246, 0.16);
          border-color: rgba(96, 165, 250, 0.8);
        }

        .slider-group {
          margin-top: 14px;
        }

        .slider-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }

        input[type="range"] {
          width: 100%;
          accent-color: #8b5cf6;
        }

        .workspace-panel {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 8px 8px 0;
          flex-wrap: wrap;
        }

        .toolbar-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .canvas-wrapper {
          flex: 1;
          min-height: 640px;
          display: grid;
          place-items: center;
          background: rgba(15, 23, 42, 0.35);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 22px;
          overflow: hidden;
          position: relative;
        }

        canvas {
          width: min(100%, 1100px);
          max-height: 78vh;
          object-fit: contain;
          display: block;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(148, 163, 184, 0.12), rgba(15, 23, 42, 0.8));
        }

        .split {
          filter: none;
        }

        .before-after-overlay {
          position: absolute;
          left: 20px;
          top: 20px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.66);
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 0.8rem;
        }

        .empty-state {
          text-align: center;
          color: #cbd5e1;
          padding: 32px;
          border: 2px dashed rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          width: min(560px, 80%);
          background: rgba(15, 23, 42, 0.35);
        }

        .empty-state.dragging {
          border-color: rgba(96, 165, 250, 0.8);
          background: rgba(59, 130, 246, 0.08);
        }

        .empty-icon {
          width: 62px;
          height: 62px;
          border-radius: 50%;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          background: rgba(139, 92, 246, 0.2);
          font-size: 2rem;
          font-weight: 700;
        }

        h2 {
          margin: 0 0 6px;
        }

        p {
          margin: 0;
        }

        @media (max-width: 980px) {
          .editor-shell {
            grid-template-columns: 1fr;
          }

          .canvas-wrapper {
            min-height: 440px;
          }
        }
      `}</style>
    </main>
  );
}
