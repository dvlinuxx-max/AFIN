"use client";

import { useEffect, useRef, useState } from "react";
import type { Choice, Field } from "@/lib/form-schema";
import type { Locale } from "@/lib/i18n";
import { bi } from "@/lib/i18n";

interface Props {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  locale: Locale;
  error?: string;
  disabled?: boolean;
  // Choices after a cascading filter has been applied (falls back to field.choices).
  choices?: Choice[];
}

export function FieldInput({ field, value, onChange, locale, error, disabled, choices }: Props) {
  const label = bi(field.label, locale);
  const hint = field.hint ? bi(field.hint, locale) : "";
  const guidance = field.guidance ? bi(field.guidance, locale) : "";

  if (field.type === "note") {
    return (
      <div className="rounded-lg bg-brand-50 border border-brand-100 p-3 text-sm">
        <div className="font-semibold">{label}</div>
        {hint && <div style={{ color: "var(--color-muted)" }}>{hint}</div>}
      </div>
    );
  }

  return (
    <div>
      <label className="label">
        {label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      {hint && (
        <p className="text-xs mb-1.5" style={{ color: "var(--color-muted)" }}>
          {hint}
        </p>
      )}
      <Control field={field} value={value} onChange={onChange} locale={locale} disabled={disabled} choices={choices} />
      {guidance && (
        <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
          {guidance}
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function Control({ field, value, onChange, locale, disabled, choices }: Omit<Props, "error">) {
  const common = { disabled, className: "input" };
  const opts = choices ?? field.choices ?? [];

  switch (field.type) {
    case "paragraph":
      return (
        <textarea
          {...common}
          rows={3}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
    case "decimal":
      return (
        <input
          {...common}
          type="number"
          step={field.type === "decimal" ? "any" : "1"}
          min={field.min}
          max={field.max}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          dir="ltr"
        />
      );
    case "range":
      return <RangeInput field={field} value={value} onChange={onChange} disabled={disabled} />;
    case "email":
      return <input {...common} type="email" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} dir="ltr" />;
    case "phone":
      return <input {...common} type="tel" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} dir="ltr" />;
    case "date":
      return <input {...common} type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} dir="ltr" />;
    case "time":
      return <input {...common} type="time" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} dir="ltr" />;
    case "datetime":
      return (
        <input {...common} type="datetime-local" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} dir="ltr" />
      );
    case "select_one":
      if (field.appearance === "minimal") {
        return (
          <select {...common} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {opts.map((c) => (
              <option key={c.value} value={c.value}>
                {bi(c.label, locale)}
              </option>
            ))}
          </select>
        );
      }
      return (
        <div className="space-y-1.5">
          {opts.map((c) => (
            <label key={c.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                checked={value === c.value}
                onChange={() => onChange(c.value)}
                disabled={disabled}
                className="w-4 h-4 accent-[var(--color-brand-600)]"
              />
              <span>{bi(c.label, locale)}</span>
            </label>
          ))}
        </div>
      );
    case "select_multiple": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {opts.map((c) => (
            <label key={c.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={arr.includes(c.value)}
                onChange={(e) => {
                  const next = e.target.checked ? [...arr, c.value] : arr.filter((x) => x !== c.value);
                  onChange(next);
                }}
                disabled={disabled}
                className="w-4 h-4 accent-[var(--color-brand-600)]"
              />
              <span>{bi(c.label, locale)}</span>
            </label>
          ))}
        </div>
      );
    }
    case "rank":
      return <RankInput choices={opts} value={value} onChange={onChange} locale={locale} disabled={disabled} />;
    case "rating":
      return <Rating value={value} onChange={onChange} max={field.maxRating ?? 5} disabled={disabled} />;
    case "geopoint":
      return <GeoPoint value={value} onChange={onChange} locale={locale} disabled={disabled} />;
    case "photo":
      return <MediaInput accept="image/*" capture="environment" preview="image" value={value} onChange={onChange} locale={locale} disabled={disabled} />;
    case "audio":
      return <MediaInput accept="audio/*" preview="audio" value={value} onChange={onChange} locale={locale} disabled={disabled} />;
    case "video":
      return <MediaInput accept="video/*" capture="environment" preview="video" value={value} onChange={onChange} locale={locale} disabled={disabled} />;
    case "file":
      return <MediaInput accept="*/*" preview="file" value={value} onChange={onChange} locale={locale} disabled={disabled} />;
    case "signature":
      return <SignaturePad value={value} onChange={onChange} locale={locale} disabled={disabled} />;
    case "barcode":
      return <input {...common} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} dir="ltr" />;
    case "calculate":
      return <input {...common} value={(value as string) ?? ""} readOnly dir="ltr" />;
    default:
      return <input {...common} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

function RangeInput({ field, value, onChange, disabled }: { field: Field; value: unknown; onChange: (v: unknown) => void; disabled?: boolean }) {
  const min = field.min ?? 0;
  const max = field.max ?? 10;
  const step = field.step ?? 1;
  const n = value === "" || value === undefined || value === null ? min : Number(value);
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={n}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[var(--color-brand-600)]"
        dir="ltr"
      />
      <span className="w-12 text-center text-sm font-semibold" dir="ltr">
        {n}
      </span>
    </div>
  );
}

function RankInput({ choices, value, onChange, locale, disabled }: { choices: Choice[]; value: unknown; onChange: (v: unknown) => void; locale: Locale; disabled?: boolean }) {
  // Maintain an ordered list of all choice values; the order is the answer.
  const order: string[] = (() => {
    const stored = Array.isArray(value) ? (value as string[]) : [];
    const valid = stored.filter((v) => choices.some((c) => c.value === v));
    for (const c of choices) if (!valid.includes(c.value)) valid.push(c.value);
    return valid;
  })();

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      {order.map((v, i) => {
        const c = choices.find((x) => x.value === v);
        return (
          <div key={v} className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: "var(--color-border)" }}>
            <span className="w-6 text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
              {i + 1}
            </span>
            <span className="flex-1">{c ? bi(c.label, locale) : v}</span>
            <button type="button" className="btn btn-ghost px-2 py-0.5" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label="up">
              ↑
            </button>
            <button type="button" className="btn btn-ghost px-2 py-0.5" disabled={disabled || i === order.length - 1} onClick={() => move(i, 1)} aria-label="down">
              ↓
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Rating({ value, onChange, max, disabled }: { value: unknown; onChange: (v: unknown) => void; max: number; disabled?: boolean }) {
  const n = Number(value) || 0;
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onChange(i)}
          className="text-2xl leading-none"
          style={{ color: i <= n ? "#f59e0b" : "#d1d5db" }}
          aria-label={`${i}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function GeoPoint({ value, onChange, locale, disabled }: { value: unknown; onChange: (v: unknown) => void; locale: Locale; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const point = value as { lat: number; lng: number } | undefined;

  function locate() {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBusy(false);
      },
      () => setBusy(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" className="btn btn-ghost px-3 py-2" onClick={locate} disabled={disabled || busy}>
        {busy ? "…" : locale === "ar" ? "تحديد الموقع" : "Get location"}
      </button>
      {point && (
        <div className="text-sm" dir="ltr" style={{ color: "var(--color-muted)" }}>
          {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </div>
      )}
    </div>
  );
}

type PreviewKind = "image" | "audio" | "video" | "file";

function MediaInput({
  accept,
  capture,
  preview,
  value,
  onChange,
  locale,
  disabled,
}: {
  accept: string;
  capture?: "environment" | "user";
  preview: PreviewKind;
  value: unknown;
  onChange: (v: unknown) => void;
  locale: Locale;
  disabled?: boolean;
}) {
  const [name, setName] = useState("");
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setName(file.name);
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }
  const src = typeof value === "string" ? value : "";
  return (
    <div className="space-y-2">
      <input type="file" accept={accept} capture={capture} onChange={onFile} disabled={disabled} />
      {src && preview === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="max-h-40 rounded-lg border" style={{ borderColor: "var(--color-border)" }} />
      )}
      {src && preview === "audio" && <audio src={src} controls className="w-full" />}
      {src && preview === "video" && <video src={src} controls className="max-h-48 rounded-lg" />}
      {src && preview === "file" && (
        <div className="text-xs" style={{ color: "var(--color-muted)" }}>
          {name || (locale === "ar" ? "تم إرفاق ملف" : "File attached")}
        </div>
      )}
      {!src && <span className="text-xs" style={{ color: "var(--color-muted)" }}>{locale === "ar" ? "اختر ملفاً" : "Choose a file"}</span>}
    </div>
  );
}

function SignaturePad({ value, onChange, locale, disabled }: { value: unknown; onChange: (v: unknown) => void; locale: Locale; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const src = typeof value === "string" ? value : "";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = src;
  }, [src]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }
  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        className="rounded-lg border bg-white touch-none"
        style={{ borderColor: "var(--color-border)" }}
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <button type="button" className="btn btn-ghost px-3 py-1 text-sm" onClick={clear} disabled={disabled}>
        {locale === "ar" ? "مسح" : "Clear"}
      </button>
    </div>
  );
}
