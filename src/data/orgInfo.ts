// Реквизиты владельца сервиса. Один источник для Terms / Privacy / Оферты,
// футера и контактных страниц. Когда зарегистрируешь ИП — обнови здесь, и
// все юр.документы синхронизируются автоматически.

export const ORG_INFO = {
  // Краткое название сервиса (в текстах документов).
  serviceName: "Tigim",

  // Юридическое наименование исполнителя.
  // ПОКА: физическое лицо до регистрации ИП. После регистрации поменяй на
  // что-то типа "Индивидуальный предприниматель Бакытбеков Кадыр".
  legalName: "Кадыр Б. (физическое лицо)",
  legalStatus: "individual" as "individual" | "ip" | "ooo",

  // ИНН — null пока физлицо. После ИП впиши номер.
  inn: null as string | null,

  // Юридический / фактический адрес.
  address: "Кыргызская Республика, г. Бишкек",

  // Контакты.
  // Пока всё на один email — после ИП можно развести support@/billing@/privacy@.
  email: "kadyr.b14@gmail.com",
  phone: "+996 997 44 87 78",

  // WhatsApp (без + и пробелов — для wa.me).
  whatsapp: "996997448778",

  // Реквизиты счёта — null пока физлицо. После ИП впиши.
  bankAccount: null as string | null,
  bankName: null as string | null,
  bankBik: null as string | null,
} as const;

// Хелпер: «ИП Имя Фамилия, ИНН 1234567890» или «Физлицо: Имя» если не ИП.
export function orgIdentityLine(): string {
  if (ORG_INFO.legalStatus === "individual") {
    return `${ORG_INFO.legalName} (физическое лицо до завершения регистрации индивидуального предпринимателя)`;
  }
  return ORG_INFO.inn
    ? `${ORG_INFO.legalName}, ИНН ${ORG_INFO.inn}`
    : ORG_INFO.legalName;
}
