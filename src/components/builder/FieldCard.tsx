"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FIELD_LABELS, isContainer, type Field } from "@/lib/form-schema";
import { useI18n } from "@/components/I18nProvider";
import { bi } from "@/lib/i18n";

interface Props {
  field: Field;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpen?: () => void;
}

export function FieldCard({ field, selected, onSelect, onDelete, onDuplicate, onOpen }: Props) {
  const { locale } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`card p-3 cursor-pointer flex items-center gap-2 ${selected ? "ring-2 ring-brand-400" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab text-lg px-1 select-none"
        style={{ color: "var(--color-muted)" }}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag"
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">
          {bi(field.label, locale) || <span style={{ color: "var(--color-muted)" }}>—</span>}
          {field.required && <span className="text-red-500"> *</span>}
        </div>
        <div className="text-xs" style={{ color: "var(--color-muted)" }}>
          {FIELD_LABELS[field.type][locale]} · {field.id}
          {isContainer(field.type) && ` · ${field.children?.length ?? 0}`}
        </div>
      </div>
      {onOpen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="text-sm px-2 py-1 rounded hover:bg-[var(--color-bg)] text-brand-700"
          aria-label="Open"
        >
          {locale === "ar" ? "فتح ↳" : "Open ↳"}
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        className="text-sm px-2 py-1 rounded hover:bg-[var(--color-bg)]"
        aria-label="Duplicate"
      >
        ⧉
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-sm px-2 py-1 rounded hover:bg-red-50 text-red-600"
        aria-label="Delete"
      >
        ✕
      </button>
    </div>
  );
}
