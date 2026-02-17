import DirectorSearchForm from '@/components/directors/DirectorSearchForm';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-white">
      <div className="w-full max-w-xl text-center">
        {/* 로고 영역 */}
        <h1 className="mb-2 text-6xl font-black tracking-tighter text-white">
          SEQUENCE<span className="text-red-600">.</span>
        </h1>
        <p className="mb-10 text-lg font-light text-zinc-400">
          대답은 닫힘이고, 질문은 열림이다.<br />
          영화 감독을 향한 질문 아카이브
        </p>

        {/* 검색 컴포넌트 */}
        <div className="relative z-10">
          <DirectorSearchForm />
        </div>

        {/* 배경 장식 */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-black to-black" />
      </div>
    </main>
  );
}
