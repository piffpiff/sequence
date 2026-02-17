import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ directorId: string }>;
};

function formatKST(iso: string) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Seoul',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function DirectorDetailPage({ params }: PageProps) {
  const { directorId } = await params;          // ✅ Next 15 규칙: params await
  const supabase = await createClient();        // ✅ Next 15 규칙: createClient await

  const { data: director, error: directorError } = await supabase
    .from('directors')
    .select('id, name, profile_image_url, tmdb_person_id, kmdb_person_id, name_en, biography')
    .eq('id', directorId)
    .maybeSingle();

  if (directorError || !director) notFound();

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, body, created_at')
    .eq('director_id', director.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // 질문 로딩 실패는 빈 상태로 처리
  const safeQuestions = questionsError ? [] : (questions ?? []);

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      {/* Top Header */}
      <header className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-900" />
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.06),transparent_40%)]" />

        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            {/* Profile */}
            <div className="shrink-0">
              <div className="h-28 w-28 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm sm:h-32 sm:w-32">
                {director.profile_image_url ? (
                  <img
                    src={director.profile_image_url}
                    alt={`${director.name} 프로필`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-lg font-semibold text-zinc-200">
                      {director.name?.[0] ?? '?'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                  {director.name}
                </h1>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  {director.tmdb_person_id ? (
                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1">
                      TMDB #{director.tmdb_person_id}
                    </span>
                  ) : null}
                  {director.name_en ? (
                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1">
                      {director.name_en}
                    </span>
                  ) : null}
                </div>

                {director.biography ? (
                  <p className="mt-2 line-clamp-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
                    {director.biography}
                  </p>
                ) : (
                  <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                    이 감독에게 남기고 싶은 질문을 모아보세요.
                  </p>
                )}
              </div>
            </div>

            {/* Ask button (top) */}
            <div className="sm:self-start">
              <Link
                href={`/directors/${director.id}/ask`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
              >
                질문하기 <span className="text-base leading-none">+</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">질문 목록</h2>
            <p className="mt-1 text-xs text-zinc-500">
              모든 질문은 물음표(?)로 끝나야 등록돼요.
            </p>
          </div>

          <div className="text-xs text-zinc-500">
            {safeQuestions.length ? `${safeQuestions.length}개` : '0개'}
          </div>
        </div>

        {safeQuestions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-300">첫 질문을 남겨보세요.</p>
            <p className="mt-2 text-xs text-zinc-500">
              이 감독에게 꼭 묻고 싶은 한 문장을 남겨주세요.
            </p>

            <div className="mt-5">
              <Link
                href={`/directors/${director.id}/ask`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
              >
                질문하기 <span className="text-base leading-none">+</span>
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {safeQuestions.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/questions/${q.id}`}
                  className="group block rounded-2xl border border-zinc-800 bg-zinc-950 p-4 hover:bg-zinc-900/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-3 text-sm leading-relaxed text-zinc-100 group-hover:text-white">
                      {q.body}
                    </p>
                    <span className="shrink-0 rounded-full border border-zinc-800 bg-black px-2 py-1 text-[10px] text-zinc-400">
                      보기
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-zinc-500">
                    {q.created_at ? formatKST(q.created_at) : ''}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Floating Ask Button */}
      <Link
        href={`/directors/${director.id}/ask`}
        className="fixed bottom-6 right-6 inline-flex h-12 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-100 px-5 text-sm font-semibold text-zinc-900 shadow-lg hover:bg-white"
        aria-label="질문하기"
      >
        질문하기 <span className="text-lg leading-none">+</span>
      </Link>
    </main>
  );
}