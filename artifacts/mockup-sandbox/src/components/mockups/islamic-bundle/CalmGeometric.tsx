import "./_group.css";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Plus,
  Truck,
} from "lucide-react";

const offer = {
  title: "كتابان.. ورحلة أعمق مع العلم والإيمان",
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
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 font-bold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315f5a] disabled:cursor-not-allowed disabled:opacity-55";
const primaryButton = `${button} bg-[#315b56] text-[#fffaf0] hover:bg-[#244945]`;
const outlineButton = `${button} border border-[#c7cbb9] bg-[#fbfaf4] text-[#315b56] hover:bg-[#eef0e6]`;

function Rosette({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" fill="none" className={className}>
      <path d="M50 3 60 21 79 12 77 33 98 38 83 52 96 69 75 72 73 94 55 82 42 98 34 78 12 84 19 63 2 51 21 40 12 20 34 23Z" />
      <circle cx="50" cy="50" r="22" />
      <path d="M50 36 64 50 50 64 36 50 50 36Z" />
    </svg>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 text-[#315b56]" dir="rtl">
      <span className="cg-brand-mark grid size-11 place-items-center rounded-full">
        <BookOpen size={20} strokeWidth={1.7} />
      </span>
      <span>
        <span className="block text-lg font-extrabold leading-tight">باقة الكتب الإسلامية</span>
        <span className="text-[10px] tracking-[.16em] opacity-75">كتابان · قراءة ومعرفة</span>
      </span>
    </div>
  );
}

function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <a href="#top" className="no-underline"><Brand /></a>
        <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-8 text-sm font-semibold text-[#45635e] md:flex">
          <a href="#books" className="transition-colors hover:text-[#a17843]">الكتابان</a>
          <a href="#offer" className="transition-colors hover:text-[#a17843]">تفاصيل الباقة</a>
          <a href="#order" className="transition-colors hover:text-[#a17843]">الطلب</a>
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
    <img src={book.coverUrl} alt={`غلاف ${book.title}`} className={`book-cover block rounded-sm bg-[#e6e4d8] object-contain ${size}`} />
  ) : (
    <div className={`cg-cover relative flex ${size} flex-col items-center justify-center overflow-hidden px-4 text-center text-[#66736d]`}>
      <Rosette className="cg-cover-rosette absolute -left-5 -top-5 size-24 opacity-25" />
      <Rosette className="cg-cover-rosette absolute -bottom-5 -right-5 size-24 opacity-25" />
      <div className="absolute inset-2 border border-[#8e9d8a]/50" />
      <span className="relative grid size-12 place-items-center rounded-full border border-[#8e9d8a]/60 bg-[#f4f3e9]/80">
        <BookOpen className="text-[#65817a]" size={23} strokeWidth={1.6} />
      </span>
      <span className="relative mt-4 max-w-28 text-xs leading-6">سيتم إضافة صورة الكتاب قريبًا</span>
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
    <section id="order" className="scroll-mt-5 bg-[#e9eee5] px-5 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="cg-eyebrow text-sm font-bold">على بُعد خطوة</p>
          <h2 className="serif-title mt-3 text-4xl leading-[1.45] text-[#294a46]">اطلب بكجك بكل سهولة</h2>
          <p className="mt-3 leading-8 text-[#536a63]">عبّي بياناتك التالية باش نأكدوا طلبك ونتواصلوا معاك.</p>
          <div className="cg-summary mt-8 rounded-2xl p-6">
            <p className="cg-eyebrow text-xs font-bold">ملخص الطلب</p>
            <p className="mt-3 font-bold text-[#304c47]">{offer.packageName}</p>
            <div className="mt-5 space-y-3 text-sm text-[#52645f]">
              <div className="flex justify-between gap-3"><span>الكمية</span><span className="font-semibold">باقة واحدة</span></div>
              <div className="flex justify-between gap-3"><span>سعر الباقة</span><span>{money(offer.price, offer.currency)}</span></div>
              <div className="flex justify-between gap-3"><span>التوصيل</span><span>مجاني</span></div>
            </div>
            <div className="mt-5 flex justify-between border-t border-[#d1d9cc] pt-4 font-extrabold text-[#294a46]">
              <span>الإجمالي</span><span className="text-[#315b56]">{money(offer.price, offer.currency)}</span>
            </div>
          </div>
        </div>
        <div className="cg-form-panel rounded-[1.75rem] p-6 md:p-9">
          {sent ? (
            <div role="status" className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <span className="grid size-16 place-items-center rounded-full bg-[#e1ecdf] text-[#315b56]"><CheckCircle2 size={34} /></span>
              <h3 className="mt-6 text-2xl font-extrabold text-[#294a46]">تم استلام طلبك بنجاح!</h3>
              <p className="mt-3 max-w-md leading-8 text-[#536a63]">هذا نموذج معاينة، ولن يُرسل أي طلب.</p>
              <button onClick={() => setSent(false)} className={`${outlineButton} mt-7`}><Plus size={16} /> إرسال طلب جديد</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-[#304c47]">الاسم الكامل</span>
                  <input autoComplete="name" placeholder="اكتب اسمك هنا" className="cg-input min-h-12 w-full rounded-xl px-4 text-right" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-[#304c47]">رقم الهاتف</span>
                  <input inputMode="tel" autoComplete="tel" dir="ltr" placeholder="09X XXX XXXX" className="cg-input min-h-12 w-full rounded-xl px-4 text-left" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-[#304c47]">المدينة</span>
                  <input autoComplete="address-level2" placeholder="اكتب مدينتك" className="cg-input min-h-12 w-full rounded-xl px-4 text-right" />
                </label>
              </div>
              <button className={`${primaryButton} mt-7 w-full`} type="submit">تأكيد الطلب <ArrowLeft size={17} /></button>
              <p className="mt-4 text-center text-xs text-[#5e716a]">بيانات الطلب تُستخدم للتواصل معك بشأن هذه الباقة فقط.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export function CalmGeometric() {
  return (
    <main id="top" dir="rtl" className="cg-root overflow-hidden bg-[#fbfaf4] text-[#294a46]">
      <style>{`
        .cg-root {
          --cg-ink: #294a46;
          --cg-muted: #536a63;
          --cg-line: #d9ded2;
          font-family: "Cairo", sans-serif;
        }
        .cg-root a { text-decoration: none; }
        .cg-root a:focus-visible, .cg-root button:focus-visible, .cg-root input:focus-visible {
          outline: 2px solid #315b56; outline-offset: 3px;
        }
        .cg-hero {
          background-color: #f1f3e9;
          background-image: radial-gradient(ellipse at 78% 46%, rgba(255,255,250,.76), transparent 48%);
        }
        .cg-brand-mark {
          border: 1px solid #bfd0c4;
          background: #fbfaf4;
          box-shadow: inset 0 0 0 4px #eef1e8;
        }
        .cg-eyebrow { color: #8a7046; }
        .cg-art-ring {
          border: 1px solid rgba(111, 140, 125, .28);
          background-image: repeating-conic-gradient(from 22.5deg, transparent 0deg 43deg, rgba(111,140,125,.08) 43deg 45deg);
          background-size: 44px 44px;
          mask-image: radial-gradient(circle, #000 40%, transparent 72%);
        }
        .cg-art-halo { background: radial-gradient(circle, #f9f8ef 0 46%, rgba(225,233,218,.62) 67%, transparent 68%); }
        .cg-cover {
          border: 1px solid #cbd4c5;
          background: linear-gradient(145deg, #f1f2e8, #e4eadf);
          box-shadow: 8px 15px 24px rgba(51, 76, 65, .13), 1px 2px 3px rgba(51,76,65,.09);
        }
        .cg-cover-rosette { stroke: #778e7c; stroke-width: 1.3; }
        .cg-summary, .cg-form-panel {
          border: 1px solid #d0d9ce;
          background: #fbfaf4;
          box-shadow: 0 12px 32px rgba(43,73,65,.045);
        }
        .cg-input {
          border: 1px solid #cbd5c9;
          background: #fffef9;
          color: #294a46;
          transition: border-color .2s, box-shadow .2s;
        }
        .cg-input::placeholder { color: #829088; }
        .cg-input:focus { border-color: #6e9386; box-shadow: 0 0 0 3px rgba(110,147,134,.15); outline: none; }
        @media (prefers-reduced-motion: reduce) {
          .cg-root *, .cg-root *::before, .cg-root *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }
      `}</style>
      <section className="cg-hero paper-grain relative min-h-[760px]">
        <Header />
        <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-8 px-5 pb-16 pt-32 md:grid-cols-[1fr_1.02fr] md:px-10 md:pt-28">
          <div className="reveal relative z-10 max-w-[620px]">
            <p className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8a7046]"><span className="h-px w-9 bg-[#b3a27b]" /> من مكتبة التراث الإسلامي</p>
            <h1 className="serif-title max-w-xl text-[clamp(2.65rem,6vw,5.1rem)] leading-[1.38] text-[#294a46]">{offer.title}</h1>
            <p className="mt-5 max-w-lg text-lg leading-9 text-[#536a63]">{offer.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="flex items-baseline gap-2 text-[#315b56]"><strong className="text-4xl font-extrabold">{money(offer.price, offer.currency)}</strong><span className="text-sm text-[#66766d]">للباقة كاملة</span></p>
              <span className="flex items-center gap-2 text-sm text-[#526b61]"><Truck size={18} className="text-[#9a8052]" /> التوصيل مجاني لجميع المدن الليبية</span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a className={`${primaryButton} min-h-14 px-8`} href="#order">{offer.ctaText}<ArrowLeft size={18} /></a>
              <a href="#books" className="inline-flex items-center gap-2 px-3 py-3 text-sm font-bold text-[#45635e]">اكتشف الكتابين <ChevronLeft size={17} /></a>
            </div>
          </div>
          <div className="reveal-delay relative flex min-h-[410px] items-center justify-center md:min-h-[600px]">
            <div className="cg-art-ring absolute size-[390px] rounded-full md:size-[540px]" />
            <div className="cg-art-halo absolute size-[330px] rounded-full md:size-[450px]" />
            <Rosette className="absolute right-[8%] top-[14%] size-16 opacity-55 md:size-20" />
            <Rosette className="absolute bottom-[11%] left-[9%] size-12 opacity-40 md:size-16" />
            <div className="absolute bottom-[11%] h-14 w-[82%] rounded-[50%] bg-[#617d6d]/10 blur-xl" />
            <div className="relative flex items-center gap-4 sm:gap-8">
              {offer.books.map((book, index) => <div key={book.id} className={`${index === 0 ? "mt-11 rotate-[-3deg]" : "-mt-9 rotate-[3deg]"} transition-transform duration-500 hover:-translate-y-2`}><Cover book={book} /></div>)}
            </div>
            <div className="absolute bottom-0 left-4 rounded-full border border-[#d0d9ce] bg-[#fbfaf4]/90 px-5 py-2 text-xs font-semibold text-[#586f66]">كتابان في باقة واحدة</div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-[#d7dfd2]" />
      </section>
      <section id="books" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
        <div className="mb-14 max-w-xl">
          <p className="cg-eyebrow text-sm font-bold tracking-wide">مكتبة مختارة</p>
          <h2 className="serif-title mt-3 text-4xl text-[#294a46] md:text-5xl">كتابان يفتحان بابين للمعرفة</h2>
          <p className="mt-4 leading-8 text-[#61736a]">لكل كتاب طريقته في إضاءة المعنى، وبين صفحاتهما مساحة للتأمل والتعلّم.</p>
        </div>
        <div className="divide-y divide-[#d9ded2] border-y border-[#d9ded2]">
          {offer.books.map((book, i) => (
            <article key={book.id} className="grid items-center gap-7 py-10 sm:grid-cols-[190px_1fr] md:gap-14 md:py-14">
              <div className="mx-auto"><Cover book={book} compact /></div>
              <div className="max-w-2xl">
                <span className="text-xs font-semibold tracking-[.2em] text-[#8a7046]">٠{i + 1} / من الباقة</span>
                <h3 className="serif-title mt-3 text-3xl text-[#294a46]">{book.title}</h3>
                <p className="mt-2 font-semibold text-[#8a7046]">{book.author}</p>
                <p className="mt-4 text-base leading-8 text-[#5e7068]">{book.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-[#e9eee5] px-5 py-20 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[.8fr_1.2fr] md:px-5">
          <div><p className="cg-eyebrow text-sm font-bold">قيمة في باقة</p><h2 className="serif-title mt-3 text-4xl leading-[1.5] text-[#294a46]">المعرفة تكبر<br />حين تجتمع.</h2></div>
          <div className="grid gap-4 sm:grid-cols-3">
            {offer.benefits.map((benefit, i) => (
              <div key={`${benefit}-${i}`} className="border-t border-[#cbd5c9] pt-5">
                <span className="grid size-10 place-items-center rounded-full bg-[#fbfaf4] text-[#8a7046]">{i === 0 ? <BookOpen size={19} /> : i === 1 ? <CircleDollarSign size={19} /> : <Truck size={19} />}</span>
                <p className="mt-4 font-bold leading-7 text-[#35544d]">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="offer" className="scroll-mt-10 px-5 py-24 md:py-32">
        <div className="cg-offer relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-7 py-12 text-[#f8f8ed] md:px-14 md:py-16">
          <div className="pointer-events-none absolute -left-14 -top-20 size-72 rounded-full border border-[#d4c38f]/25" />
          <div className="pointer-events-none absolute left-0 top-0 size-52 rounded-full border border-[#d4c38f]/20" />
          <Rosette className="pointer-events-none absolute -bottom-8 right-[37%] size-40 opacity-[.12]" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold text-[#e3d2a4]">باقة واحدة · كتابان</p>
              <h2 className="serif-title mt-3 text-3xl leading-[1.5] md:text-4xl">كتابان.. معرفة تنفعك وأثر يبقى معاك.</h2>
              <p className="mt-3 max-w-xl leading-8 text-[#e0e9de]">{offer.closingText}</p>
              <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#e0e9de]">{offer.books.map((book) => <li key={book.id} className="flex items-center gap-2"><Check size={15} className="text-[#e3d2a4" />{book.title}</li>)}</ul>
            </div>
            <div className="min-w-52 border-r border-[#d7d8c4]/40 pr-7">
              <p className="text-xs text-[#dce3d8]">السعر النهائي</p>
              <p className="mt-1 text-4xl font-extrabold text-[#e7d49c]">{money(offer.price, offer.currency)}</p>
              <p className="mt-3 text-sm">التوصيل مجاني</p>
              <a href="#order" className={`${button} mt-6 bg-[#e7d49c] text-[#294a46] hover:bg-[#f0e2b8]`}>اطلب الباقة الآن<ArrowLeft size={16} /></a>
            </div>
          </div>
        </div>
      </section>
      <OrderForm />
      <section className="px-5 pb-24">
        <div className="mx-auto max-w-6xl border-y border-[#d9ded2] py-16 text-center">
          <Rosette className="mx-auto size-8 stroke-[#8a7046] stroke-[1.5]" />
          <h2 className="serif-title mt-4 text-3xl text-[#294a46] md:text-4xl">كتابان.. معرفة تنفعك وأثر يبقى معاك.</h2>
          <p className="mt-3 text-[#61736a]">اضغط على اطلب الآن وعبّي بياناتك باش تأكد طلبك.</p>
          <a href="#order" className={`${primaryButton} mt-7`}>اطلب الآن<ArrowLeft size={16} /></a>
        </div>
      </section>
      <footer className="border-t border-[#d9ded2] bg-[#f0f2e9] px-5 py-7">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right">
          <Brand />
          <p className="text-xs text-[#61736a]">صفحات تُقرأ، ومعرفة تبقى.</p>
        </div>
      </footer>
      <style>{`
        .cg-offer { background: linear-gradient(115deg, #315b56, #284c49); }
        @media (max-width: 767px) {
          .cg-root #order { scroll-margin-top: 12px; }
        }
      `}</style>
    </main>
  );
}
