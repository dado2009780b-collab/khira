import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  useCreateOrder, useGetOffer, getGetOfferQueryKey, useGetAdminOverview,
  getGetAdminOverviewQueryKey, useListAdminOrders, getListAdminOrdersQueryKey,
  useGetAdminOrder, getGetAdminOrderQueryKey, useUpdateAdminOrder,
  useUpdateOffer, useDeleteBookCover,
  useExportAdminOrders, getExportAdminOrdersQueryKey,
  useGetAdminSession, getGetAdminSessionQueryKey, useLoginAdmin, useLogoutAdmin,
  useChangeAdminPassword,
} from '@workspace/api-client-react';
import type { AdminOrder, AdminOverview, Offer, OrderStatus } from '@workspace/api-client-react';
import { Route, Switch, Router as WouterRouter, Link, useLocation } from 'wouter';
import {
  ArrowLeft, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronLeft,
  ChevronRight, CircleDollarSign, Clock3, Copy, FileDown, House, ImagePlus,
  KeyRound, LoaderCircle, LogOut, Menu, PackageCheck, Plus, RefreshCw, Search, ShieldAlert,
  ShoppingBag, Sparkles, Truck, Upload, Users, X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const statusNames: Record<string, string> = {
  new: 'جديد', contacted: 'تم التواصل', confirmed: 'تم التأكيد', preparing: 'قيد التجهيز',
  shipped: 'تم الشحن', completed: 'مكتمل', cancelled: 'ملغي',
};
const statusList: OrderStatus[] = ['new', 'contacted', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'];
const money = (amount: number, currency = 'د.ل') => `${new Intl.NumberFormat('ar-LY').format(amount)} ${currency}`;
const dateText = (date: string) => new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
const messageFromError = (error: unknown, fallback: string) => {
  const e = error as { message?: string; data?: { error?: string }; response?: { data?: { error?: string } } };
  return e?.data?.error || e?.response?.data?.error || e?.message || fallback;
};
function adminErrorDetails(error: unknown) {
  const e = error as {
    data?: { error?: string; help?: string; missing?: unknown };
    response?: { data?: { error?: string; help?: string; missing?: unknown } };
  };
  const data = e?.data ?? e?.response?.data;
  return {
    message: data?.error || messageFromError(error, 'تعذر التحقق من جلسة الإدارة.'),
    help: data?.help,
    missing: Array.isArray(data?.missing)
      ? data.missing.filter((value): value is string => typeof value === 'string')
      : [],
  };
}
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 font-bold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55';
const primaryButton = `${button} bg-[#315b56] text-[#fffaf0] hover:bg-[#244945]`;
const outlineButton = `${button} border border-[#c7cbb9] bg-[#fbfaf4] text-[#315b56] hover:bg-[#eef0e6]`;

function Brand({ dark = false }: { dark?: boolean }) {
  return <div className={`flex items-center gap-2 sm:gap-3 ${dark ? 'text-[#f5f0e4]' : 'text-[#315b56]'}`} dir="rtl">
    <span className={`grid size-11 place-items-center rounded-full ${dark ? 'border border-current/25' : 'bundle-brand-mark'}`}><BookOpen size={20} strokeWidth={1.7}/></span>
    <span><span className="block text-[15px] font-extrabold leading-tight sm:text-lg">باقة الكتب الإسلامية</span><span className="hidden text-[10px] tracking-[.16em] opacity-75 sm:block">كتابان · قراءة ومعرفة</span></span>
  </div>;
}
function Header() {
  return <header className="absolute inset-x-0 top-0 z-20">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
      <a href="#top" className="no-underline"><Brand/></a>
      <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-8 text-sm font-semibold text-[#45635e] md:flex">
        <a href="#books" className="transition-colors hover:text-[#a17843]">الكتابان</a><a href="#offer" className="transition-colors hover:text-[#a17843]">تفاصيل الباقة</a>
        <a href="#order" className="transition-colors hover:text-[#a17843]">الطلب</a>
      </nav>
      <a className={`${primaryButton} min-h-10 px-5 text-sm`} href="#order">اطلب الآن <ArrowLeft size={16}/></a>
    </div>
  </header>;
}
function Rosette({ className = '' }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 100 100" fill="none" className={className}>
    <path d="M50 3 60 21 79 12 77 33 98 38 83 52 96 69 75 72 73 94 55 82 42 98 34 78 12 84 19 63 2 51 21 40 12 20 34 23Z"/>
    <circle cx="50" cy="50" r="22"/>
    <path d="M50 36 64 50 50 64 36 50 50 36Z"/>
  </svg>;
}
function Cover({ book, compact = false }: { book: Offer['books'][number]; compact?: boolean }) {
  return book.coverUrl ? <img src={book.coverUrl} alt={`غلاف ${book.title}`} className={`book-cover block object-contain ${compact ? 'h-52 w-36' : 'h-64 w-44'} rounded-sm bg-[#e6e4d8]`} /> :
    <div className={`bundle-cover relative flex ${compact ? 'h-52 w-36' : 'h-64 w-44'} flex-col items-center justify-center overflow-hidden px-4 text-center text-[#66736d]`}>
      <Rosette className="bundle-cover-rosette absolute -left-5 -top-5 size-24 opacity-25"/>
      <Rosette className="bundle-cover-rosette absolute -bottom-5 -right-5 size-24 opacity-25"/>
      <div className="absolute inset-2 border border-[#8e9d8a]/50"/>
      <span className="relative grid size-12 place-items-center rounded-full border border-[#8e9d8a]/60 bg-[#f4f3e9]/80"><BookOpen className="text-[#65817a]" size={23} strokeWidth={1.6}/></span>
      <span className="relative mt-4 max-w-28 text-xs leading-6">سيتم إضافة صورة الكتاب قريبًا</span>
    </div>;
}
function LoadingState({ label = 'جارٍ تحميل المعلومات…' }: { label?: string }) {
  return <div role="status" className="flex min-h-52 flex-col items-center justify-center gap-4 text-[#687567]">
    <div className="w-64 space-y-3"><div className="h-3 animate-pulse rounded-full bg-[#e5ddce]"/><div className="h-3 w-4/5 animate-pulse rounded-full bg-[#e5ddce]"/><div className="h-3 w-2/3 animate-pulse rounded-full bg-[#e5ddce]"/></div><span>{label}</span>
  </div>;
}
function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  const details = adminErrorDetails(error);
  return <div className="mx-auto my-12 max-w-xl rounded-2xl border border-[#ddc8bb] bg-[#fbf5ef] p-8 text-center text-[#594439]" role="alert">
    <p className="font-bold">تعذّر تحميل تفاصيل العرض الآن.</p><p className="mt-2 text-sm">{details.message}</p>{details.help && <p className="mt-2 text-sm leading-6">{details.help}</p>}<button onClick={retry} className={`${outlineButton} mt-5`}><RefreshCw size={16}/> إعادة المحاولة</button>
  </div>;
}
function Home() {
  const query = useGetOffer({
    query: {
      queryKey: getGetOfferQueryKey(),
      retry: 2,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  });
  if (query.isError) return <PublicError error={query.error} retry={() => void query.refetch()}/>;
  if (!query.data) return <LoadingState label="جارٍ تحميل تفاصيل العرض…"/>;
  const offer = query.data;

  return <main id="top" dir="rtl" className="bundle-storefront overflow-hidden bg-[#fbfaf4] text-[#294a46]">
    <section className="bundle-hero paper-grain relative min-h-[760px]">
      <Header/>
      <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-10 px-5 pb-16 pt-32 md:grid-cols-[1fr_1.02fr] md:px-10 md:pt-28">
        <div className="relative z-10 max-w-[620px] reveal order-2 md:order-1">
          <p className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8a7046]"><span className="h-px w-9 bg-[#b3a27b]"/> من مكتبة التراث الإسلامي</p>
          <h1 className="serif-title max-w-xl text-[clamp(2.65rem,6vw,5.1rem)] leading-[1.38] text-[#294a46]">{offer.title.replace(/\s*📚/u, '')}</h1>
          <p className="mt-5 max-w-lg text-lg leading-9 text-[#536a63]">{offer.description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <p className="flex items-baseline gap-2 text-[#315b56]"><strong className="text-4xl font-extrabold">{money(offer.price, offer.currency)}</strong><span className="text-sm text-[#66766d]">للباقة كاملة</span></p>
            <span className="flex items-center gap-2 text-sm text-[#526b61]"><Truck size={18} className="text-[#9a8052]"/> {offer.deliveryFee === 0 ? 'التوصيل مجاني لجميع المدن الليبية' : `التوصيل ${money(offer.deliveryFee, offer.currency)}`}</span>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4"><a className={`${primaryButton} min-h-14 px-8`} href="#order">{offer.ctaText || 'اطلب الآن'}<ArrowLeft size={18}/></a><a href="#books" className="inline-flex items-center gap-2 px-3 py-3 text-sm font-bold text-[#45635e]">اكتشف الكتابين <ChevronLeft size={17}/></a></div>
        </div>
        <div className="reveal-delay relative flex min-h-[410px] items-center justify-center md:min-h-[600px] order-1 md:order-2">
          <div className="bundle-art-ring absolute size-[390px] rounded-full md:size-[540px]"/>
          <div className="bundle-art-halo absolute size-[330px] rounded-full md:size-[450px]"/>
          <Rosette className="bundle-hero-rosette absolute right-[8%] top-[14%] size-16 opacity-55 md:size-20"/>
          <Rosette className="bundle-hero-rosette absolute bottom-[11%] left-[9%] size-12 opacity-40 md:size-16"/>
          <div className="absolute bottom-[11%] h-14 w-[82%] rounded-[50%] bg-[#617d6d]/10 blur-xl"/>
          <div className="relative flex items-center gap-4 sm:gap-8">
            {offer.books.map((book, index) => <div key={book.id} className={`${index === 0 ? 'mt-11 rotate-[-3deg]' : '-mt-9 rotate-[3deg]'} transition-transform duration-500 hover:-translate-y-2`}><Cover book={book}/></div>)}
          </div>
          <div className="absolute bottom-0 left-4 rounded-full border border-[#d0d9ce] bg-[#fbfaf4]/90 px-5 py-2 text-xs font-semibold text-[#586f66]">كتابان في باقة واحدة</div>
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-px bg-[#d7dfd2]"/>
    </section>
    <section id="books" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
      <div className="mb-14 max-w-xl"><p className="bundle-eyebrow text-sm font-bold tracking-wide">مكتبة مختارة</p><h2 className="serif-title mt-3 text-4xl text-[#294a46] md:text-5xl">كتابان يفتحان بابين للمعرفة</h2><p className="mt-4 leading-8 text-[#61736a]">لكل كتاب طريقته في إضاءة المعنى، وبين صفحاتهما مساحة للتأمل والتعلّم.</p></div>
      <div className="divide-y divide-[#d9ded2] border-y border-[#d9ded2]">
        {offer.books.map((book, i) => <article key={book.id} className="grid items-center gap-7 py-10 sm:grid-cols-[190px_1fr] md:gap-14 md:py-14">
          <div className="mx-auto"><Cover book={book} compact={true}/></div><div className="max-w-2xl">
            <span className="text-xs font-semibold tracking-[.2em] text-[#8a7046]">٠{i + 1} / من الباقة</span><h3 className="serif-title mt-3 text-3xl text-[#294a46]">{book.title}</h3>
            <p className="mt-2 font-semibold text-[#8a7046]">{book.author}</p><p className="mt-4 text-base leading-8 text-[#5e7068]">{book.description}</p>
          </div>
        </article>)}
      </div>
    </section>
    <section className="bg-[#e9eee5] px-5 py-20 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[.8fr_1.2fr] md:px-5">
        <div><p className="bundle-eyebrow text-sm font-bold">قيمة في باقة</p><h2 className="serif-title mt-3 text-4xl leading-[1.5] text-[#294a46]">المعرفة تكبر<br/>حين تجتمع.</h2></div>
        <div className="grid gap-4 sm:grid-cols-3">
          {(offer.benefits || []).map((benefit, i) => <div key={`${benefit}-${i}`} className="border-t border-[#cbd5c9] pt-5">
            <span className="grid size-10 place-items-center rounded-full bg-[#fbfaf4] text-[#8a7046]">{i === 0 ? <BookOpen size={19}/> : i === 1 ? <CircleDollarSign size={19}/> : <Truck size={19}/>}</span>
            <p className="mt-4 font-bold leading-7 text-[#35544d]">{benefit}</p>
          </div>)}
        </div>
      </div>
    </section>
    <section id="offer" className="scroll-mt-10 px-5 py-24 md:py-32">
      <div className="bundle-offer relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-7 py-12 text-[#f8f8ed] md:px-14 md:py-16">
        <div className="pointer-events-none absolute -left-14 -top-20 size-72 rounded-full border border-[#d4c38f]/25"/><div className="pointer-events-none absolute left-0 top-0 size-52 rounded-full border border-[#d4c38f]/20"/>
        <Rosette className="pointer-events-none absolute -bottom-8 right-[37%] size-40 opacity-[.12]"/>
        <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
          <div><p className="text-sm font-semibold text-[#e3d2a4]">باقة واحدة · كتابان</p><h2 className="serif-title mt-3 text-3xl leading-[1.5] md:text-4xl">كتابان.. معرفة تنفعك وأثر يبقى معاك.</h2>
            <p className="mt-3 max-w-xl leading-8 text-[#e0e9de]">{offer.closingText}</p>
            <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#e0e9de]">{offer.books.map(b => <li key={b.id} className="flex items-center gap-2"><Check size={15} className="text-[#e3d2a4]"/>{b.title}</li>)}</ul>
          </div>
          <div className="min-w-52 border-r border-[#d7d8c4]/40 pr-7"><p className="text-xs text-[#dce3d8]">السعر النهائي</p><p className="mt-1 text-4xl font-extrabold text-[#e7d49c]">{money(offer.price, offer.currency)}</p><p className="mt-3 text-sm">{offer.deliveryFee === 0 ? 'التوصيل مجاني' : `التوصيل ${money(offer.deliveryFee, offer.currency)}`}</p><a href="#order" className={`${button} mt-6 bg-[#e7d49c] text-[#294a46] hover:bg-[#f0e2b8]`}>اطلب الباقة الآن<ArrowLeft size={16}/></a></div>
        </div>
      </div>
    </section>
    <OrderForm offer={offer}/>
    <section className="px-5 pb-24"><div className="mx-auto max-w-6xl border-y border-[#d9ded2] py-16 text-center">
      <Rosette className="mx-auto size-8 stroke-[#8a7046] stroke-[1.5]"/><h2 className="serif-title mt-4 text-3xl text-[#294a46] md:text-4xl">كتابان.. معرفة تنفعك وأثر يبقى معاك.</h2>
      <p className="mt-3 text-[#61736a]">اضغط على اطلب الآن وعبّي بياناتك باش تأكد طلبك.</p><a href="#order" className={`${primaryButton} mt-7`}>اطلب الآن<ArrowLeft size={16}/></a>
    </div></section>
    <footer className="border-t border-[#d9ded2] bg-[#f0f2e9] px-5 py-7"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right"><Brand/><p className="text-xs text-[#61736a]">صفحات تُقرأ، ومعرفة تبقى.</p></div></footer>
  </main>;
}
function OrderForm({ offer }: { offer: Offer }) {
  const create = useCreateOrder();
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [city, setCity] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({}); const [receipt, setReceipt] = useState<{ orderNumber: string; totalAmount: number; currency: string } | null>(null); const [failure, setFailure] = useState('');
  const cleanPhone = phone.replace(/[\s()-]/g, '');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'اكتب الاسم الكامل بشكل صحيح.';
    if (!/^(?:\+?218|00218)?(?:0)?9[1-6]\d{7}$/.test(cleanPhone.replace(/^\+?218/, '').replace(/^00218/, '').replace(/^0(?=9)/, ''))) next.phone = 'تحقق من رقم الهاتف، ويمكن كتابته بالمفتاح الدولي أو بدونه.';
    if (city.trim().length < 2) next.city = 'اكتب اسم المدينة.';
    setErrors(next); if (Object.keys(next).length) return;
    setFailure('');
    create.mutate({ data: { customerName: name.trim(), phone: phone.trim(), city: city.trim() } }, {
      onSuccess: r => { setReceipt({ orderNumber: r.orderNumber, totalAmount: r.totalAmount, currency: r.currency }); setName(''); setPhone(''); setCity(''); },
      onError: error => setFailure(messageFromError(error, 'لم نتمكن من حفظ الطلب الآن. حاول الإرسال مرة أخرى.'))
    });
  };
  return <section id="order" className="scroll-mt-5 bg-[#e9eee5] px-5 py-20 md:py-28">
    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
      <div><p className="bundle-eyebrow text-sm font-bold">على بُعد خطوة</p><h2 className="serif-title mt-3 text-4xl leading-[1.45] text-[#294a46]">اطلب بكجك بكل سهولة</h2><p className="mt-3 leading-8 text-[#536a63]">عبّي بياناتك التالية باش نأكدوا طلبك ونتواصلوا معاك.</p>
        <div className="bundle-summary mt-8 rounded-2xl p-6">
          <p className="bundle-eyebrow text-xs font-bold">ملخص الطلب</p><p className="mt-3 font-bold text-[#304c47]">{offer.packageName}</p><div className="mt-5 space-y-3 text-sm text-[#52645f]"><div className="flex justify-between gap-3"><span>الكمية</span><span className="font-semibold">باقة واحدة</span></div><div className="flex justify-between gap-3"><span>سعر الباقة</span><span>{money(offer.price, offer.currency)}</span></div><div className="flex justify-between gap-3"><span>التوصيل</span><span>{offer.deliveryFee === 0 ? 'مجاني' : money(offer.deliveryFee, offer.currency)}</span></div></div><div className="mt-5 flex justify-between border-t border-[#d1d9cc] pt-4 font-extrabold text-[#294a46]"><span>الإجمالي</span><span className="text-[#315b56]">{money(offer.price + offer.deliveryFee, offer.currency)}</span></div>
        </div>
      </div>
      <div className="bundle-form-panel rounded-[1.75rem] p-6 md:p-9">
        {receipt ? <div role="status" className="flex min-h-[420px] flex-col items-center justify-center text-center">
          <span className="grid size-16 place-items-center rounded-full bg-[#e1ecdf] text-[#315b56]"><CheckCircle2 size={34}/></span><h3 className="mt-6 text-2xl font-extrabold text-[#294a46]">تم استلام طلبك بنجاح!</h3>
          <p className="mt-3 max-w-md leading-8 text-[#536a63]">رقم طلبك هو <bdi className="font-bold text-[#315b56]">{receipt.orderNumber}</bdi>. سنتواصل معاك لتأكيد التفاصيل.</p><p className="mt-3 font-bold">{money(receipt.totalAmount, receipt.currency)}</p>
          <button onClick={() => { setReceipt(null); setFailure(''); }} className={`${outlineButton} mt-7`}><Plus size={16}/> إرسال طلب جديد</button>
        </div> : <form onSubmit={submit} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold text-[#304c47]">الاسم الكامل</span><input data-testid="input-customer-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك هنا" className="bundle-input min-h-12 w-full rounded-xl px-4 text-right" aria-invalid={!!errors.name}/>{errors.name && <span className="mt-1 block text-sm text-red-800">{errors.name}</span>}</label>
            <label><span className="mb-2 block text-sm font-bold text-[#304c47]">رقم الهاتف</span><input data-testid="input-customer-phone" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09X XXX XXXX" className="bundle-input min-h-12 w-full rounded-xl px-4 text-left" aria-invalid={!!errors.phone}/>{errors.phone && <span className="mt-1 block text-sm text-red-800">{errors.phone}</span>}</label>
            <label><span className="mb-2 block text-sm font-bold text-[#304c47]">المدينة</span><input data-testid="input-customer-city" autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} placeholder="اكتب مدينتك" className="bundle-input min-h-12 w-full rounded-xl px-4 text-right" aria-invalid={!!errors.city}/>{errors.city && <span className="mt-1 block text-sm text-red-800">{errors.city}</span>}</label>
          </div>
          {failure && <p role="alert" className="mt-5 rounded-xl border border-[#dfc3b4] bg-[#fbefea] p-3 text-sm text-[#744638]">{failure}</p>}
          <button data-testid="button-submit-order" disabled={create.isPending} className={`${primaryButton} mt-7 w-full`} type="submit">{create.isPending ? <><LoaderCircle size={17} className="animate-spin"/> جارٍ إرسال الطلب…</> : <>تأكيد الطلب<ArrowLeft size={17}/></>}</button>
          <p className="mt-4 text-center text-xs text-[#5e716a]">بيانات الطلب تُستخدم للتواصل معك بشأن هذه الباقة فقط.</p>
        </form>}
      </div>
    </div>
  </section>;
}

function AdminPasswordLogin({ onLogin }: { onLogin: () => void }) {
  const login = useLoginAdmin();
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailure('');
    login.mutate({ data: { password } }, {
      onSuccess: () => { setPassword(''); onLogin(); },
      onError: error => setFailure(messageFromError(error, 'تعذر تسجيل الدخول. تحقق من كلمة المرور وحاول مجددًا.')),
    });
  };
  return <main dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[#f4f0e6] p-5">
    <section className="w-full max-w-md rounded-3xl border border-[#d8ceba] bg-[#fbf7ed] p-8 text-center shadow-lg md:p-10">
      <Brand/>
      <span className="mx-auto mt-9 grid size-14 place-items-center rounded-full bg-[#e8dfcc] text-[#7f6a3c]"><KeyRound size={23}/></span>
      <h1 className="mt-5 text-2xl font-extrabold">دخول الإدارة</h1>
      <p className="mt-2 leading-7 text-[#677064]">أدخل كلمة المرور للوصول إلى الطلبات ومحتوى العرض.</p>
      <form onSubmit={submit} className="mt-7 text-right">
        <label className="block text-sm font-bold" htmlFor="admin-password">كلمة المرور</label>
        <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#d2c8b5] bg-[#fffdf7] px-4" required/>
        {failure && <p role="alert" className="mt-3 rounded-xl bg-[#fbefea] p-3 text-sm text-[#744638]">{failure}</p>}
        <button type="submit" disabled={!password || login.isPending} className={`${primaryButton} mt-5 w-full`}>
          {login.isPending ? <><LoaderCircle size={17} className="animate-spin"/> جارٍ التحقق…</> : <>دخول<ArrowLeft size={17}/></>}
        </button>
      </form>
      <Link href="/" className="mt-5 block text-sm text-[#566851]">العودة إلى صفحة الباقة</Link>
    </section>
  </main>;
}

function AdminGate() {
  const session = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey(), retry: false } });
  const client = useQueryClient();
  const overview = useGetAdminOverview({
    query: {
      queryKey: getGetAdminOverviewQueryKey(),
      enabled: session.data?.authenticated === true,
      retry: false,
    },
  });
  if (session.isLoading) return <div dir="rtl" className="min-h-[100dvh] bg-[#f4f0e6]"><LoadingState label="جارٍ التحقق من جلسة الإدارة…"/></div>;
  if (session.isError) {
    const details = adminErrorDetails(session.error);
    return <div dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[#f4f0e6] p-5"><div role="alert" className="max-w-lg rounded-3xl border border-[#d9c9b8] bg-[#fbf6ee] p-9 text-center"><ShieldAlert className="mx-auto text-[#946747]" size={36}/><h1 className="mt-4 text-2xl font-extrabold">تعذر الاتصال بخدمة الإدارة</h1><p className="mt-2 leading-7 text-[#656e62]">{details.message}</p>{details.missing.length > 0 && <p className="mt-2 text-sm text-[#656e62]">الإعدادات الناقصة: {details.missing.join('، ')}</p>}<p className="mt-2 text-sm leading-6 text-[#656e62]">{details.help || 'افحص حالة قاعدة البيانات من /api/health وسجلات Pages Functions في Cloudflare.'}</p><button onClick={() => void session.refetch()} className={`${outlineButton} mt-6`}><RefreshCw size={15}/>إعادة المحاولة</button></div></div>;
  }
  if (!session.data?.configured) return <div dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[#f4f0e6] p-5"><div role="alert" className="max-w-md rounded-3xl border border-[#d8ceba] bg-[#fbf7ed] p-9 text-center"><ShieldAlert className="mx-auto text-[#9b814d]" size={35}/><h1 className="mt-4 text-2xl font-extrabold">دخول الإدارة غير مهيّأ بعد</h1><p className="mt-2 leading-7 text-[#677064]">لم تُضبط كلمة مرور الإدارة لهذا الموقع بعد.</p><Link href="/" className={`${primaryButton} mt-6`}>العودة إلى الصفحة العامة</Link></div></div>;
  if (!session.data.authenticated) return <AdminPasswordLogin onLogin={() => {
    void client.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
    void client.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
  }}/>;
  if (overview.isLoading || !overview.data) return <div dir="rtl" className="min-h-[100dvh] bg-[#f4f0e6]"><LoadingState label="جارٍ تحميل بيانات لوحة الإدارة…"/></div>;
  if (overview.isError) return <div dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[#f4f0e6] p-5"><div role="alert" className="max-w-lg rounded-3xl border border-[#d9c9b8] bg-[#fbf6ee] p-9 text-center"><ShieldAlert className="mx-auto text-[#946747]" size={36}/><h1 className="mt-4 text-2xl font-extrabold">تعذر تحميل بيانات الإدارة</h1><p className="mt-2 leading-7 text-[#656e62]">{messageFromError(overview.error, 'تعذر تحميل بيانات الإدارة.')}</p><p className="mt-2 text-sm leading-6 text-[#656e62]">افحص /api/health وسجلات Pages Functions في Cloudflare.</p><button onClick={() => void overview.refetch()} className={`${outlineButton} mt-6`}><RefreshCw size={15}/>إعادة المحاولة</button></div></div>;
  return <AdminWorkspace overview={overview.data}/>;
}

function AdminWorkspace({ overview }: { overview: AdminOverview }) {
  const [section, setSection] = useState<'overview'|'orders'|'customers'|'content'|'security'>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = useLogoutAdmin();
  const client = useQueryClient();
  const [location] = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location]);
  const handleLogout = () => logout.mutate(undefined, {
    onSuccess: () => { client.clear(); window.location.assign(basePath || '/'); },
  });
  const menu = <><Brand dark/><div className="mt-12 space-y-2">
    {[['overview','الرئيسية والإحصائيات',House],['orders','إدارة الطلبات',ShoppingBag],['customers','العملاء',Users],['content','إدارة محتوى العرض',BookOpen]].map(([key,label,Icon]) => {
      const IconComponent = Icon as typeof House;
      return <button key={key as string} onClick={() => setSection(key as typeof section)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm font-semibold transition ${section === key ? 'bg-[#e0c57c] text-[#203c31]' : 'text-[#e5dfd0] hover:bg-white/10'}`}><IconComponent size={18}/>{label as string}</button>;
    })}
    <a href="#content" onClick={() => setSection('content')} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#e5dfd0] hover:bg-white/10"><ImagePlus size={18}/>إدارة صور الكتب</a>
    <button onClick={() => setSection('security')} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm font-semibold transition ${section === 'security' ? 'bg-[#e0c57c] text-[#203c31]' : 'text-[#e5dfd0] hover:bg-white/10'}`}><KeyRound size={18}/>تغيير كلمة المرور</button>
  </div><div className="mt-auto pt-10"><Link href="/" className="block rounded-xl px-4 py-3 text-sm text-[#ded8ca] hover:bg-white/10">← العودة للموقع</Link><button disabled={logout.isPending} onClick={handleLogout} className="mt-2 flex w-full items-center gap-2 rounded-xl px-4 py-3 text-right text-sm text-[#ded8ca] hover:bg-white/10 disabled:opacity-50"><LogOut size={16}/>{logout.isPending ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج'}</button></div></>;
  return <div dir="rtl" className="admin-shell min-h-[100dvh]">
    {mobileOpen && <button aria-label="إغلاق القائمة" className="fixed inset-0 z-30 bg-[#13251d]/50 md:hidden" onClick={() => setMobileOpen(false)}/>}
    <aside className={`admin-sidebar fixed inset-y-0 right-0 z-40 flex w-[280px] flex-col p-6 transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>{menu}</aside>
    <div className="md:mr-[280px]">
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#ddd3c1] bg-[#f4f0e6]/95 px-5 backdrop-blur md:px-9">
        <button className="grid size-10 place-items-center rounded-lg border border-[#d9d0be] md:hidden" aria-label="فتح القائمة" onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
        <div className="mr-3 md:mr-0"><p className="text-xs text-[#8b7954]">لوحة الإدارة</p><h1 className="text-lg font-extrabold">{section === 'overview' ? 'نظرة عامة' : section === 'orders' ? 'الطلبات' : section === 'customers' ? 'العملاء' : section === 'security' ? 'كلمة المرور' : 'محتوى العرض والأغلفة'}</h1></div>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#49614e]">عرض الموقع<ArrowUpRight size={16}/></Link>
      </header>
      <div className="p-4 md:p-9">{section === 'overview' ? <OverviewPanel data={overview} onOrders={() => setSection('orders')}/> : section === 'orders' ? <OrdersPanel/> : section === 'customers' ? <CustomersPanel/> : section === 'content' ? <ContentPanel/> : <AdminPasswordPanel/>}</div>
    </div>
  </div>;
}

type CustomerRow = { id: number; name: string; phone: string; city: string; updatedAt: string; orderCount: number };
type CustomerOrder = { id: number; orderNumber: string; productName: string; totalAmount: number; status: OrderStatus; createdAt: string };

function CustomersPanel() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [selected, setSelected] = useState<{ customer: CustomerRow; orders: CustomerOrder[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    void fetch(`${basePath}/api/admin/customers${query}`, { credentials: 'include' })
      .then(async response => {
        if (!response.ok) throw new Error('تعذّر تحميل قائمة العملاء.');
        return response.json() as Promise<CustomerRow[]>;
      })
      .then(rows => { if (active) setCustomers(rows); })
      .catch(() => { if (active) setError('تعذّر تحميل قائمة العملاء.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search]);
  const openCustomer = async (customer: CustomerRow) => {
    setError('');
    try {
      const response = await fetch(`${basePath}/api/admin/customers/${customer.id}`, { credentials: 'include' });
      if (!response.ok) throw new Error();
      setSelected(await response.json() as { customer: CustomerRow; orders: CustomerOrder[] });
    } catch { setError('تعذّر تحميل تفاصيل العميل.'); }
  };
  return <section>
    <div className="mb-6"><h2 className="text-2xl font-extrabold">العملاء</h2><p className="mt-1 text-sm text-[#6d7369]">ملفات العملاء وعدد طلباتهم المسجلة.</p></div>
    <div className="mb-5 max-w-lg"><label className="relative block"><Search className="absolute right-3 top-3.5 text-[#858575]" size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الهاتف أو المدينة" className="h-12 w-full rounded-xl border border-[#d8cfbd] bg-[#fffdf7] pr-10 pl-4 text-sm"/></label></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-[#fbefea] p-3 text-sm text-[#744638]">{error}</p>}
    {loading ? <LoadingState label="جارٍ تحميل العملاء…"/> : customers.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d0c6b3] bg-[#fbf8f0] py-16 text-center text-sm text-[#74766b]">لا توجد سجلات عملاء بعد. سيُضاف العميل تلقائيًا عند تسجيل أول طلب.</div> :
      <div className="overflow-hidden rounded-2xl border border-[#ddd4c2] bg-[#fbf8f0]"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-right text-sm"><thead className="bg-[#eee8da] text-xs text-[#6c7165]"><tr>{['العميل','الهاتف','المدينة','عدد الطلبات','آخر تحديث'].map(label=><th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#e7dfd0]">{customers.map(customer=><tr key={customer.id} className="hover:bg-[#f4efe4]"><td className="px-4 py-4"><button onClick={()=>void openCustomer(customer)} className="font-bold text-[#385641] underline underline-offset-4">{customer.name}</button></td><td className="px-4 py-4" dir="ltr">{customer.phone}</td><td className="px-4 py-4">{customer.city}</td><td className="px-4 py-4">{customer.orderCount}</td><td className="px-4 py-4 text-xs">{dateText(customer.updatedAt)}</td></tr>)}</tbody></table></div></div>}
    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-[#17261d]/45" role="dialog" aria-modal="true" aria-label="تفاصيل العميل"><div className="h-full w-full max-w-xl overflow-y-auto bg-[#f8f4eb] p-5 md:p-8"><div className="flex items-center justify-between"><div><p className="text-xs text-[#8b7954]">ملف العميل</p><h2 className="text-xl font-extrabold">{selected.customer.name}</h2></div><button onClick={()=>setSelected(null)} aria-label="إغلاق" className="grid size-10 place-items-center rounded-full border border-[#d8cfbd]"><X size={18}/></button></div><div className="mt-6 grid grid-cols-2 gap-3">{[['الهاتف',selected.customer.phone],['المدينة',selected.customer.city],['عدد الطلبات',selected.orders.length]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-[#eee8da] p-3"><p className="text-[11px] text-[#797a6e]">{label}</p><p className="mt-1 break-words text-sm font-bold">{value}</p></div>)}</div><h3 className="mt-7 font-bold">سجل الطلبات</h3>{selected.orders.length ? <div className="mt-3 space-y-2">{selected.orders.map(order=><div key={order.id} className="rounded-xl border border-[#ded5c4] bg-[#fbf8f0] p-4"><div className="flex items-center justify-between"><b>{order.orderNumber}</b><span className="text-xs">{statusNames[order.status]}</span></div><p className="mt-2 text-sm">{order.productName} · {money(order.totalAmount)}</p><p className="mt-1 text-xs text-[#7b7c70]">{dateText(order.createdAt)}</p></div>)}</div> : <p className="mt-3 text-sm text-[#73776b]">لا توجد طلبات مرتبطة بهذا العميل.</p>}</div></div>}
  </section>;
}
function OverviewPanel({ data, onOrders }: { data: AdminOverview; onOrders: () => void }) {
  const stats = [
    ['إجمالي الطلبات', data.totalOrders, BookOpen], ['طلبات اليوم', data.todayOrders, Clock3], ['آخر ٧ أيام', data.last7DaysOrders, PackageCheck],
  ] as const;
  const chartMax = Math.max(1, ...data.dailyOrders.map(item => item.count));
  const counts = new Map(data.statusCounts.map(x => [x.status, x.count]));
  return <section>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-[#8b7954]">مساحة العمل</p><h2 className="mt-1 text-2xl font-extrabold md:text-3xl">ملخص الطلبات</h2><p className="mt-1 text-sm text-[#6d7369]">ملخص الطلبات والمبيعات بحسب البيانات المسجلة.</p></div><button onClick={onOrders} className={outlineButton}>إدارة الطلبات<ArrowLeft size={15}/></button></div>
    <div className="grid gap-4 sm:grid-cols-3">{stats.map(([label,value,Icon]) => <div key={label} className="rounded-2xl border border-[#ded5c4] bg-[#fbf8f0] p-5"><div className="flex justify-between text-sm text-[#717668]"><span>{label}</span><Icon size={18} className="text-[#9d824b]"/></div><p className="mt-4 text-3xl font-extrabold text-[#2f4d39]">{new Intl.NumberFormat('ar-LY').format(value)}</p></div>)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-2xl border border-[#ded5c4] bg-[#fbf8f0] p-5 md:p-7"><div className="flex items-center justify-between"><div><h3 className="font-extrabold">نشاط الطلبات</h3><p className="mt-1 text-xs text-[#75796e]">عدد الطلبات لكل يوم خلال آخر ٧ أيام</p></div><span className="text-xs text-[#917747]">آخر ٧ أيام</span></div>
        {data.dailyOrders.length ? <div className="mt-7 flex h-48 items-end gap-3 border-b border-[#ded5c4] pb-2">{data.dailyOrders.map((item, i) => <div key={`${item.date}-${i}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-semibold text-[#4c604d]">{item.count}</span><div className="w-full max-w-12 rounded-t-lg bg-[#45684d] transition-all" style={{height:`${Math.max(5, item.count / chartMax * 70)}%`}}/><span className="text-[10px] text-[#77796d]">{new Intl.DateTimeFormat('ar-LY',{weekday:'short'}).format(new Date(item.date))}</span></div>)}</div> : <div className="mt-7 rounded-xl bg-[#f2eddf] py-12 text-center text-sm text-[#6c7266]">لا توجد بيانات يومية لعرضها بعد.</div>}
      </div>
      <div className="rounded-2xl border border-[#ded5c4] bg-[#fbf8f0] p-5 md:p-7"><h3 className="font-extrabold">حالة الطلبات</h3><p className="mt-1 text-xs text-[#75796e]">التوزيع الحالي</p><div className="mt-5 space-y-3">{statusList.map(s => {
        const count=counts.get(s) ?? 0; const ratio=data.totalOrders ? count / data.totalOrders * 100 : 0;
        return <div key={s}><div className="mb-1 flex justify-between text-xs"><span>{statusNames[s]}</span><span className="font-bold">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#ebe4d5]"><div className="h-full rounded-full bg-[#587251]" style={{width:`${ratio}%`}}/></div></div>;
      })}</div></div>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">{[
      ['قيمة الطلبات الجديدة', data.newOrdersValue, 'غير مؤكدة'], ['قيمة الطلبات المؤكدة', data.confirmedOrdersValue, 'بحالة مؤكدة'], ['قيمة الطلبات المكتملة', data.completedOrdersValue, 'طلبات مكتملة'],
    ].map(([label,value,hint]) => <div key={String(label)} className="rounded-2xl border border-[#ded5c4] bg-[#f0eadb] p-5"><p className="text-sm text-[#697165]">{label}</p><p className="mt-2 text-2xl font-extrabold text-[#334f3b]">{money(Number(value))}</p><p className="mt-1 text-xs text-[#898473]">{hint}</p></div>)}</div>
    <div className="mt-7 flex flex-wrap gap-3">{statusList.map(s => <span key={s} className="rounded-full border border-[#d9cfbc] bg-[#fbf8f0] px-4 py-2 text-xs"><span className="text-[#6d7369]">{statusNames[s]}</span><b className="mr-2">{counts.get(s) ?? 0}</b></span>)}</div>
  </section>;
}

function AdminPasswordPanel() {
  const changePassword = useChangeAdminPassword();
  const client = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [failure, setFailure] = useState('');
  const [success, setSuccess] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailure('');
    setSuccess('');
    if (Array.from(newPassword).length < 12) {
      setFailure('كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا.');
      return;
    }
    if (newPassword !== confirmation) {
      setFailure('تأكيد كلمة المرور لا يطابقها.');
      return;
    }
    changePassword.mutate(
      { data: { currentPassword, newPassword } },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmation('');
          setSuccess('تم تغيير كلمة المرور بنجاح.');
          void client.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
        },
        onError: error =>
          setFailure(messageFromError(error, 'تعذر تغيير كلمة المرور. تحقق من كلمة المرور الحالية.')),
      },
    );
  };

  return <section className="mx-auto max-w-2xl">
    <div className="rounded-2xl border border-[#ded5c4] bg-[#fbf8f0] p-6 md:p-8">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-[#e8dfcc] text-[#7f6a3c]"><KeyRound size={20}/></span><div><h2 className="text-xl font-extrabold">تغيير كلمة مرور الإدارة</h2><p className="mt-1 text-sm text-[#6d7369]">تُستخدم كلمة المرور الجديدة في تسجيل الدخول القادم.</p></div></div>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="block text-sm font-bold">كلمة المرور الحالية<input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#d2c8b5] bg-[#fffdf7] px-4" required maxLength={256}/></label>
        <label className="block text-sm font-bold">كلمة المرور الجديدة<input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#d2c8b5] bg-[#fffdf7] px-4" required minLength={12} maxLength={256}/><span className="mt-1 block text-xs font-normal text-[#73766b]">12 حرفًا على الأقل.</span></label>
        <label className="block text-sm font-bold">تأكيد كلمة المرور الجديدة<input type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#d2c8b5] bg-[#fffdf7] px-4" required maxLength={256}/></label>
        {failure && <p role="alert" className="rounded-xl bg-[#fbefea] p-3 text-sm text-[#744638]">{failure}</p>}
        {success && <p role="status" className="rounded-xl bg-[#e8f0e5] p-3 text-sm text-[#315b3c]">{success}</p>}
        <button type="submit" disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmation} className={primaryButton}>{changePassword.isPending ? <><LoaderCircle size={16} className="animate-spin"/> جارٍ التغيير…</> : 'حفظ كلمة المرور الجديدة'}</button>
      </form>
    </div>
  </section>;
}

function OrdersPanel() {
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [fromDate, setFromDate] = useState(''); const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1); const [selected, setSelected] = useState<number | null>(null);
  const pageSize = 10;
  const params = { search: search || undefined, status: status ? status as OrderStatus : undefined, fromDate: fromDate || undefined, toDate: toDate || undefined, page, pageSize };
  const key = getListAdminOrdersQueryKey(params);
  const query = useListAdminOrders(params, { query: { queryKey: key } });
  const exportQuery = useExportAdminOrders({ search: search || undefined, status: status ? status as OrderStatus : undefined, fromDate: fromDate || undefined, toDate: toDate || undefined }, { query: { queryKey: getExportAdminOrdersQueryKey({search:search || undefined,status:status ? status as OrderStatus : undefined,fromDate:fromDate || undefined,toDate:toDate || undefined}), enabled: false } });
  const client = useQueryClient();
  const [exportError,setExportError] = useState('');
  const exportCsv = async () => {
    setExportError('');
    try {
      const result=await exportQuery.refetch();
      if (result.data == null) throw new Error();
      const blob = new Blob(['\uFEFF', result.data], {type:'text/csv;charset=utf-8;'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='orders.csv'; a.click(); URL.revokeObjectURL(url);
    } catch { setExportError('تعذّر تصدير الطلبات. حاول مرة أخرى.'); }
  };
  const orders = query.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));
  return <section>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold">إدارة الطلبات</h2><p className="mt-1 text-sm text-[#6c7367]">ابحث وراجع الطلبات المسجلة.</p></div>
      <button onClick={() => void exportCsv()} disabled={exportQuery.isFetching} className={outlineButton}>{exportQuery.isFetching ? <LoaderCircle className="animate-spin" size={16}/> : <FileDown size={16}/>}تصدير CSV</button>
    </div>
    <div className="mb-5 grid gap-3 rounded-2xl border border-[#ded5c4] bg-[#fbf8f0] p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <label className="relative"><span className="sr-only">البحث</span><Search className="absolute right-3 top-3.5 text-[#8b8a7c]" size={16}/><input data-testid="input-order-search" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="اسم، هاتف، أو رقم الطلب" className="h-11 w-full rounded-xl border border-[#d8cfbd] bg-[#fffdf7] pr-10 pl-3 text-sm"/></label>
      <select aria-label="تصفية حسب الحالة" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="h-11 rounded-xl border border-[#d8cfbd] bg-[#fffdf7] px-3 text-sm"><option value="">كل الحالات</option>{statusList.map(s=><option key={s} value={s}>{statusNames[s]}</option>)}</select>
      <label className="flex items-center gap-2 text-xs text-[#74766b]"><span>من</span><input aria-label="من تاريخ" type="date" value={fromDate} onChange={e=>{setFromDate(e.target.value);setPage(1);}} className="h-11 min-w-0 flex-1 rounded-xl border border-[#d8cfbd] bg-[#fffdf7] px-2 text-sm"/></label>
      <label className="flex items-center gap-2 text-xs text-[#74766b]"><span>إلى</span><input aria-label="إلى تاريخ" type="date" value={toDate} onChange={e=>{setToDate(e.target.value);setPage(1);}} className="h-11 min-w-0 flex-1 rounded-xl border border-[#d8cfbd] bg-[#fffdf7] px-2 text-sm"/></label>
    </div>
    {exportError && <p role="alert" className="mb-4 text-sm text-red-800">{exportError}</p>}
    {query.isLoading ? <LoadingState label="جارٍ تحميل الطلبات…"/> : query.isError ? <div role="alert" className="rounded-xl border border-[#dfc3b4] bg-[#fbefea] p-6 text-center text-sm">تعذّر تحميل الطلبات. <button className="underline" onClick={()=>void query.refetch()}>أعد المحاولة</button></div> : orders.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d0c6b3] bg-[#fbf8f0] py-16 text-center"><PackageCheck className="mx-auto text-[#a28b5c]" size={30}/><p className="mt-3 font-bold">لا توجد طلبات مطابقة</p><p className="mt-1 text-sm text-[#74766b]">{search || status || fromDate || toDate ? 'جرّب تعديل البحث أو عوامل التصفية.' : 'ستظهر الطلبات الجديدة هنا.'}</p></div> :
      <div className="overflow-hidden rounded-2xl border border-[#ddd4c2] bg-[#fbf8f0]">
        <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1420px] text-right text-sm">
          <thead className="bg-[#eee8da] text-xs text-[#6c7165]"><tr>{['رقم الطلب','العميل','الهاتف','المدينة','الباقة / الكمية','سعر الوحدة','التوصيل','الإجمالي','تاريخ الإنشاء','آخر تحديث','الحالة',''].map(x=><th className="px-3 py-3 font-semibold" key={x}>{x}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#e7dfd0]">{orders.map(o=><tr key={o.id} className="hover:bg-[#f4efe4]">
            <td className="px-3 py-4 font-bold"><button onClick={()=>setSelected(o.id)} className="text-[#385641] underline decoration-[#b5a77e] underline-offset-4">{o.orderNumber}</button></td><td className="px-3 py-4">{o.customerName}</td>
            <td className="px-3 py-4" dir="ltr"><a href={`tel:${o.phone}`} className="text-[#355a43]">{o.phone}</a><button type="button" onClick={()=>void navigator.clipboard.writeText(o.phone).catch(()=>{})} aria-label={`نسخ رقم ${o.customerName}`} className="mr-2 inline-grid size-7 place-items-center rounded-md text-[#778072] hover:bg-[#eee8da]"><Copy size={13}/></button></td><td className="px-3 py-4">{o.city}</td><td className="px-3 py-4">{o.productName}<span className="mr-1 text-xs text-[#74766b]">× {o.quantity}</span></td>
            <td className="px-3 py-4">{money(o.unitPrice)}</td><td className="px-3 py-4">{money(o.deliveryFee)}</td><td className="px-3 py-4 font-bold">{money(o.totalAmount)}</td><td className="px-3 py-4 text-xs">{dateText(o.createdAt)}</td><td className="px-3 py-4 text-xs">{dateText(o.updatedAt)}</td><td className="px-3 py-4"><StatusSelect order={o} onChanged={()=>{void client.invalidateQueries({queryKey:getListAdminOrdersQueryKey()});void client.invalidateQueries({queryKey:getGetAdminOverviewQueryKey()});}}/></td>
            <td className="px-3 py-4"><button title="عرض التفاصيل" onClick={()=>setSelected(o.id)} className="grid size-9 place-items-center rounded-lg border border-[#d7cdbb] hover:bg-[#eee7d8]"><ChevronLeft size={17}/></button></td>
          </tr>)}</tbody>
        </table></div>
        <div className="divide-y divide-[#e7dfd0] lg:hidden">{orders.map(o=><OrderCard key={o.id} order={o} onDetails={()=>setSelected(o.id)} onChanged={()=>{void client.invalidateQueries({queryKey:getListAdminOrdersQueryKey()});void client.invalidateQueries({queryKey:getGetAdminOverviewQueryKey()});}}/>)}</div>
        <div className="flex items-center justify-between border-t border-[#e3dac9] px-4 py-3 text-sm"><span className="text-[#71766a]">الصفحة {page} من {totalPages} · {query.data?.total ?? 0} طلب</span><div className="flex gap-2"><button aria-label="الصفحة السابقة" disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="grid size-9 place-items-center rounded-lg border border-[#d8cfbd] disabled:opacity-40"><ChevronRight size={16}/></button><button aria-label="الصفحة التالية" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="grid size-9 place-items-center rounded-lg border border-[#d8cfbd] disabled:opacity-40"><ChevronLeft size={16}/></button></div></div>
      </div>}
    {selected !== null && <OrderDetails id={selected} onClose={()=>setSelected(null)} onChanged={()=>{void client.invalidateQueries({queryKey:getListAdminOrdersQueryKey()});void client.invalidateQueries({queryKey:getGetAdminOverviewQueryKey()});}}/>}
  </section>;
}
function OrderCard({order,onDetails,onChanged}:{order:AdminOrder;onDetails:()=>void;onChanged:()=>void}) {
  const [copied,setCopied]=useState(false);
  const copy=async()=>{try{await navigator.clipboard.writeText(order.phone);setCopied(true);setTimeout(()=>setCopied(false),1400);}catch{}};
  return <article className="p-4">
    <div className="flex items-start justify-between"><button onClick={onDetails} className="font-bold text-[#355640] underline underline-offset-4">{order.orderNumber}</button><StatusSelect order={order} onChanged={onChanged}/></div>
    <p className="mt-3 font-bold">{order.customerName}</p><p className="mt-1 text-xs text-[#73766a]">{order.city} · {order.productName} × {order.quantity}</p>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2" dir="ltr"><a href={`tel:${order.phone}`} className="text-sm text-[#365740]">{order.phone}</a><button onClick={()=>void copy()} aria-label="نسخ رقم الهاتف" className="rounded p-1 text-[#73766a]">{copied?<Check size={15}/>:<Copy size={15}/>}</button></div><span className="font-bold">{money(order.totalAmount)}</span></div>
    <p className="mt-2 text-[11px] text-[#8a887c]">{dateText(order.createdAt)}</p><button onClick={onDetails} className="mt-3 text-xs font-bold text-[#45634b]">تفاصيل الطلب ←</button>
  </article>;
}
function StatusSelect({order,onChanged}:{order:AdminOrder;onChanged:()=>void}) {
  const mutation=useUpdateAdminOrder();const [error,setError]=useState('');
  return <div><select aria-label={`حالة الطلب ${order.orderNumber}`} value={order.status} disabled={mutation.isPending} onChange={e=>{
    const next=e.target.value as OrderStatus; if(next===order.status)return; setError('');
    mutation.mutate({orderId:order.id,data:{status:next}},{onSuccess:onChanged,onError:error=>setError(messageFromError(error,'تعذّر تحديث الحالة'))});
  }} className="h-9 max-w-36 rounded-full border border-[#d8cfbd] bg-[#f5f0e5] px-3 text-xs font-semibold"><option value={order.status}>{statusNames[order.status]}</option>{statusList.filter(s=>s!==order.status).map(s=><option key={s} value={s}>{statusNames[s]}</option>)}</select>{error&&<span role="alert" className="block text-[10px] text-red-800">{error}</span>}</div>;
}
function OrderDetails({id,onClose,onChanged}:{id:number;onClose:()=>void;onChanged:()=>void}) {
  const query=useGetAdminOrder(id,{query:{queryKey:getGetAdminOrderQueryKey(id)}});
  const update=useUpdateAdminOrder();const [notes,setNotes]=useState('');const [ready,setReady]=useState(false);const [message,setMessage]=useState('');
  useEffect(()=>{if(query.data?.order&&!ready){setNotes(query.data.order.adminNotes||'');setReady(true);}},[query.data,ready]);
  return <div className="fixed inset-0 z-50 flex justify-end bg-[#17261d]/45" role="dialog" aria-modal="true" aria-label="تفاصيل الطلب">
    <button aria-label="إغلاق التفاصيل" className="absolute inset-0" onClick={onClose}/>
    <aside className="scrollbar-thin relative z-10 h-full w-full max-w-xl overflow-y-auto bg-[#f7f2e7] p-5 shadow-2xl md:p-8">
      <div className="flex items-center justify-between border-b border-[#ded5c4] pb-4"><div><p className="text-xs text-[#8b7954]">تفاصيل الطلب</p><h2 className="text-xl font-extrabold">{query.data?.order.orderNumber || 'الطلب'}</h2></div><button onClick={onClose} aria-label="إغلاق" className="grid size-10 place-items-center rounded-full border border-[#d8cfbd]"><X size={18}/></button></div>
      {query.isLoading?<LoadingState label="جارٍ تحميل التفاصيل…"/>:query.isError||!query.data?<div role="alert" className="py-10 text-center">تعذّر تحميل تفاصيل الطلب.<button onClick={()=>void query.refetch()} className="mr-2 underline">إعادة المحاولة</button></div>:(()=>{
        const o=query.data.order;
        return <div className="space-y-6 py-6">
          <div className="grid grid-cols-2 gap-3">{[['اسم العميل',o.customerName],['الهاتف',o.phone],['المدينة',o.city],['المنتج',o.productName],['الكمية',o.quantity],['سعر الوحدة',money(o.unitPrice)],['رسوم التوصيل',money(o.deliveryFee)],['الإجمالي',money(o.totalAmount)],['تاريخ الإنشاء',dateText(o.createdAt)],['آخر تحديث',dateText(o.updatedAt)]].map(([k,v])=><div key={String(k)} className="rounded-xl bg-[#eee8da] p-3"><p className="text-[11px] text-[#797a6e]">{k}</p><p className="mt-1 break-words text-sm font-bold">{v}</p></div>)}</div>
          <div><label className="mb-2 block text-sm font-bold">تغيير الحالة</label><StatusSelect order={o} onChanged={()=>{onChanged();void query.refetch();}}/></div>
          <div><label className="mb-2 block text-sm font-bold">ملاحظات الإدارة</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} maxLength={5000} className="w-full rounded-xl border border-[#d8cfbd] bg-[#fffdf7] p-3 text-sm" placeholder="أضف ملاحظات داخلية…"/><button disabled={update.isPending} onClick={()=>{setMessage('');update.mutate({orderId:o.id,data:{adminNotes:notes}},{onSuccess:()=>{setMessage('تم حفظ الملاحظات.');onChanged();void query.refetch();},onError:error=>setMessage(messageFromError(error,'تعذّر حفظ الملاحظات.'))});}} className={`${primaryButton} mt-3 min-h-10 px-4 text-sm`}>{update.isPending?'جارٍ الحفظ…':'حفظ الملاحظات'}</button>{message&&<p role="status" className="mt-2 text-sm">{message}</p>}</div>
          <div><h3 className="font-bold">سجل تغييرات الحالة</h3>{query.data.history.length? <ol className="mt-3 space-y-3 border-r border-[#cfc4ac] pr-4">{query.data.history.map(h=><li key={h.id} className="relative text-sm"><span className="absolute -right-[21px] top-1.5 size-2 rounded-full bg-[#9b804d]"/><b>{h.previousStatus?statusNames[h.previousStatus]+' ← ':''}{statusNames[h.newStatus]}</b><time className="mt-1 block text-xs text-[#7b7c70]">{dateText(h.createdAt)}</time></li>)}</ol>:<p className="mt-2 text-sm text-[#73776b]">لا يوجد سجل تغييرات.</p>}</div>
        </div>;
      })()}
    </aside>
  </div>;
}

function ContentPanel() {
  const query=useGetOffer();const update=useUpdateOffer();const client=useQueryClient();
  const [form,setForm]=useState<Offer|null>(null);const [feedback,setFeedback]=useState('');const [failure,setFailure]=useState('');
  useEffect(()=>{if(query.data&&!form)setForm(query.data);},[query.data,form]);
  const edit=(key:keyof Offer,value:unknown)=>setForm(current=>current?({...current,[key]:value} as Offer):current);
  if(query.isLoading||!form) return query.isError?<PublicError error={query.error} retry={()=>void query.refetch()}/>:<LoadingState label="جارٍ تحميل محتوى العرض…"/>;
  const save=()=>{setFeedback('');setFailure('');update.mutate({data:{
    title:form.title,description:form.description,closingText:form.closingText,ctaText:form.ctaText,
    price:Number(form.price),deliveryFee:Number(form.deliveryFee),packageName:form.packageName,benefits:form.benefits,
    books:form.books.map(({id,title,author,description})=>({id,title,author,description}))
  }},{onSuccess:(newOffer)=>{client.setQueryData(getGetOfferQueryKey(),newOffer);setForm(newOffer);setFeedback('تم حفظ محتوى العرض.');},onError:error=>setFailure(messageFromError(error,'تعذّر حفظ التغييرات. راجع البيانات وحاول مرة أخرى.'))});};
  const setBook=(id:string,key:'title'|'author'|'description',value:string)=>edit('books',form.books.map(b=>b.id===id?{...b,[key]:value}:b));
  return <section id="content">
    <div className="mb-6"><h2 className="text-2xl font-extrabold">إدارة محتوى العرض</h2><p className="mt-1 text-sm text-[#6c7367]">عدّل النصوص والتسعير وأغلفة الكتابين. تحفظ التغييرات على العرض المنشور.</p></div>
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#ded5c4] bg-[#fbf8f0] p-5 md:p-7"><h3 className="mb-5 font-extrabold">معلومات الباقة</h3><div className="grid gap-4 md:grid-cols-2">
        <Field label="عنوان العرض"><input value={form.title} onChange={e=>edit('title',e.target.value)} className="admin-input"/></Field>
        <Field label="اسم الباقة"><input value={form.packageName} onChange={e=>edit('packageName',e.target.value)} className="admin-input"/></Field>
        <Field label="الوصف الرئيسي" wide><textarea rows={3} value={form.description} onChange={e=>edit('description',e.target.value)} className="admin-input"/></Field>
        <Field label="العبارة الختامية" wide><textarea rows={3} value={form.closingText} onChange={e=>edit('closingText',e.target.value)} className="admin-input"/></Field>
        <Field label="نص زر الطلب"><input value={form.ctaText} onChange={e=>edit('ctaText',e.target.value)} className="admin-input"/></Field>
        <Field label={`السعر (${form.currency})`}><input type="number" min="0" value={form.price} onChange={e=>edit('price',Number(e.target.value))} className="admin-input"/></Field>
        <Field label={`رسوم التوصيل (${form.currency})`}><input type="number" min="0" value={form.deliveryFee} onChange={e=>edit('deliveryFee',Number(e.target.value))} className="admin-input"/></Field>
      </div>
      <div className="mt-5"><label className="mb-2 block text-sm font-bold">مميزات العرض</label><div className="space-y-2">{form.benefits.map((benefit,i)=><div className="flex gap-2" key={i}><input value={benefit} onChange={e=>edit('benefits',form.benefits.map((x,j)=>j===i?e.target.value:x))} className="admin-input"/><button aria-label="حذف الميزة" onClick={()=>edit('benefits',form.benefits.filter((_,j)=>j!==i))} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#d8cfbd]"><X size={16}/></button></div>)}</div><button onClick={()=>edit('benefits',[...form.benefits,''])} className={`${outlineButton} mt-3 min-h-10 px-4 text-sm`}><Plus size={15}/>إضافة ميزة</button></div>
      </div>
      {form.books.map(book=><BookManagement key={book.id} book={book} onChange={setBook}/>)}
      {(feedback||failure)&&<p role={failure?'alert':'status'} className={`rounded-xl p-3 text-sm ${failure?'bg-[#fbefea] text-[#744638]':'bg-[#e6efe3] text-[#31553a]'}`}>{failure||feedback}</p>}
      <div className="flex flex-wrap justify-end gap-3"><button onClick={()=>{setForm(query.data!);setFailure('');setFeedback('');}} className={outlineButton}>تراجع</button><button onClick={save} disabled={update.isPending} className={primaryButton}>{update.isPending?<LoaderCircle size={16} className="animate-spin"/>:<Check size={16}/>}حفظ التغييرات</button></div>
    </div>
  </section>;
}
function Field({label,wide,children}:{label:string;wide?:boolean;children:ReactNode}) {
  return <label className={wide?'md:col-span-2':''}><span className="mb-2 block text-sm font-bold">{label}</span>{children}</label>;
}
function BookManagement({book,onChange}:{book:Offer['books'][number];onChange:(id:string,key:'title'|'author'|'description',value:string)=>void}) {
  const remove=useDeleteBookCover();const client=useQueryClient();
  const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState('');const [message,setMessage]=useState('');const [failure,setFailure]=useState('');
  const [uploading,setUploading]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  const selectFile=(f?:File)=>{if(!f)return;setFailure('');setMessage('');
    const permitted=['image/jpeg','image/png','image/webp'];
    if(!permitted.includes(f.type)){setFailure('نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP.');return;}
    if(f.size>5*1024*1024){setFailure('حجم الصورة أكبر من 5 ميغابايت.');return;}
    setFile(f);
  };
  const uploadAndSave=async()=>{
    if(!file)return;
    if(uploading)return;
    setUploading(true);setFailure('');setMessage('');
    try{
      const response=await fetch(`${basePath}/api/admin/books/${book.id}/cover`,{method:'PUT',credentials:'include',headers:{'Content-Type':file.type},body:file});
      const payload=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(payload?.error||'تعذّر حفظ صورة الغلاف.');
      const updated=payload as Offer['books'][number];
      setFile(null);setMessage('تم حفظ صورة الغلاف.');client.setQueryData(getGetOfferQueryKey(),(old:Offer|undefined)=>old?{...old,books:old.books.map(b=>b.id===updated.id?updated:b)}:old);
      void client.invalidateQueries({queryKey:getGetOfferQueryKey()});
    }catch(error){setFailure(error instanceof Error?error.message:'تعذّر حفظ صورة الغلاف. حاول مرة أخرى.');}
    finally{setUploading(false);}
  };
  const deleteCover=async()=>{
    if(!window.confirm('هل تريد حذف صورة الغلاف الحالية؟'))return;
    setFailure('');setMessage('');
    try{const updated=await remove.mutateAsync({bookId:book.id});client.setQueryData(getGetOfferQueryKey(),(old:Offer|undefined)=>old?{...old,books:old.books.map(b=>b.id===updated.id?updated:b)}:old);void client.invalidateQueries({queryKey:getGetOfferQueryKey()});setFile(null);setMessage('تم حذف صورة الغلاف.');}
    catch(error){setFailure(messageFromError(error,'تعذّر حذف صورة الغلاف. حاول مرة أخرى.'));}
  };
  const busy=uploading||remove.isPending;
  return <article className="rounded-2xl border border-[#ded5c4] bg-[#fbf8f0] p-5 md:p-7">
    <h3 className="mb-5 text-lg font-extrabold">{book.title}</h3>
    <div className="grid gap-6 md:grid-cols-[1fr_190px]">
      <div className="space-y-4"><Field label="اسم الكتاب"><input value={book.title} onChange={e=>onChange(book.id,'title',e.target.value)} className="admin-input"/></Field><Field label="المؤلف"><input value={book.author} onChange={e=>onChange(book.id,'author',e.target.value)} className="admin-input"/></Field><Field label="وصف الكتاب"><textarea rows={4} value={book.description} onChange={e=>onChange(book.id,'description',e.target.value)} className="admin-input"/></Field></div>
      <div className="flex flex-col items-center">
        <div className="flex min-h-[220px] w-full items-center justify-center rounded-xl bg-[#eee8da] p-4">{preview?<img src={preview} alt="معاينة الغلاف الجديد" className="book-cover max-h-52 max-w-full object-contain"/>:<Cover book={book} compact/>}</div>
        <p className="mt-2 text-xs text-[#73776b]">{file?'معاينة قبل الحفظ':'الغلاف المنشور'}</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>selectFile(e.target.files?.[0])}/>
        <button disabled={busy} onClick={()=>inputRef.current?.click()} className={`${outlineButton} mt-4 w-full px-3 text-sm`}><Upload size={15}/>{book.coverUrl?'استبدال الصورة':'رفع صورة جديدة'}</button>
        {file&&<button disabled={busy} onClick={()=>void uploadAndSave()} className={`${primaryButton} mt-2 w-full px-3 text-sm`}>{busy?<LoaderCircle className="animate-spin" size={15}/>:<Check size={15}/>} {busy?'جارٍ رفع الصورة…':'حفظ صورة الغلاف'}</button>}
        {book.coverUrl&&<button disabled={busy} onClick={()=>void deleteCover()} className="mt-2 min-h-10 w-full rounded-full px-3 text-sm font-semibold text-[#85513f] hover:bg-[#f5e9e2]">حذف الصورة</button>}
        <p className="mt-3 text-center text-[10px] leading-5 text-[#77776b]">JPG أو PNG أو WebP · حتى 5 ميغابايت</p>
      </div>
    </div>
    {(message||failure)&&<p role={failure?'alert':'status'} className={`mt-4 text-sm ${failure?'text-red-800':'text-[#31553a]'}`}>{failure||message}</p>}
  </article>;
}

function RoutedErrorBoundary({children}:{children:ReactNode}) {
  const [location]=useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Routes() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={Home}/>
    <Route path="/admin" component={AdminGate}/>
    <Route component={NotFound}/>
  </Switch></RoutedErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}>
    <TooltipProvider><WouterRouter base={basePath}><Routes/></WouterRouter><Toaster/></TooltipProvider>
  </QueryClientProvider>;
}
export default App;
