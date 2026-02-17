'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

type CreateFollowUpState = {
  ok: boolean;
  error: string | null;
};

function normalizeBody(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\r\n/g, '\n').trim();
}

function endsWithQuestionMark(body: string): boolean {
  return body.trimEnd().endsWith('?');
}

function friendlyError(message: string): string {
  // DB constraint: questions_must_end_with_question_mark
  if (message.includes('questions_must_end_with_question_mark')) {
    return '질문은 반드시 물음표(?)로 끝나야 등록돼요.';
  }
  return message || '처리 중 오류가 발생했어요.';
}

export async function createFollowUpQuestion(
  parentQuestionId: string,
  prevState: CreateFollowUpState,
  formData: FormData
): Promise<CreateFollowUpState> {
  const supabase = await createClient(); // ✅ Next 15

  const body = normalizeBody(formData.get('body'));

  if (body.length < 2) return { ok: false, error: '질문을 입력해 주세요.' };
  if (!endsWithQuestionMark(body)) {
    return { ok: false, error: '질문은 반드시 물음표(?)로 끝나야 등록돼요.' };
  }

  // 부모 질문 조회(같은 director_id로 child 질문 생성해야 함)
  const { data: parent, error: parentError } = await supabase
    .from('questions')
    .select('id, director_id')
    .eq('id', parentQuestionId)
    .single();

  if (parentError || !parent) return { ok: false, error: '부모 질문을 찾을 수 없어요.' };

  // ✅ 최소 스키마: questions에는 director_id/body만 넣는다
  const { data: child, error: childError } = await supabase
    .from('questions')
    .insert({
      director_id: parent.director_id,
      body,
    })
    .select('id')
    .single();

  if (childError || !child?.id) {
    return { ok: false, error: friendlyError(childError?.message ?? '') };
  }

  // ✅ 최소 스키마: question_chains에는 parent/child만
  const { error: chainError } = await supabase.from('question_chains').insert({
    parent_question_id: parentQuestionId,
    child_question_id: child.id,
  });

  if (chainError) {
    // 체인 실패 시 방금 만든 질문 정리
    await supabase.from('questions').delete().eq('id', child.id);
    return { ok: false, error: friendlyError(chainError.message ?? '') };
  }

  revalidatePath(`/questions/${parentQuestionId}`);
  redirect(`/questions/${parentQuestionId}`);
}