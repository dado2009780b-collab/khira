import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Plus,
  Sparkles,
  Truck,
} from "lucide-react";
import "./_group.css";

const offer = {
  title: "كتابان.. ورحلة أعمق مع العلم والإيمان 📚",
  description: "خُذ خطوة نحو معرفة أعمق مع باقة تجمع بين كتابين مميزين من كتب التراث الإسلامي.",
  closingText: "كتابان.. معرفة تنفعك وأثر يبقى معاك.",
  ctaText: "اطلب الآن",
  price: 199,
  deliveryFee: 0,
  currency: "د.ل.",
  packageName: "باقة كتاب الداء والدواء والرحيق المختوم",
  benefits: [
    "كتابان مميزان في باقة واحدة.",
    "السعر النهائي 199 دينارًا ليبيًا.",
    "توصيل مجاني لجميع المدن الليبية.",
  ],
  books: [
    {
      id: "dawa-wa-dawa",
      title: "الداء والدواء",
      author: "ابن قيم الجوزية",
      description: "كتاب يتناول أمراض القلوب وأسباب صلاح النفس، ويقدّم معاني إيمانية ودروسًا تساعدك على التأمل ومراجعة النفس.",
      coverUrl: null,
    },
    {
      id: "alraheeq-almakhtoom",
      title: "الرحيق المختوم",
      author: "صفي الرحمن المباركفوري",
      description: "رحلة في السيرة النبوية، تتعرّف من خلالها على حياة النبي محمد ﷺ وأهم الأحداث والمواقف في سيرته العطرة.",
      coverUrl: null,
    },
  ],
};

const money = (amount: number, currency = "د.ل.") =>
  `${new Intl.NumberFormat("ar-LY").format(amount)} ${currency}`;

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 font-bold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55";
const primaryButton = `${button} bg-[#244334] text-[#fffaf0] hover:bg-[#305642]`;
const outlineButton = `${button} border border-[#cfc5af] bg-[#f8f4ea] text-[#294636] hover:bg-[#eee7d7]`;

function Brand() {
  return (
    <div className="flex items-center gap-3 text-[#294636]" dir="rtl">
      <span className="grid size-11 place-items-center rounded-full border border-current/25">
        <BookOpen size={21} />
      </span>
      <span>
        <span className="block text-lg font-extrabold leading-tight">باقة الكتب الإسلامية</span>
        <span className="text-[10px] tracking-[.18em] opacity-70">كتابان • قراءة ومعرفة</span>
      </span>
    </div>
  );
}

function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <a href="#top" className="no-underline"><Brand /></a>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#31503d] md:flex">
          <a href="#books" className="hover:text-[#98763b]">الكتابان</a>
          <a href="#offer" className="hover:text-[#98763b]">تفاصيل الباقة</a>
          <a href="#order" className="hover:text-[#98763b]">الطلب</a>
        </nav>
        <a className={`${primaryButton} min-h-10 px-5 text-sm`} href="#order">
          اطلب الآن <ArrowLeft size={16} />
        </a>
      </div>
    </header>
  );
}

function Cover({ book, compact = false }: { book: (typeof offer.books)[number]; compact?: boolean }) {
  const size = compact ? "h-52 w-36" : "h-64 w-44";
  return book.coverUrl ? (
    <img src={book.coverUrl} alt={`غلاف ${book.title}`} className={`book-cover block rounded-sm bg-[#e5dac4] object-contain ${size}`} />
  ) : (
    <div className={`relative flex ${size} flex-col items-center justify-center overflow-hidden border border-[#d3c6aa] bg-[#eee6d6] px-4 text-center text-[#766b57]`}>
      <div className="absolute inset-2 border border-[#b7a777]/50" />
      <BookOpen className="mb-4 text-[#987b45]" size={30} />
      <span className="max-w-28 text-sm leading-6">سيتم إضافة صورة الكتاب قريبًا</span>
    </div>
  );
}

