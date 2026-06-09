import type { BlitzCategory } from "../types/game";

export const BLITZ_CATEGORIES: BlitzCategory[] = [
  {
    category_id: "car",
    target_word: "سيارة",
    correct_words: ["تاير", "محرك", "بانزين", "بريك", "ستيرن", "مفتاح", "شاحن", "سائق", "رصيف", "واير"],
    blacklist: ["باص", "دراجة", "شاحنة", "طائرة", "قطار", "سفينة", "مروحية", "بحار", "طيار", "فيترجي"]
  },
  {
    category_id: "iraqi_food",
    target_word: "أكلات عراقية وتراثية",
    correct_words: ["دولمة", "باجة", "تشريب", "مسكوف", "كليچة", "كباب", "برياني", "مخلمة", "كبة", "زلابية", "بقلاوة", "دهينة", "سياح", "باكلة", "لبلبي", "شلغم", "هريسة"],
    blacklist: ["قيمر", "جبن", "صمون", "تنور", "شكر", "ملح", "بهارات", "خبز", "عجين", "طحين", "دهن"]
  },
  {
    category_id: "house",
    target_word: "أثاث وأجزاء البيت",
    correct_words: ["باب", "سطح", "غرفة", "بلكون", "عتبة", "ميز", "كرسي", "شاشة", "قنفة", "چرباية", "جام", "خزانة", "بردة", "سجادة", "مصباح"],
    blacklist: ["طابوق", "سمنت", "جص", "برغي", "بسامير", "شمعة", "كبريت"]
  },
  {
    category_id: "animals",
    target_word: "حيوانات برية",
    correct_words: ["أسد", "نمر", "فهد", "ليث", "سبع", "ذئب", "ضبع", "دب", "تمساح", "قرش", "عقاب", "صقر"],
    blacklist: ["غزال", "زرافة", "فيل", "أرنب", "حصان", "كلب", "بزون", "سنجاب", "حمامة", "عصفور"]
  },
  {
    category_id: "sky",
    target_word: "السماء",
    correct_words: ["شمس", "قمر", "نجم", "كوكب", "فضاء", "تلسكوب", "صاروخ", "طائرة", "مروحية", "خفاش", "وطواط", "مطر"],
    blacklist: ["أرض", "بحر", "طين", "شط", "ماء", "غيمة", "رمل"]
  },
  {
    category_id: "iraqi_tea",
    target_word: "الجاي",
    correct_words: ["چاي", "قوري", "استكان", "فحم", "منقلة", "صينية", "شكر", "هيل", "فنجان", "چايخانة"],
    blacklist: ["باجة", "كباب", "سمك", "مطبگ", "دهن", "ملح", "بهارات"]
  },
  {
    category_id: "professions",
    target_word: "مهن ووظائف",
    correct_words: ["فيترجي", "مهندس", "دكتور", "معلم", "مدرس", "طالب", "حدادي", "صياد", "فلاح", "حارس", "سائق", "طيار", "بحار"],
    blacklist: ["كلية", "جامعة", "مدرسة", "شغل", "راتب", "عقد", "أوسطى", "خلفه"]
  },
  {
    category_id: "writing_materials",
    target_word: "أدوات المدرسة والكتابة",
    correct_words: ["قلم", "دفتر", "لوحة", "مكتبة", "حبر", "صبورة", "طباشير", "امتحان", "ورق", "دبوس"],
    blacklist: ["مهندس", "دكتور", "معلم", "مدرس", "طالب", "كلية"]
  },
  {
    category_id: "tools",
    target_word: "أدوات البناء والعمل",
    correct_words: ["مطرقة", "بسامير", "برغي", "درنفيس", "منشار", "حبل", "سلسلة", "قفل", "صندوق", "مقص"],
    blacklist: ["قلم", "دفتر", "ساعة", "خاتم", "نظارة", "واير"]
  },
  {
    category_id: "cities_iraq",
    target_word: "مدن ومحافظات العراق",
    correct_words: ["بغداد", "بصرة", "موصل", "عمارة", "ناصرية", "فلوجة", "كوت", "سماوة", "رمادي", "نجف", "حلة", "دهوك", "زاخو", "كربلاء", "أربيل", "سليمانية", "تكريت", "كركوك", "سنجار", "سامراء", "بعقوبة"],
    blacklist: [""]
  }
];

export const BLITZ_POOL_LABELS: Record<string, string> = {
  all: "جميع الفئات",
  iraqi: "لهجة وأكلات ومدن عراقية",
  nature_tools: "طبيعة، حيوانات، وأدوات",
};

export function getBlitzCategoriesByPool(pool: string): BlitzCategory[] {
  if (pool === "iraqi") {
    return BLITZ_CATEGORIES.filter(c => ["iraqi_food", "iraqi_tea", "cities_iraq"].includes(c.category_id));
  }
  if (pool === "nature_tools") {
    return BLITZ_CATEGORIES.filter(c => ["car", "house", "animals", "sky", "tools"].includes(c.category_id));
  }
  return BLITZ_CATEGORIES;
}
