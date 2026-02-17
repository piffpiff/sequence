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
  // 줄바꿈 정리 + 앞뒤 공백 제거
  return raw.replace(/\r\n/g, '\n').trim();
}

function endsWithQuestionMark(body: string): boolean {
  // DB는 rtrim(body) 기준으로 검사하니까, 여기서도 trimEnd 기준으로 맞춰줌
  return body.trimEnd().endsWith('?');
}

function friendlySupabaseErrorMessage(message: string): string {
  // DB CHECK CONSTRAINT (질문은 ?로 끝나야 함)
  if (message.includes('questions_must_end_with_question_mark')) {
    return '질문은 반드시 물음표(?)로 끝나야 등록돼요.';
  }

  if (message.includes('questions_body_not_blank')) {
    return '질문을 한 글자 이상 입력해 주세요.';
  }

  // 트리거(부모/자식 director 일치)
  if (message.toLowerCase().includes('child question must target the same director')) {
    return '이어 묻기는 같은 감독에게만 연결할 수 있어요.';
  }

  // unique(child_question_id)
  if (message.includes('question_chains_child_single_parent')) {
    return '이 질문은 이미 다른 질문에 이어진 질문이에요.';
  }

  return message || '처리 중 오류가 발생했어요.';
}

/**
 * 이어 묻기 생성 액션
 * - parentQuestionId 기준으로 부모 질문 조회 (director_id 확보)
 * - questions에 새 질문 insert
 * - question_chains에 (parent -> child) 연결 insert
 * - 성공 시 부모 질문 상세로 redirect
 *
 * useFormState용 시그니처:
 *   (parentQuestionId를 bind로 고정) => (prevState, formData) 형태로 사용
 */
export async function createFollowUpQuestion(
  parentQuestionId: string,
  prevState: CreateFollowUpState,
  formData: FormData
): Promise<CreateFollowUpState> {
  const supabase = awaitcreateClient();

  const body = normalizeBody(formData.get('body'));

  if (body.length < 2) {
    return { ok: false, error: '질문을 입력해 주세요.' };
  }

  if (!endsWithQuestionMark(body)) {
    return { ok: false, error: '질문은 반드시 물음표(?)로 끝나야 등록돼요.' };
  }

  // 부모 질문 확인 + director_id 확보
  const { data: parent, error: parentError } = await supabase
    .from('questions')
    .select('id, director_id')
    .eq('id', parentQuestionId)
    .single();

  if (parentError || !parent) {
    return { ok: false, error: '부모 질문을 찾을 수 없어요.' };
  }

  // 로그인 유저 있으면 created_by / user_id로 넣고, 없으면 null + 익명 처리
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch {
    userId = null;
  }

  // 1) 새 질문 생성
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
    const msg = friendlySupabaseErrorMessage(childError?.message ?? '');
    return { ok: false, error: msg };
  }

  // 2) 체인 연결
  const { error: chainError } = await supabase.from('question_chains').insert({
    parent_question_id: parentQuestionId,
    child_question_id: child.id,
    created_by: userId,
  });

  if (chainError) {
    // 체인 연결이 실패하면, 방금 만든 질문을 정리(고아 질문 방지)
    await supabase.from('questions').delete().eq('id', child.id);

    const msg = friendlySupabaseErrorMessage(chainError.message ?? '');
    return { ok: false, error: msg };
  }

  // 캐시/경로 갱신 (dynamic 강제해도 안전하게 한 번 더)
  revalidatePath(`/questions/${parentQuestionId}`);
  revalidatePath(`/directors/${parent.director_id}`);

  redirect(`/questions/${parentQuestionId}`);
}