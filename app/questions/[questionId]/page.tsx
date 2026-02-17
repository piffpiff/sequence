import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CornerDownRight,
  Link2,
  MessageCircle,
  Plus,
  User,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ questionId: string }>;
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

// 1. 함수 인자를 props로 받고, 바로 await params를 합니다.
export default async function QuestionDetailPage(props: PageProps) {
  const params = await props.params;  // 여기서 await 필수!
  const { questionId } = params;      // ID 꺼내기

  const supabase = await createClient();

  // ... (중간 코드는 그대로 둠)

  // 2. 맨 아래 .eq 부분에서 params.questionId 대신 그냥 questionId를 씁니다.
  .eq('id', questionId)
  .maybeSingle();


  if (qError || !question) notFound();

  const director = Array.isArray(question.directors) ? question.directors[0] : question.directors;

  // 2) question_chains JOIN으로 자식 질문들(이어묻기) 최신순
  //    - question_chains.created_at 기준 최신순
  //    - child_question을 questions FK로 join
  const { data: edges, error: edgesError } = await supabase
    .from('question_chains')
    .select(
      `
        id,
        created_at,
        child_question:questions!question_chains_child_question_id_fkey (
          id,
          body,
          created_at
        )
      `
    )
    .eq('parent_question_id', question.id)
    .order('created_at', { ascending: false });

  // 조인 결과를 안전하게 정리
  const childQuestions =
    (edges ?? [])
      .map((e) => {
        const child = Array.isArray(e.child_question) ? e.child_question[0] : e.child_question;
        if (!child?.id) return null;

        return {
          id: child.id as string,
          body: child.body as string,
          created_at: (child.created_at as string | null) ?? null,
          chain_created_at: (e.created_at as string | null) ?? null,
        };
      })
      .filter(Boolean) ?? [];

  const childCount = childQuestions.length;

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href={director?.id ? `/directors/${director.id}` : `/directors/${question.director_id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" />
              감독 페이지
            </Link>

            {director?.name ? (
              <div className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex">
                <User className="h-4 w-4 text-zinc-600" />
                <span className="truncate">{director.name}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/questions/${question.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
              aria-label="질문 링크"
              title="질문 링크"
            >
              <Link2 className="h-4 w-4" />
              링크
            </Link>

            <Link
              href={`/questions/${question.id}/reply`}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white"
            >
              <Plus className="h-4 w-4" />
              이어 묻기
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: Parent Question */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-900" />
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.10),transparent_45%),radial-gradient(circle_at_10%_70%,rgba(255,255,255,0.06),transparent_40%)]" />

        <div className="relative mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <MessageCircle className="h-4 w-4 text-zinc-500" />
              <span>질문</span>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm sm:p-8">
              <p className="text-center text-2xl font-semibold leading-snug tracking-tight text-zinc-50 sm:text-3xl">
                {question.body}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500">
                {director?.name ? (
                  <span className="rounded-full border border-zinc-800 bg-black px-2 py-1">
                    {director.name}
                  </span>
                ) : null}

                {question.created_at ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatKST(question.created_at)}
                  </span>
                ) : null}
              </div>

              <div className="mt-7 flex justify-center">
                <Link
                  href={`/questions/${question.id}/reply`}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white"
                >
                  <CornerDownRight className="h-4 w-4" />
                  이 질문에 이어 묻기
                  <ArrowRight className="h-4 w-4 opacity-70" />
                </Link>
              </div>
            </div>

            {director?.profile_image_url ? (
              <div className="mt-6 flex justify-center">
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <div className="h-9 w-9 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                    <img
                      src={director.profile_image_url}
                      alt={`${director.name} 프로필`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-zinc-200">{director.name}</div>
                    <div className="text-[11px] text-zinc-500">감독</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Children: Follow-up list */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <CornerDownRight className="h-4 w-4 text-zinc-500" />
              이어 묻기 목록
            </h2>
            <p className="mt-1 text-xs text-zinc-500">최신순으로 보여줘요.</p>
          </div>

          <div className="text-xs text-zinc-500">{childCount ? `${childCount}개` : '0개'}</div>
        </div>

        {edgesError ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-300">이어 묻기를 불러오지 못했어요.</p>
            <p className="mt-2 text-xs text-zinc-500">잠시 후 다시 시도해 주세요.</p>
          </div>
        ) : childCount === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-300">아직 이어 묻기가 없어요.</p>
            <p className="mt-2 text-xs text-zinc-500">첫 번째로 이어 묻기를 남겨보세요.</p>

            <div className="mt-5">
              <Link
                href={`/questions/${question.id}/reply`}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white"
              >
                <Plus className="h-4 w-4" />
                이어 묻기
                <ArrowRight className="h-4 w-4 opacity-70" />
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3">
            {childQuestions?.filter((c) => c !== null).map((child) => (
              <li key={child.id}>
                <Link
                  href={`/questions/${child.id}`}
                  className="group block rounded-2xl border border-zinc-800 bg-zinc-950 p-4 hover:bg-zinc-900/60"
                >
                  <div className="flex items-start gap-3">
                    <CornerDownRight className="mt-0.5 h-4 w-4 text-zinc-600 group-hover:text-zinc-300" />

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-3 text-sm leading-relaxed text-zinc-100 group-hover:text-white">
                        {child.body}
                      </p>

                      <div className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="h-3.5 w-3.5" />
                        {child.created_at
                          ? formatKST(child.created_at)
                          : child.chain_created_at
                            ? formatKST(child.chain_created_at)
                            : ''}
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-zinc-700 group-hover:text-zinc-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Floating Reply Button */}
      <Link
        href={`/questions/${question.id}/reply`}
        className="fixed bottom-6 right-6 inline-flex h-12 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-100 px-5 text-sm font-semibold text-zinc-900 shadow-lg hover:bg-white"
        aria-label="이 질문에 이어 묻기"
      >
        <Plus className="h-4 w-4" />
        이어 묻기
      </Link>
    </main>
  );
}