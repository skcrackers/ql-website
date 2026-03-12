import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarSection from '../CalendarSection';
import { buildMockSupabase, mockCalendarEvents, mockMonthlyUpdates } from './mocks/supabase';

// supabase 모듈 전체를 mock
vi.mock('../../supabase', () => ({ supabase: {} }));

// 테스트마다 supabase mock 교체
import * as supabaseModule from '../../supabase';

const MEMBER_NAMES = ['서성권', '성용훈', '정다희', '김은주', '홍성혁'];

function renderCalendar(props = {}) {
  return render(
    <CalendarSection
      editMode={true}
      memberNames={MEMBER_NAMES}
      {...props}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.alert.mockClear?.();
  window.confirm.mockClear?.();
  supabaseModule.supabase = buildMockSupabase();
});

// ─────────────────────────────────────────────
// 1. 기본 렌더링
// ─────────────────────────────────────────────
describe('기본 렌더링', () => {
  it('캘린더 제목이 보인다', async () => {
    renderCalendar();
    expect(screen.getByText('Q.L 모임 캘린더')).toBeInTheDocument();
  });

  it('editMode=true 일 때 일정 추가 버튼이 보인다', async () => {
    renderCalendar({ editMode: true });
    expect(screen.getByRole('button', { name: /일정 추가/ })).toBeInTheDocument();
  });

  it('editMode=false 일 때 일정 추가 버튼이 없다', async () => {
    renderCalendar({ editMode: false });
    expect(screen.queryByRole('button', { name: /일정 추가/ })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// 2. 이벤트 로딩
// ─────────────────────────────────────────────
describe('일정 로딩', () => {
  it('일정이 모바일 리스트에 표시된다', async () => {
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText('4월 근황토크')).toBeInTheDocument();
      expect(screen.getByText('4월 부모임')).toBeInTheDocument();
    });
  });

  it('근황토크 일정에만 "근황 보기/쓰기" 버튼이 있다', async () => {
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));

    const updateButtons = screen.getAllByRole('button', { name: /근황 보기\/쓰기/ });
    expect(updateButtons).toHaveLength(1);
  });

  it('일반 일정에는 "근황 보기/쓰기" 버튼이 없다', async () => {
    renderCalendar();
    await waitFor(() => screen.getByText('4월 부모임'));

    // 모바일 리스트에서 부모임 카드 확인 - 근황 버튼 없음
    const subMeetingCard = screen.getByText('4월 부모임').closest('div');
    expect(within(subMeetingCard).queryByRole('button', { name: /근황/ })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// 3. 근황토크 모달 열기/닫기
// ─────────────────────────────────────────────
describe('근황토크 모달', () => {
  it('근황 보기/쓰기 클릭 시 모달이 열린다', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));

    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    expect(screen.getByText('4월 근황토크 — 근황')).toBeInTheDocument();
  });

  it('모달 X 버튼으로 닫힌다', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));

    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    expect(screen.getByText('4월 근황토크 — 근황')).toBeInTheDocument();

    // 모달 안의 X 버튼 클릭
    const closeBtn = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg') && btn.className.includes('hover:bg-slate-100')
    );
    await user.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByText('4월 근황토크 — 근황')).not.toBeInTheDocument();
    });
  });

  it('모달 배경 클릭 시 닫힌다', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));

    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    expect(screen.getByText('4월 근황토크 — 근황')).toBeInTheDocument();

    // backdrop (fixed inset-0) 클릭
    const backdrop = document.querySelector('[class*="inset-0"][class*="bg-black"]');
    if (backdrop) await user.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByText('4월 근황토크 — 근황')).not.toBeInTheDocument();
    });
  });

  it('이미 작성된 근황이 목록에 표시된다', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));

    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    await waitFor(() => {
      expect(screen.getByText('클링커즈 잘 되고 있습니다!')).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────
// 4. 작성 현황
// ─────────────────────────────────────────────
describe('작성 현황', () => {
  it('완료/미완료 현황이 표시된다', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));

    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    await waitFor(() => {
      // 정확히 "완료:" 만 매칭 (미완료: 제외)
      const labels = screen.getAllByText(/완료:/);
      expect(labels.some(el => el.textContent.trim() === '완료:')).toBe(true);
      expect(labels.some(el => el.textContent.trim() === '미완료:')).toBe(true);
    });
  });

  it('완료한 사람 이름이 완료 목록에 있다', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));

    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    await waitFor(() => {
      // "완료:" span의 형제 span에서 서성권 확인
      const doneLabel = screen.getAllByText(/완료:/).find(
        el => el.textContent.trim() === '완료:'
      );
      expect(doneLabel.parentElement).toHaveTextContent('서성권');
    });
  });
});

