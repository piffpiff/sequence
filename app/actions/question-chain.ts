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

function friendlySupabaseErrorMessage(message: string): string {
  if (message.includes('questions_must_end_with_question_mark')) {
    return '질문은 반드시 물음표(?)로 끝나야 등록돼요.';
  }
  if (message.includes('questions_body_not_blank')) {
    return '질문을 한 글자 이상 입력해 주세요.';
  }
  if (message.toLowerCase().includes('child question must target the same director')) {
    return '이어 묻기는 같은 감독에게만 연결할 수 있어요.';
  }
  if (message.includes('question_chains_child_single_parent')) {
    return '이 질문은 이미 다른 질문에 이어진 질문이에요.';
  }
  return message || '처리 중 오류가 발생했어요.';
}

export async function createFollowUpQuestion(
  parentQuestionId: string,
  prevState: CreateFollowUpState,
  formData: FormData
): Promise<CreateFollowUpState> {
  const supabase = await createClient(); // ✅

  const body = normalizeBody(formData.get('body'));

  if (body.length < 2) return { ok: false, error: '질문을 입력해 주세요.' };
  if (!endsWithQuestionMark(body)) {
    return { ok: false, error: '질문은 반드시 물음표(?)로 끝나야 등록돼요.' };
  }

  const { data: parent, error: parentError } = await supabase
    .from('questions')
    .select('id, director_id')
    .eq('id', parentQuestionId)
    .single();

  if (parentError || !parent) return { ok: false, error: '부모 질문을 찾을 수 없어요.' };

  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch {
    userId = null;
  }

  const { data: child, error: childError } = await supabase
    .from('questions')
    .insert({
      director_id: parent.director_id,
      body,
      user_id: userId,
      is_anonymous: userId ? false : true,
    })
    .select('id')
    .single();

  if (childError || !child?.id) {
    return { ok: false, error: friendlySupabaseErrorMessage(childError?.message ?? '') };
  }

  const { error: chainError } = await supabase.from('question_chains').insert({
    parent_question_id: parentQuestionId,
    child_question_id: child.id,
    created_by: userId,
  });

  if (chainError) {
    await supabase.from('questions').delete().eq('id', child.id);
    return { ok: false, error: friendlySupabaseErrorMessage(chainError.message ?? '') };
  }

  revalidatePath(`/questions/${parentQuestionId}`);
  revalidatePath(`/directors/${parent.director_id}`);

  redirect(`/questions/${parentQuestionId}`);
}