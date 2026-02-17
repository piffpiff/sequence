import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createFollowUpQuestion } from '@/app/actions/question-chain';
import QuestionReplyForm from '@/components/questions/QuestionReplyForm';
import { ArrowLeft, CornerDownRight, MessageCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { questionId: string };
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

export default async function QuestionReplyPage({ params }: PageProps) {
  const supabase = createClient();

  const { data: parent, error } = await supabase
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
    .eq('id', params.questionId)
    .maybeSingle();

  if (error || !parent) notFound();

  const director = Array.isArray(parent.directors) ? parent.directors[0] : parent.directors;

  // Server Action: parentQuestionId를 바인딩해서 useFormState에 맞는 형태로 변환
  const action = createFollowUpQuestion.bind(null, parent.id);

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      {/* Top bar */}
      <header className="border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/questions/${parent.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" />
              질문으로 돌아가기
            </Link>

            {director?.id ? (
              <Link
                href={`/directors/${director.id}`}
                className="hidden items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-900 sm:inline-flex"
              >
                <span className="truncate">{director.name}</span>
              </Link>
            ) : null}
          </div>

          <div className="text-xs text-zinc-500">이어 묻기 작성</div>
        </div>
      </header>

      {/* Parent Question */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-900" />
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.10),transparent_45%),radial-gradient(circle_at_10%_70%,rgba(255,255,255,0.06),transparent_40%)]" />

        <div className="relative mx-auto max-w-4xl px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <MessageCircle className="h-4 w-4 text-zinc-500" />
              <span>부모 질문</span>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm sm:p-8">
              <p className="text-center text-2xl font-semibold leading-snug tracking-tight text-zinc-50 sm:text-3xl">
                {parent.body}
              </p>

              {parent.created_at ? (
                <div className="mt-5 text-center text-xs text-zinc-500">
                  {formatKST(parent.created_at)}
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
                <CornerDownRight className="h-4 w-4 text-zinc-600" />
                <span>이 질문에 “이어 묻기”를 남겨요.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reply Form */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-sm font-semibold text-zinc-200">이어 묻기 작성</h2>
          <p className="mt-1 text-xs text-zinc-500">모든 질문은 물음표(?)로 끝나야 등록돼요.</p>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
            <QuestionReplyForm action={action} cancelHref={`/questions/${parent.id}`} />
          </div>
        </div>
      </section>
    </main>
  );
}