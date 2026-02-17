import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Clock, MessageCircle, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { directorId: string };
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
  const supabase = createClient();

  const { data: director, error: directorError } = await supabase
    .from('directors')
    .select('id, name, profile_image_url, tmdb_person_id, kmdb_person_id')
    .eq('id', params.directorId)
    .maybeSingle();

  if (directorError || !director) notFound();

  const { data: questions } = await supabase
    .from('questions')
    .select('id, body, created_at')
    .eq('director_id', director.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const safeQuestions = questions ?? [];

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      {/* 헤더(단색 + 굵은 구분선) */}
      <header className="border-b-2 border-zinc-700 bg-black">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* 프로필 */}
              <div className="h-20 w-20 shrink-0 overflow-hidden border-2 border-zinc-700 bg-zinc-900">
                {director.profile_image_url ? (
                  <img
                    src={director.profile_image_url}
                    alt={`${director.name} 프로필`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-2xl font-bold">
                    {director.name?.[0] ?? '?'}
                  </div>
                )}
              </div>

              {/* 제목 */}
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-bold tracking-tight text-zinc-50">
                  {director.name}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-base text-zinc-300">
                  {director.tmdb_person_id ? (
                    <span className="border border-zinc-700 bg-zinc-950 px-3 py-1">
                      TMDB #{director.tmdb_person_id}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 질문하기 버튼 */}
            <div className="flex items-center gap-3">
              <Link
                href={`/directors/${director.id}/ask`}
                className="inline-flex items-center gap-2 border-2 border-zinc-700 bg-zinc-100 px-5 py-3 text-lg font-bold text-zinc-900 hover:bg-white"
              >
                <Plus className="h-6 w-6" />
                질문하기
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 질문 목록(게시판형) */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-end justify-between gap-4 border-b-2 border-zinc-700 pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
              <MessageCircle className="h-6 w-6" />
              질문 목록
            </h2>
            <p className="mt-1 text-base text-zinc-300">
              모든 질문은 물음표(?)로 끝나야 등록돼요.
            </p>
          </div>

          <div className="text-base text-zinc-300">
            {safeQuestions.length ? `${safeQuestions.length}개` : '0개'}
          </div>
        </div>

        {safeQuestions.length === 0 ? (
          <div className="mt-4 border-2 border-zinc-700 bg-zinc-950 p-5">
            <p className="text-lg font-semibold">첫 질문을 남겨보세요.</p>
            <p className="mt-2 text-base text-zinc-300">
              이 감독에게 꼭 묻고 싶은 한 문장을 남겨주세요.
            </p>

            <div className="mt-5">
              <Link
                href={`/directors/${director.id}/ask`}
                className="inline-flex items-center gap-2 border-2 border-zinc-700 bg-zinc-100 px-5 py-3 text-lg font-bold text-zinc-900 hover:bg-white"
              >
                <Plus className="h-6 w-6" />
                질문하기
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-4 border-2 border-zinc-700 bg-zinc-950 divide-y-2 divide-zinc-700">
            {safeQuestions.map((q) => (
              <li key={q.id}>
                <Link href={`/questions/${q.id}`} className="block p-4 hover:bg-zinc-900">
                  <p className="text-xl font-semibold leading-snug text-zinc-50">{q.body}</p>

                  <div className="mt-3 flex items-center gap-2 text-base text-zinc-300">
                    <Clock className="h-5 w-5" />
                    {q.created_at ? formatKST(q.created_at) : ''}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 플로팅 질문하기 버튼 */}
      <Link
        href={`/directors/${director.id}/ask`}
        className="fixed bottom-6 right-6 inline-flex items-center gap-2 border-2 border-zinc-700 bg-zinc-100 px-5 py-3 text-lg font-bold text-zinc-900 shadow-lg hover:bg-white"
        aria-label="질문하기"
      >
        <Plus className="h-6 w-6" />
        질문하기
      </Link>
    </main>
  );
}