// ─────────────────────────────────────────────
// 5. 근황 작성 폼
// ─────────────────────────────────────────────
describe('근황 작성 폼', () => {
  it('이름과 근황 입력 후 저장하면 upsert가 호출된다', async () => {
    const user = userEvent.setup();
    const mockSupabase = buildMockSupabase();
    supabaseModule.supabase = mockSupabase;

    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));
    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    await waitFor(() => screen.getByText('4월 근황토크 — 근황'));

    // 이름 선택
    await user.selectOptions(screen.getByRole('combobox'), '성용훈');

    // 근황 입력
    await user.type(screen.getByPlaceholderText(/이번 달 근황/), '디자인 작업 중입니다.');

    // 저장
    await user.click(screen.getByRole('button', { name: /^저장$/ }));

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('monthly_updates');
    });
  });

  it('이름 없이 저장하면 alert이 뜬다', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));
    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    await waitFor(() => screen.getByText('4월 근황토크 — 근황'));

    await user.type(screen.getByPlaceholderText(/이번 달 근황/), '내용만 있음');
    await user.click(screen.getByRole('button', { name: /^저장$/ }));

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('이름'));
  });

  it('직접 입력 선택 시 텍스트 필드가 나타난다', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));
    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    await waitFor(() => screen.getByText('4월 근황토크 — 근황'));

    await user.selectOptions(screen.getByRole('combobox'), '__custom__');
    expect(screen.getByPlaceholderText('이름을 입력하세요')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// 6. DB 미설정 에러 처리
// ─────────────────────────────────────────────
describe('DB 미설정 에러 처리', () => {
  it('monthly_updates 테이블 없을 때 에러 배너가 표시된다', async () => {
    supabaseModule.supabase = buildMockSupabase({ dbMissing: true });
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));
    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));

    await waitFor(() => {
      expect(screen.getByText(/DB 설정 필요/)).toBeInTheDocument();
    });
  });

  it('DB 없을 때 저장 버튼이 비활성화된다', async () => {
    supabaseModule.supabase = buildMockSupabase({ dbMissing: true });
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));
    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));

    await waitFor(() => screen.getByText(/DB 설정 필요/));
    const saveBtn = screen.getByRole('button', { name: /^저장$/ });
    expect(saveBtn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────
// 7. 딥링크 공유
// ─────────────────────────────────────────────
describe('딥링크 공유', () => {
  it('링크 복사 버튼 클릭 시 성공 alert이 표시된다', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));
    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    await waitFor(() => screen.getByText('4월 근황토크 — 근황'));

    // 링크 복사 버튼 클릭 → alert 호출 확인
    const copyBtns = screen.getAllByRole('button', { name: /복사/ });
    await user.click(copyBtns[0]);
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('복사'));
  });

  it('공유 링크 input에 meeting 날짜 파라미터가 포함된다', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await waitFor(() => screen.getByText('4월 근황토크'));
    await user.click(screen.getByRole('button', { name: /근황 보기\/쓰기/ }));
    await waitFor(() => screen.getByText('4월 근황토크 — 근황'));

    const linkInput = document.querySelector('input[readonly]');
    expect(linkInput?.value).toMatch(/meeting=\d{4}-\d{2}-\d{2}/);
  });
});

// ─────────────────────────────────────────────
// 8. 일정 등록 폼
// ─────────────────────────────────────────────
describe('일정 등록 폼', () => {
  it('일정 추가 버튼 클릭 시 폼이 열린다', async () => {
    const user = userEvent.setup();
    renderCalendar({ editMode: true });
    await user.click(screen.getByRole('button', { name: /일정 추가/ }));
    expect(screen.getByText('새 일정 추가')).toBeInTheDocument();
  });

  it('근황토크 타입 선택 시 제목이 자동 입력된다', async () => {
    const user = userEvent.setup();
    renderCalendar({ editMode: true });
    await user.click(screen.getByRole('button', { name: /일정 추가/ }));

    // 날짜 입력 (label의 for 속성이 없으므로 placeholder로 찾음)
    const dateInput = document.querySelector('input[type="date"]');
    await user.type(dateInput, '2026-04-07');

    // 근황토크 타입 선택
    await user.click(screen.getByRole('button', { name: '근황토크' }));

    const titleInput = screen.getByPlaceholderText(/3월 정기모임/);
    expect(titleInput.value).toMatch(/근황토크/);
  });

  it('제목/날짜 없이 저장하면 alert이 뜬다', async () => {
    const user = userEvent.setup();
    renderCalendar({ editMode: true });
    await user.click(screen.getByRole('button', { name: /일정 추가/ }));
    await user.click(screen.getByRole('button', { name: /저장/ }));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('필수'));
  });
});