function OrderForm() {
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <section id="order" className="scroll-mt-5 bg-[#e9e2d2] px-5 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="text-sm font-bold text-[#927944]">على بُعد خطوة</p>
          <h2 className="serif-title mt-3 text-4xl">اطلب بكجك بكل سهولة</h2>
          <p className="mt-3 leading-8 text-[#687064]">عبّي بياناتك التالية باش نأكدوا طلبك ونتواصلوا معاك.</p>
          <div className="mt-8 rounded-2xl border border-[#d1c6af] bg-[#f6f1e6] p-6">
            <p className="text-xs font-bold text-[#987c46]">ملخص الطلب</p>
            <p className="mt-3 font-bold">{offer.packageName}</p>
            <div className="mt-5 space-y-3 text-sm text-[#646c60]">
              <div className="flex justify-between gap-3"><span>الكمية</span><span className="font-semibold">باقة واحدة</span></div>
              <div className="flex justify-between gap-3"><span>سعر الباقة</span><span>{money(offer.price, offer.currency)}</span></div>
              <div className="flex justify-between gap-3"><span>التوصيل</span><span>مجاني</span></div>
            </div>
            <div className="mt-5 flex justify-between border-t border-[#d8cfbd] pt-4 font-extrabold">
              <span>الإجمالي</span><span className="text-[#355541]">{money(offer.price, offer.currency)}</span>
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-[#d5cbb7] bg-[#f7f2e7] p-6 md:p-9">
          {sent ? (
            <div role="status" className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <span className="grid size-16 place-items-center rounded-full bg-[#dce8da] text-[#315b3c]"><CheckCircle2 size={34} /></span>
              <h3 className="mt-6 text-2xl font-extrabold">تم استلام طلبك بنجاح!</h3>
              <p className="mt-3 max-w-md leading-8 text-[#626b60]">هذا نموذج معاينة، ولن يُرسل أي طلب.</p>
              <button onClick={() => setSent(false)} className={`${outlineButton} mt-7`}><Plus size={16} /> إرسال طلب جديد</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold">الاسم الكامل</span>
                  <input autoComplete="name" placeholder="اكتب اسمك هنا" className="min-h-12 w-full rounded-xl border border-[#d2c8b5] bg-[#fcf9f1] px-4 text-right" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold">رقم الهاتف</span>
                  <input inputMode="tel" autoComplete="tel" dir="ltr" placeholder="09X XXX XXXX" className="min-h-12 w-full rounded-xl border border-[#d2c8b5] bg-[#fcf9f1] px-4 text-left" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold">المدينة</span>
                  <input autoComplete="address-level2" placeholder="اكتب مدينتك" className="min-h-12 w-full rounded-xl border border-[#d2c8b5] bg-[#fcf9f1] px-4 text-right" />
                </label>
              </div>
              <button className={`${primaryButton} mt-7 w-full`} type="submit">تأكيد الطلب <ArrowLeft size={17} /></button>
              <p className="mt-4 text-center text-xs text-[#76766a]">بيانات الطلب تُستخدم للتواصل معك بشأن هذه الباقة فقط.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export function Current() {
  return (
    <main id="top" dir="rtl" className="overflow-hidden bg-[#f5f0e5] text-[#263d31]">
      <section className="paper-grain relative min-h-[760px] bg-[#ede6d7]">
        <Header />
        <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-10 px-5 pb-16 pt-32 md:grid-cols-[1fr_1.02fr] md:px-10 md:pt-28">
          <div className="relative z-10 max-w-[620px] reveal">
            <p className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#917747]"><span className="h-px w-9 bg-[#af9765]" /> من مكتبة التراث الإسلامي</p>
            <h1 className="serif-title max-w-xl text-[clamp(2.65rem,6vw,5.3rem)] leading-[1.38]">{offer.title}</h1>
            <p className="mt-5 max-w-lg text-lg leading-9 text-[#5c6559]">{offer.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="flex items-baseline gap-2 text-[#294636]"><strong className="text-4xl font-extrabold">{money(offer.price, offer.currency)}</strong><span className="text-sm text-[#766b58]">للباقة كاملة</span></p>
              <span className="flex items-center gap-2 text-sm text-[#526554]"><Truck size={18} className="text-[#9b7e49" /> التوصيل مجاني لجميع المدن الليبية</span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a className={`${primaryButton} min-h-14 px-8`} href="#order">{offer.ctaText}<ArrowLeft size={18} /></a>
              <a href="#books" className="inline-flex items-center gap-2 px-3 py-3 text-sm font-bold text-[#415b47]">اكتشف الكتابين <ChevronLeft size={17} /></a>
            </div>
          </div>
          <div className="reveal-delay relative flex min-h-[410px] items-center justify-center md:min-h-[600px]">
            <div className="absolute h-[380px] w-[380px] rounded-full border border-[#c5b58f]/40 md:h-[510px] md:w-[510px]" />
            <div className="absolute h-[320px] w-[320px] rounded-full border border-[#c5b58f]/30 md:h-[440px] md:w-[440px]" />
            <div className="absolute bottom-[11%] h-16 w-[90%] rounded-[50%] bg-[#90784f]/10 blur-xl" />
            <div className="relative flex items-center gap-4 sm:gap-8">
              {offer.books.map((book, index) => <div key={book.id} className={`${index === 0 ? "mt-11 rotate-[-3deg]" : "-mt-9 rotate-[3deg]"} transition-transform duration-500 hover:-translate-y-2`}><Cover book={book} /></div>)}
            </div>
            <div className="absolute bottom-0 left-4 rounded-full border border-[#d3c7af] bg-[#f5f0e5]/90 px-5 py-2 text-xs font-semibold text-[#6b705f]">كتابان في باقة واحدة</div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-[#d5c9b1]" />
      </section>
      <section id="books" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
        <div className="mb-14 max-w-xl">
          <p className="text-sm font-bold tracking-wide text-[#927944]">مكتبة مختارة</p>
          <h2 className="serif-title mt-3 text-4xl md:text-5xl">كتابان يفتحان بابين للمعرفة</h2>
          <p className="mt-4 leading-8 text-[#697064]">لكل كتاب طريقته في إضاءة المعنى، وبين صفحاتهما مساحة للتأمل والتعلّم.</p>
        </div>
        <div className="divide-y divide-[#d8cfbd] border-y border-[#d8cfbd]">
          {offer.books.map((book, i) => (
            <article key={book.id} className="grid items-center gap-7 py-10 sm:grid-cols-[190px_1fr] md:gap-14 md:py-14">
              <div className="mx-auto"><Cover book={book} compact /></div>
              <div className="max-w-2xl">
                <span className="text-xs font-semibold tracking-[.2em] text-[#a1874d]">٠{i + 1} / من الباقة</span>
                <h3 className="serif-title mt-3 text-3xl">{book.title}</h3>
                <p className="mt-2 font-semibold text-[#8b7549]">{book.author}</p>
                <p className="mt-4 text-base leading-8 text-[#656d60]">{book.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-[#e9e2d2] px-5 py-20 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[.8fr_1.2fr] md:px-5">
          <div><p className="text-sm font-bold text-[#927944]">قيمة في باقة</p><h2 className="serif-title mt-3 text-4xl leading-[1.5]">المعرفة تكبر<br />حين تجتمع.</h2></div>
          <div className="grid gap-4 sm:grid-cols-3">
            {offer.benefits.map((benefit, i) => (
              <div key={`${benefit}-${i}`} className="border-t border-[#cbbd9f] pt-5">
                <span className="grid size-10 place-items-center rounded-full bg-[#f4efe4] text-[#907744]">{i === 0 ? <BookOpen size={19} /> : i === 1 ? <CircleDollarSign size={19} /> : <Truck size={19} />}</span>
                <p className="mt-4 font-bold leading-7">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="offer" className="scroll-mt-10 px-5 py-24 md:py-32">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#244334] px-7 py-12 text-[#f7f1e5] md:px-14 md:py-16">
          <div className="absolute -left-14 -top-20 size-72 rounded-full border border-[#cbb178]/20" />
          <div className="absolute left-0 top-0 size-52 rounded-full border border-[#cbb178]/15" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold text-[#d0b978]">باقة واحدة • كتابان</p>
              <h2 className="serif-title mt-3 text-3xl leading-[1.5] md:text-4xl">كتابان.. معرفة تنفعك وأثر يبقى معاك.</h2>
              <p className="mt-3 max-w-xl leading-8 text-[#e0dfd2]">{offer.closingText}</p>
              <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#e3dfd0]">{offer.books.map((book) => <li key={book.id} className="flex items-center gap-2"><Check size={15} className="text-[#d4b86b" />{book.title}</li>)}</ul>
            </div>
            <div className="min-w-52 border-r border-[#a89b72]/55 pr-7">
              <p className="text-xs text-[#d1c8ad]">السعر النهائي</p>
              <p className="mt-1 text-4xl font-extrabold text-[#e0c57c]">{money(offer.price, offer.currency)}</p>
              <p className="mt-3 text-sm">التوصيل مجاني</p>
              <a href="#order" className={`${button} mt-6 bg-[#e0c57c] text-[#213b2e] hover:bg-[#ecd699]`}>اطلب الباقة الآن<ArrowLeft size={16} /></a>
            </div>
          </div>
        </div>
      </section>
      <OrderForm />
      <section className="px-5 pb-24">
        <div className="mx-auto max-w-6xl border-y border-[#d8cfbd] py-16 text-center">
          <Sparkles className="mx-auto text-[#a2854b]" size={22} />
          <h2 className="serif-title mt-4 text-3xl md:text-4xl">كتابان.. معرفة تنفعك وأثر يبقى معاك.</h2>
          <p className="mt-3 text-[#6a7064]">اضغط على اطلب الآن وعبّي بياناتك باش تأكد طلبك.</p>
          <a href="#order" className={`${primaryButton} mt-7`}>اطلب الآن<ArrowLeft size={16} /></a>
        </div>
      </section>
      <footer className="border-t border-[#d8cfbd] bg-[#eee8da] px-5 py-7">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right">
          <Brand />
          <p className="text-xs text-[#6d7167]">صفحات تُقرأ، ومعرفة تبقى.</p>
        </div>
      </footer>
    </main>
  );
}
