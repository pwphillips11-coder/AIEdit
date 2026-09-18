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

const stats = [
  { label: "Avg. edit time", value: "12 sec" },
  { label: "Design presets", value: "24+" },
  { label: "Happy creators", value: "2.4K" },
];

const featureCards = [
  { title: "Prompt magic", description: "Describe your perfect look and let AI-inspired presets do the heavy lifting." },
  { title: "Precision edits", description: "Tune exposure, detail, warmth, and contrast with production-ready controls." },
  { title: "Fast exports", description: "Deliver polished visuals in PNG without leaving the browser." },
];

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

  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hueRotate}) blur(${blur}) sepia(${sepia})`;
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
      const last = trimmed[trimmed.length - 1];
      const hasSameValues = last ? JSON.stringify(last) === JSON.stringify(nextSettings) : false;

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
    setHistoryIndex(0);
    setHistory([defaultSettings]);
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">AI</div>
          <span className="brand-name">AIEdit</span>
        </div>

        <nav className="nav">
          <a href="#features">Features</a>
          <a href="#studio">Studio</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="nav-actions">
          <button className="ghost-button">Log in</button>
          <button className="primary-button">Start free</button>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">AI image editor</span>
            <h1>Turn raw photos into scroll-stopping visuals.</h1>
            <p>
              Create premium social content, campaign art, and product shots with one fast editor built for modern teams.
            </p>

            <div className="hero-actions">
              <button className="primary-button" onClick={() => fileInputRef.current?.click()}>
                Try the editor
              </button>
              <button className="ghost-button">View demo</button>
            </div>

            <div className="stats-row">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-box">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <div className="mock-window">
              <div className="window-header">
                <span className="dot purple" />
                <span className="dot blue" />
                <span className="dot green" />
              </div>

              <div className="preview-grid">
                <div className="preview-card large">
                  <div className="image-sample sample-1" />
                </div>
                <div className="preview-card small">
                  <div className="image-sample sample-2" />
                </div>
                <div className="preview-card small">
                  <div className="image-sample sample-3" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="feature-section">
          <div className="section-heading">
            <span className="eyebrow">Why creators choose AIEdit</span>
            <h2>Everything you need to polish and publish.</h2>
          </div>

          <div className="feature-grid">
            {featureCards.map((feature) => (
              <article key={feature.title} className="feature-card">
                <div className="feature-icon">✦</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="studio" className="studio-section">
          <div className="section-heading inline-heading">
            <div>
              <span className="eyebrow">Creative studio</span>
              <h2>Build the perfect edit in minutes.</h2>
            </div>
            <button className="ghost-button" onClick={() => fileInputRef.current?.click()}>
              Upload image
            </button>
          </div>

          <div className="editor-shell">
            <aside className="sidebar">
              <div className="brand-block">
                <div className="logo">AI</div>
                <div>
                  <p className="eyebrow small">Creative Studio</p>
                  <h3>AIEdit</h3>
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
                  <button className="primary-button" onClick={handlePromptApply}>Generate edit</button>
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
                      onChange={(event) => updateSetting(control.key as keyof EditorSettings, Number(event.target.value))}
                    />
                  </div>
                ))}
              </div>
            </aside>

            <section className="workspace-panel">
              <div className="toolbar">
                <div className="toolbar-group">
                  <button className="toolbar-button" onClick={undo} disabled={historyIndex === 0}>Undo</button>
                  <button className="toolbar-button" onClick={redo} disabled={historyIndex >= history.length - 1}>Redo</button>
                  <button className="toolbar-button" onClick={reset}>Reset</button>
                </div>

                <div className="toolbar-group">
                  <button className="toolbar-button tertiary" onClick={() => setShowBeforeAfter((current) => !current)}>
                    {showBeforeAfter ? "Hide split view" : "Before / after"}
                  </button>
                  <button className="primary-button" onClick={exportImage}>Export PNG</button>
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
                    setSourceImage(loadEvent.target?.result as string);
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
                    <div className="empty-icon">＋</div>
                    <h3>Drop image here</h3>
                    <p>or choose a file to begin editing</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>

        <section id="pricing" className="cta-section">
          <div className="cta-card">
            <div>
              <span className="eyebrow">Launch faster</span>
              <h2>Beautiful edits for every campaign.</h2>
            </div>
            <button className="primary-button">Get started</button>
          </div>
        </section>
      </main>

      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          width: 100%;
          color: #edf2ff;
        }

        .topbar {
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .brand-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          font-weight: 800;
          color: white;
          box-shadow: 0 12px 24px rgba(96, 165, 250, 0.35);
        }

        .brand-name {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .nav {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .nav a {
          text-decoration: none;
          color: rgba(226, 232, 240, 0.8);
          font-size: 0.96rem;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .landing-main {
          max-width: 1280px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }

        .hero-section {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 40px;
          padding: 30px 0 36px;
        }

        .hero-copy {
          max-width: 610px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(96, 165, 250, 0.4);
          background: rgba(59, 130, 246, 0.08);
          color: #bfe0ff;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 18px;
        }

        .eyebrow.small {
          font-size: 0.65rem;
          margin-bottom: 0;
        }

        h1 {
          font-size: clamp(2.8rem, 5vw, 5rem);
          line-height: 0.98;
          letter-spacing: -0.05em;
          margin: 0 0 18px;
        }

        h2 {
          margin: 0;
          font-size: clamp(2rem, 3vw, 3rem);
          line-height: 1.1;
          letter-spacing: -0.04em;
        }

        h3 {
          margin: 0;
          font-size: 1.2rem;
        }

        .hero-copy p {
          margin: 0;
          font-size: 1.08rem;
          line-height: 1.7;
          color: rgba(226, 232, 240, 0.8);
          max-width: 560px;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 28px;
        }

        .primary-button,
        .ghost-button,
        .toolbar-button,
        .preset,
        .upload-button,
        .sidebar button {
          font: inherit;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .primary-button {
          border: none;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          box-shadow: 0 16px 30px rgba(91, 98, 255, 0.38);
          border-radius: 12px;
          padding: 14px 20px;
          font-weight: 700;
          cursor: pointer;
        }

        .ghost-button,
        .toolbar-button,
        .preset,
        .sidebar button {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(15, 23, 42, 0.35);
          color: #edf2ff;
          border-radius: 12px;
          padding: 12px 16px;
          cursor: pointer;
        }

        .primary-button:hover,
        .ghost-button:hover,
        .toolbar-button:hover,
        .preset:hover,
        .upload-button:hover,
        .sidebar button:hover {
          transform: translateY(-1px);
        }

        .stats-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 30px;
        }

        .stat-box {
          min-width: 130px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 16px;
          padding: 16px 18px;
          background: rgba(15, 23, 42, 0.35);
        }

        .stat-box strong {
          font-size: 1.3rem;
        }

        .stat-box span {
          color: rgba(226, 232, 240, 0.7);
          font-size: 0.82rem;
        }

        .hero-visual {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .mock-window {
          width: min(100%, 520px);
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 28px;
          padding: 18px;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.55);
        }

        .window-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
        }

        .dot {
          width: 10px;
          height: 10px;
          display: block;
          border-radius: 50%;
        }

        .dot.purple { background: #a78bfa; }
        .dot.blue { background: #60a5fa; }
        .dot.green { background: #4ade80; }

        .preview-grid {
          display: grid;
          grid-template-columns: 1.4fr 0.8fr;
          grid-template-rows: 180px 140px;
          gap: 14px;
        }

        .preview-card {
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          background: rgba(15, 23, 42, 0.33);
        }

        .preview-card.large {
          grid-row: 1 / span 2;
        }

        .image-sample {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
        }

        .sample-1 {
          background:
            linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.2)),
            url("https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80") center/cover no-repeat;
        }

        .sample-2 {
          background:
            linear-gradient(180deg, rgba(34, 197, 94, 0.4), rgba(15, 23, 42, 0.2)),
            url("https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80") center/cover no-repeat;
        }

        .sample-3 {
          background:
            linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(59, 130, 246, 0.32)),
            url("https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80") center/cover no-repeat;
        }

        .feature-section,
        .studio-section,
        .cta-section {
          padding-top: 54px;
        }

        .section-heading {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 26px;
        }

        .inline-heading {
          flex-direction: row;
          justify-content: space-between;
          align-items: end;
          gap: 18px;
          flex-wrap: wrap;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .feature-card {
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 22px;
          padding: 24px;
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(168,85,247,0.25));
          margin-bottom: 18px;
          font-size: 1.1rem;
        }

        .feature-card p {
          color: rgba(226, 232, 240, 0.76);
          line-height: 1.7;
          margin: 10px 0 0;
        }

        .editor-shell {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 20px;
          padding: 18px 0 0;
        }

        .sidebar,
        .workspace-panel {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(18px);
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
        }

        .logo {
          width: 54px;
          height: 54px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          font-weight: 700;
          font-size: 1.05rem;
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

        .toolbar-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tertiary {
          background: rgba(59, 130, 246, 0.12);
          color: #bfdbfe;
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

        .canvas-wrapper canvas {
          width: min(100%, 1100px);
          max-height: 78vh;
          object-fit: contain;
          display: block;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(148, 163, 184, 0.12), rgba(15, 23, 42, 0.8));
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

        .cta-card {
          margin-top: 24px;
          padding: 28px 32px;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18));
          border: 1px solid rgba(148, 163, 184, 0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        @media (max-width: 980px) {
          .hero-section,
          .editor-shell,
          .feature-grid {
            grid-template-columns: 1fr;
          }

          .topbar,
          .nav,
          .nav-actions,
          .inline-heading,
          .cta-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .nav {
            display: none;
          }

          .canvas-wrapper {
            min-height: 440px;
          }
        }
      `}</style>
    </div>
  );
}

