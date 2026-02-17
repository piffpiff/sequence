import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import QuestionComposer from '@/components/questions/QuestionComposer';

export default async function AskPage({
  params,
}: {
  params: Promise<{ directorId: string }>;
}) {
  const { directorId } = await params;
  const supabase = await createClient();

  // 감독 존재 확인 (없으면 404)
  const { data: director } = await supabase
    .from('directors')
    .select('id, name')
    .eq('id', directorId)
    .single();

  if (!director) {
    notFound();
  }

  // 질문 저장 액션 (서버 액션)
  async function submitQuestion(formData: FormData) {
    'use server';
    
    const body = formData.get('body') as string;
    if (!body || !body.trim().endsWith('?')) {
      throw new Error('질문은 반드시 물음표로 끝나야 합니다.');
    }

    const supabase = await createClient();
    const { error } = await supabase.from('questions').insert({
      director_id: directorId,
      body: body.trim(),
    });

    if (error) {
      console.error(error);
      throw new Error('질문 저장 실패');
    }

    redirect(`/directors/${directorId}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-white">
      <div className="w-full max-w-lg">
        <h1 className="mb-8 text-2xl font-bold text-center">
          <span className="text-zinc-500">To.</span> {director.name}
        </h1>
        
        {/* 질문 작성 컴포넌트 (클라이언트 컴포넌트) */}
        <QuestionComposer action={submitQuestion} />
      </div>
    </main>
  );
}
