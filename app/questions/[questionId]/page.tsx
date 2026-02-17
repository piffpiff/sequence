import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  ArrowLeft,
  Clock,
  CornerDownRight,
  Link2,
  Plus,
  User,
  MessageCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// 1. [수정] params를 Promise로 감싸야 합니다.
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

// 2. [수정] 함수 인자를 props로 받고, await params 처리를 합니다.
export default async function QuestionDetailPage(props: PageProps) {
  const params = await props.params; // 여기서 await 필수!
  const { questionId } = params;

  // 3. [수정] createClient에도 await 필수!
  const supabase = await createClient();

  // 부모(현재) 질문 + 감독
  const { data: question, error: qError } = await supabase
    .from('questions')
    .select(
      `
        id,
        body,
        created_at,
        director_id,
        directors (
          id,
          name,
          profile_image_url
        )
      `
    )
    .eq('id', questionId) // params.questionId 대신 위에서 꺼낸 questionId 사용
    .maybeSingle();

  if (qError || !question) notFound();

  const director = Array.isArray(question.directors) ? question.directors[0] : question.directors;

  // 이어묻기(자식) 최신순: question_chains created_at 기준
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

  // 4. [수정] null 값 필터링을 안전하게 처리
  const childQuestions =
    (edges ?? [])
      .map((e) => {
        const child = Array.isArray((e as any).child_question)
          ? (e as any).child_question[0]
          : (e as any).child_question;

        if (!child?.id) return null;

        return {
          id: child.id as string,
          body: child.body as string,
          created_at: (child.created_at as string | null) ?? null,
          chain_created_at: ((e as any).created_at as string | null) ?? null,
        };
      })
      .filter((item) => item !== null); // Boolean 대신 명시적 null 체크 권장

  // 타입 단언 (null 필터링 후)
  const safeChildQuestions = childQuestions as NonNullable<typeof childQuestions[number]>[];

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      {/* 상단 바 */}
      <header className="border-b-2 border-zinc-700 bg-black">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href={director?.id ? `/directors/${director.id}` : `/directors/${question.director_id}`}
              className="inline-flex items-center gap-2 border-2 border-zinc-700 bg-zinc-950 px-4 py-2 text-base font-semibold hover:bg-zinc-900"
            >
              <ArrowLeft className="h-5 w-5" />
              감독 페이지
            </Link>

            {director?.name ? (
              <span className="hidden items-center gap-2 text-base text-zinc-300 sm:inline-flex">
                <User className="h-5 w-5" />
                {director.name}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/questions/${question.id}`}
              className="inline-flex items-center gap-2 border-2 border-zinc-700 bg-zinc-950 px-4 py-2 text-base font-semibold hover:bg-zinc-900"
              aria-label="질문 링크"
              title="질문 링크"
            >
              <Link2 className="h-5 w-5" />
              링크
            </Link>

            <Link
              href={`/questions/${question.id}/reply`}
              className="inline-flex items-center gap-2 border-2 border-zinc-700 bg-zinc-100 px-5 py-2 text-lg font-bold text-zinc-900 hover:bg-white"
            >
              <Plus className="h-6 w-6" />
              이어 묻기
            </Link>
          </div>
        </div>
      </header>

      {/* 부모 질문 크게 */}
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="border-2 border-zinc-700 bg-zinc-950 p-6 sm:p-8">
          <div className="mb-3 flex items-center justify-center gap-2 text-base font-semibold text-zinc-300">
            <MessageCircle className="h-6 w-6" />
            원본 질문
          </div>

          <p className="text-center text-3xl font-bold leading-snug text-zinc-50">
            {question.body}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-base text-zinc-300">
            {director?.name ? (
              <span className="inline-flex items-center gap-2 border border-zinc-700 bg-black px-3 py-1 font-semibold">
                <User className="h-5 w-5" />
                {director.name}
              </span>
            ) : null}

            {question.created_at ? (
              <span className="inline-flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {formatKST(question.created_at)}
              </span>
            ) : null}
          </div>

          <div className="mt-7 flex justify-center">
            <Link
              href={`/questions/${question.id}/reply`}
              className="inline-flex items-center gap-2 border-2 border-zinc-700 bg-zinc-100 px-6 py-3 text-lg font-bold text-zinc-900 hover:bg-white"
            >
              <CornerDownRight className="h-6 w-6" />
              이 질문에 이어 묻기
            </Link>
          </div>
        </div>
      </section>

      {/* 이어묻기 목록 */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4 border-b-2 border-zinc-700 pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
              <CornerDownRight className="h-6 w-6" />
              이어 묻기 목록
            </h2>
            <p className="mt-1 text-base text-zinc-300">최신순으로 보여줘요.</p>
          </div>

          <div className="text-base text-zinc-300">
            {safeChildQuestions.length ? `${safeChildQuestions.length}개` : '0개'}
          </div>
        </div>

        {edgesError ? (
          <div className="mt-4 border-2 border-zinc-700 bg-zinc-950 p-5">
            <p className="text-lg font-semibold">이어 묻기를 불러오지 못했어요.</p>
            <p className="mt-2 text-base text-zinc-300">잠시 후 다시 시도해 주세요.</p>
          </div>
        ) : safeChildQuestions.length === 0 ? (
          <div className="mt-4 border-2 border-zinc-700 bg-zinc-950 p-5">
            <p className="text-lg font-semibold">아직 이어 묻기가 없어요.</p>
            <p className="mt-2 text-base text-zinc-300">
              첫 번째로 이어 묻기를 남겨보세요.
            </p>

            <div className="mt-5">
              <Link
                href={`/questions/${question.id}/reply`}
                className="inline-flex items-center gap-2 border-2 border-zinc-700 bg-zinc-100 px-6 py-3 text-lg font-bold text-zinc-900 hover:bg-white"
              >
                <Plus className="h-6 w-6" />
                이어 묻기
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-4 border-2 border-zinc-700 bg-zinc-950 divide-y-2 divide-zinc-700">
            {safeChildQuestions.map((child) => (
              <li key={child.id}>
                <Link href={`/questions/${child.id}`} className="block p-4 hover:bg-zinc-900">
                  <div className="flex items-start gap-3">
                    <CornerDownRight className="mt-1 h-6 w-6 shrink-0" />

                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-semibold leading-snug text-zinc-50">
                        {child.body}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-base text-zinc-300">
                        <Clock className="h-5 w-5" />
                        {child.created_at
                          ? formatKST(child.created_at)
                          : child.chain_created_at
                            ? formatKST(child.chain_created_at)
                            : ''}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 플로팅 이어묻기 버튼 */}
      <Link
        href={`/questions/${question.id}/reply`}
        className="fixed bottom-6 right-6 inline-flex items-center gap-2 border-2 border-zinc-700 bg-zinc-100 px-6 py-3 text-lg font-bold text-zinc-900 shadow-lg hover:bg-white"
        aria-label="이 질문에 이어 묻기"
      >
        <Plus className="h-6 w-6" />
        이어 묻기
      </Link>
    </main>
  );
}
