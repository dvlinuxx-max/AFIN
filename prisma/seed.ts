import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { TEMPLATES } from "../src/lib/templates";

const db = new PrismaClient();

async function main() {
  const email = "admin@afin.local";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed skipped: demo user already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash("afin12345", 10);
  const user = await db.user.create({
    data: { email, name: "مدير AFIN", passwordHash, locale: "ar" },
  });

  const org = await db.organization.create({
    data: { name: "منظمة تجريبية", slug: `org-${nanoid(6)}` },
  });

  await db.membership.create({
    data: { userId: user.id, orgId: org.id, role: "owner" },
  });

  const project = await db.project.create({
    data: {
      name: "برنامج المساعدات 2026",
      description: "مشروع تجريبي لجمع بيانات المستفيدين",
      color: "#059669",
      orgId: org.id,
      createdById: user.id,
    },
  });

  const tpl = TEMPLATES[0];
  const schemaJson = JSON.stringify(tpl.schema);
  const form = await db.form.create({
    data: {
      title: tpl.title.ar,
      titleEn: tpl.title.en,
      description: tpl.description.ar,
      status: "deployed",
      shareToken: nanoid(10),
      schemaJson,
      version: 1,
      projectId: project.id,
      createdById: user.id,
      versions: {
        create: { version: 1, schemaJson, createdById: user.id },
      },
    },
  });

  const samples = [
    { respondent_name: "أحمد علي", gender: "male", age: 34, service: "food", satisfaction: 5, location: null },
    { respondent_name: "زينب حسن", gender: "female", age: 28, service: "health", satisfaction: 4, location: null },
    {
      respondent_name: "محمد كريم",
      gender: "male",
      age: 41,
      service: "shelter",
      satisfaction: 2,
      improve: "نحتاج استجابة أسرع",
      location: null,
    },
    { respondent_name: "سارة جواد", gender: "female", age: 22, service: "education", satisfaction: 5, location: null },
  ];

  for (const s of samples) {
    await db.submission.create({
      data: {
        formId: form.id,
        formVersion: 1,
        dataJson: JSON.stringify(s),
        geoLat: 33.3 + Math.random() * 0.2,
        geoLng: 44.3 + Math.random() * 0.2,
        status: "complete",
      },
    });
  }

  await db.auditLog.create({
    data: { orgId: org.id, userId: user.id, action: "seed", entityType: "org", entityId: org.id },
  });

  console.log("Seed complete.");
  console.log("Login:", email, "/ afin12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
