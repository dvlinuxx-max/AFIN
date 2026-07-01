import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { parseSchema } from "@/lib/form-schema";
import { bi } from "@/lib/i18n";
import { dictionaries } from "@/lib/i18n";
import { Collector } from "./Collector";

export const dynamic = "force-dynamic";

export default async function CollectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const form = await db.form.findUnique({ where: { shareToken: token } });
  if (!form) notFound();

  const locale = await getLocale();

  if (form.status !== "deployed") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p style={{ color: "var(--color-muted)" }}>{dictionaries[locale].collect.closedForm}</p>
      </div>
    );
  }

  const title = bi({ ar: form.title, en: form.titleEn || form.title }, locale);

  return (
    <Collector
      token={token}
      title={title}
      description={form.description}
      schema={parseSchema(form.schemaJson)}
      locale={locale}
      requireGeo={form.requireGeo}
      encrypted={form.encrypted}
      publicKey={form.publicKey}
    />
  );
}
