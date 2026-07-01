"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useI18n } from "@/components/I18nProvider";
import { FormFill } from "@/components/FormFill";
import { bi } from "@/lib/i18n";
import { type Field, type FieldType, type FormSchema, hasChoices, isContainer, newFieldId } from "@/lib/form-schema";
import { downloadXlsform, readXlsformFile } from "@/lib/xlsform";
import { FieldPalette } from "./FieldPalette";
import { FieldCard } from "./FieldCard";
import { PropertiesPanel } from "./PropertiesPanel";
import { AiPanel } from "./AiPanel";

interface Props {
  formId: string;
  title: string;
  initialSchema: FormSchema;
  aiEnabled: boolean;
}

// Rebuild the children array at a given container path with `updater`, immutably.
function editAtPath(fields: Field[], path: string[], updater: (list: Field[]) => Field[]): Field[] {
  if (path.length === 0) return updater(fields);
  const [head, ...rest] = path;
  return fields.map((f) => (f.id === head ? { ...f, children: editAtPath(f.children ?? [], rest, updater) } : f));
}

function childrenAtPath(fields: Field[], path: string[]): Field[] {
  let list = fields;
  for (const id of path) {
    const node = list.find((f) => f.id === id);
    if (!node?.children) return [];
    list = node.children;
  }
  return list;
}

export function Builder({ formId, title, initialSchema, aiEnabled }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [fields, setFields] = useState<Field[]>(initialSchema.fields);
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const currentList = childrenAtPath(fields, pathStack);
  const selected = currentList.find((f) => f.id === selectedId) ?? null;

  const markDirty = useCallback(() => {
    setDirty(true);
    setSavedAt(false);
  }, []);

  function addField(type: FieldType) {
    const field: Field = {
      id: newFieldId(type),
      type,
      label: { ar: "", en: "" },
    };
    if (hasChoices(type)) {
      field.choices = [
        { value: "opt1", label: { ar: "خيار 1", en: "Option 1" } },
        { value: "opt2", label: { ar: "خيار 2", en: "Option 2" } },
      ];
    }
    if (type === "rating") field.maxRating = 5;
    if (type === "range") {
      field.min = 0;
      field.max = 10;
      field.step = 1;
    }
    if (isContainer(type)) field.children = [];
    setFields((prev) => editAtPath(prev, pathStack, (list) => [...list, field]));
    setSelectedId(field.id);
    markDirty();
  }

  function updateField(id: string, patch: Partial<Field>) {
    setFields((prev) => editAtPath(prev, pathStack, (list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f))));
    if (patch.id && patch.id !== id) setSelectedId(patch.id);
    markDirty();
  }

  function deleteField(id: string) {
    setFields((prev) => editAtPath(prev, pathStack, (list) => list.filter((f) => f.id !== id)));
    if (selectedId === id) setSelectedId(null);
    markDirty();
  }

  function duplicateField(id: string) {
    setFields((prev) =>
      editAtPath(prev, pathStack, (list) => {
        const idx = list.findIndex((f) => f.id === id);
        if (idx < 0) return list;
        const copy: Field = { ...list[idx], id: newFieldId(list[idx].type) };
        const next = [...list];
        next.splice(idx + 1, 0, copy);
        return next;
      }),
    );
    markDirty();
  }

  function openContainer(id: string) {
    setPathStack((prev) => [...prev, id]);
    setSelectedId(null);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setFields((prev) =>
      editAtPath(prev, pathStack, (list) => {
        const from = list.findIndex((f) => f.id === active.id);
        const to = list.findIndex((f) => f.id === over.id);
        return arrayMove(list, from, to);
      }),
    );
    markDirty();
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemaJson: JSON.stringify({ fields }) }),
    });
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      setSavedAt(true);
      router.refresh();
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const schema = await readXlsformFile(file);
      setFields(schema.fields);
      setPathStack([]);
      setSelectedId(null);
      markDirty();
    } catch {
      // ignore malformed files
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function applyAi(schema: FormSchema, mode: "replace" | "append") {
    setFields((prev) => (mode === "replace" ? schema.fields : [...prev, ...schema.fields]));
    setPathStack([]);
    markDirty();
  }

  // Breadcrumb labels for the container path.
  const crumbs = pathStack.map((id, i) => {
    const list = childrenAtPath(fields, pathStack.slice(0, i));
    const node = list.find((f) => f.id === id);
    return { id, label: node ? bi(node.label, locale) || node.id : id };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={`/forms/${formId}`} className="text-sm text-brand-700">
            ← {title}
          </Link>
          {savedAt && <span className="text-xs text-brand-600">{t.common.saved}</span>}
          {dirty && <span className="text-xs" style={{ color: "var(--color-muted)" }}>•</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => setPreview((p) => !p)}>
            {t.builder.preview}
          </button>
          <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => fileRef.current?.click()}>
            {t.builder.importXls}
          </button>
          <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => downloadXlsform({ fields }, title)}>
            {t.builder.exportXls}
          </button>
          {aiEnabled && (
            <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => setAiOpen(true)}>
              {t.builder.aiAssist}
            </button>
          )}
          <button className="btn btn-primary px-4 py-1.5 text-sm" onClick={save} disabled={saving || !dirty}>
            {saving ? t.common.saving : t.builder.saveForm}
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />

      {!preview && pathStack.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button className="text-brand-700" onClick={() => { setPathStack([]); setSelectedId(null); }}>
            {locale === "ar" ? "النموذج" : "Form"}
          </button>
          {crumbs.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1">
              <span style={{ color: "var(--color-muted)" }}>/</span>
              <button className="text-brand-700" onClick={() => { setPathStack(pathStack.slice(0, i + 1)); setSelectedId(null); }}>
                {c.label}
              </button>
            </span>
          ))}
        </div>
      )}

      {preview ? (
        <div className="card p-5 max-w-xl mx-auto">
          <h2 className="font-bold text-lg mb-4">{title}</h2>
          {fields.length === 0 ? (
            <p style={{ color: "var(--color-muted)" }}>{t.builder.emptyCanvas}</p>
          ) : (
            <FormFill schema={{ fields }} locale={locale} />
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[260px_1fr_300px] gap-4 items-start">
          <FieldPalette onAdd={addField} />

          <div className="space-y-2 min-h-[200px]">
            {currentList.length === 0 ? (
              <div className="card p-10 text-center text-sm" style={{ color: "var(--color-muted)" }}>
                {t.builder.emptyCanvas}
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={currentList.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {currentList.map((f) => (
                      <FieldCard
                        key={f.id}
                        field={f}
                        selected={f.id === selectedId}
                        onSelect={() => setSelectedId(f.id)}
                        onDelete={() => deleteField(f.id)}
                        onDuplicate={() => duplicateField(f.id)}
                        onOpen={isContainer(f.type) ? () => openContainer(f.id) : undefined}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className="lg:sticky lg:top-20">
            <PropertiesPanel field={selected} onChange={(patch) => selected && updateField(selected.id, patch)} />
          </div>
        </div>
      )}

      <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} onApply={applyAi} />
    </div>
  );
}
