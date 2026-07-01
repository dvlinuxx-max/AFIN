import type { FormSchema } from "./form-schema";

export interface FormTemplate {
  id: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  category: "survey" | "assessment" | "health" | "education";
  schema: FormSchema;
}

export const TEMPLATES: FormTemplate[] = [
  {
    id: "beneficiary-satisfaction",
    title: { ar: "استبيان رضا المستفيدين", en: "Beneficiary satisfaction survey" },
    description: {
      ar: "قياس رضا المستفيدين عن الخدمات المقدمة",
      en: "Measure beneficiary satisfaction with delivered services",
    },
    category: "survey",
    schema: {
      fields: [
        {
          id: "respondent_name",
          type: "text",
          label: { ar: "اسم المستفيد", en: "Beneficiary name" },
          required: true,
        },
        {
          id: "gender",
          type: "select_one",
          label: { ar: "الجنس", en: "Gender" },
          required: true,
          choices: [
            { value: "male", label: { ar: "ذكر", en: "Male" } },
            { value: "female", label: { ar: "أنثى", en: "Female" } },
          ],
        },
        {
          id: "age",
          type: "number",
          label: { ar: "العمر", en: "Age" },
          min: 0,
          max: 120,
        },
        {
          id: "service",
          type: "select_one",
          label: { ar: "الخدمة المقدمة", en: "Service received" },
          choices: [
            { value: "food", label: { ar: "غذائية", en: "Food" } },
            { value: "health", label: { ar: "صحية", en: "Health" } },
            { value: "shelter", label: { ar: "إيواء", en: "Shelter" } },
            { value: "education", label: { ar: "تعليمية", en: "Education" } },
          ],
        },
        {
          id: "satisfaction",
          type: "rating",
          label: { ar: "مستوى الرضا العام", en: "Overall satisfaction" },
          maxRating: 5,
          required: true,
        },
        {
          id: "improve",
          type: "paragraph",
          label: { ar: "اقتراحات للتحسين", en: "Suggestions for improvement" },
          relevant: "${satisfaction} <= 3",
        },
        {
          id: "location",
          type: "geopoint",
          label: { ar: "موقع المقابلة", en: "Interview location" },
        },
      ],
    },
  },
  {
    id: "needs-assessment",
    title: { ar: "تقييم الاحتياجات", en: "Needs assessment" },
    description: {
      ar: "تقييم سريع لاحتياجات الأسر",
      en: "Rapid assessment of household needs",
    },
    category: "assessment",
    schema: {
      fields: [
        {
          id: "household_head",
          type: "text",
          label: { ar: "اسم رب الأسرة", en: "Head of household" },
          required: true,
        },
        {
          id: "phone",
          type: "phone",
          label: { ar: "رقم الهاتف", en: "Phone number" },
        },
        {
          id: "members",
          type: "number",
          label: { ar: "عدد أفراد الأسرة", en: "Household size" },
          min: 1,
          required: true,
        },
        {
          id: "children",
          type: "number",
          label: { ar: "عدد الأطفال دون 5 سنوات", en: "Children under 5" },
          min: 0,
          constraint: ". <= ${members}",
          constraintMessage: { ar: "لا يمكن أن يتجاوز عدد أفراد الأسرة", en: "Cannot exceed household size" },
        },
        {
          id: "priority_needs",
          type: "select_multiple",
          label: { ar: "الاحتياجات الأولوية", en: "Priority needs" },
          choices: [
            { value: "food", label: { ar: "غذاء", en: "Food" } },
            { value: "water", label: { ar: "ماء", en: "Water" } },
            { value: "shelter", label: { ar: "مأوى", en: "Shelter" } },
            { value: "health", label: { ar: "رعاية صحية", en: "Healthcare" } },
            { value: "cash", label: { ar: "مساعدة نقدية", en: "Cash assistance" } },
          ],
        },
        {
          id: "location",
          type: "geopoint",
          label: { ar: "موقع الأسرة", en: "Household location" },
        },
      ],
    },
  },
  {
    id: "health-screening",
    title: { ar: "فحص صحي أولي", en: "Health screening" },
    description: {
      ar: "نموذج فحص صحي سريع في المخيمات",
      en: "Quick health screening form for camps",
    },
    category: "health",
    schema: {
      fields: [
        {
          id: "patient_name",
          type: "text",
          label: { ar: "اسم المريض", en: "Patient name" },
          required: true,
        },
        {
          id: "age",
          type: "number",
          label: { ar: "العمر", en: "Age" },
          min: 0,
          max: 120,
          required: true,
        },
        {
          id: "temperature",
          type: "decimal",
          label: { ar: "درجة الحرارة", en: "Temperature (C)" },
          min: 30,
          max: 45,
        },
        {
          id: "symptoms",
          type: "select_multiple",
          label: { ar: "الأعراض", en: "Symptoms" },
          choices: [
            { value: "fever", label: { ar: "حرارة", en: "Fever" } },
            { value: "cough", label: { ar: "سعال", en: "Cough" } },
            { value: "diarrhea", label: { ar: "إسهال", en: "Diarrhea" } },
            { value: "fatigue", label: { ar: "إرهاق", en: "Fatigue" } },
          ],
        },
        {
          id: "referral",
          type: "select_one",
          label: { ar: "الإحالة", en: "Referral" },
          choices: [
            { value: "none", label: { ar: "لا حاجة", en: "Not needed" } },
            { value: "clinic", label: { ar: "عيادة", en: "Clinic" } },
            { value: "hospital", label: { ar: "مستشفى", en: "Hospital" } },
          ],
        },
      ],
    },
  },
  {
    id: "school-enrollment",
    title: { ar: "تسجيل طلاب", en: "School enrollment" },
    description: {
      ar: "نموذج تسجيل الطلاب في المدارس",
      en: "Student enrollment form for schools",
    },
    category: "education",
    schema: {
      fields: [
        {
          id: "student_name",
          type: "text",
          label: { ar: "اسم الطالب", en: "Student name" },
          required: true,
        },
        {
          id: "birth_date",
          type: "date",
          label: { ar: "تاريخ الميلاد", en: "Date of birth" },
          required: true,
        },
        {
          id: "grade",
          type: "select_one",
          label: { ar: "الصف", en: "Grade" },
          choices: Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1),
            label: { ar: `الصف ${i + 1}`, en: `Grade ${i + 1}` },
          })),
        },
        {
          id: "guardian",
          type: "text",
          label: { ar: "اسم ولي الأمر", en: "Guardian name" },
          required: true,
        },
        {
          id: "guardian_phone",
          type: "phone",
          label: { ar: "هاتف ولي الأمر", en: "Guardian phone" },
        },
        {
          id: "has_disability",
          type: "select_one",
          label: { ar: "هل لديه إعاقة؟", en: "Has a disability?" },
          choices: [
            { value: "no", label: { ar: "لا", en: "No" } },
            { value: "yes", label: { ar: "نعم", en: "Yes" } },
          ],
        },
        {
          id: "disability_detail",
          type: "text",
          label: { ar: "تفاصيل الإعاقة", en: "Disability details" },
          relevant: '${has_disability} == "yes"',
        },
      ],
    },
  },
];

export function templateById(id: string): FormTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
