/**
 * Supabase 클라이언트 mock
 * 테스트에서 실제 DB 대신 메모리 데이터 사용
 */

// 기본 calendar_events 데이터
export const mockCalendarEvents = [
  {
    id: '1',
    title: '4월 근황토크',
    date: '2026-04-07',
    time: '18:00',
    type: '근황토크',
    description: '',
    location: '클링커즈 본사',
    created_by: '서성권',
  },
  {
    id: '2',
    title: '4월 부모임',
    date: '2026-04-14',
    time: '19:00',
    type: '일반',
    description: '',
    location: '',
    created_by: '서성권',
  },
];

// 기본 monthly_updates 데이터
export const mockMonthlyUpdates = [
  {
    id: 'u1',
    meeting_date: '2026-04-07',
    author_name: '서성권',
    content: '클링커즈 잘 되고 있습니다!',
    optional_link: null,
    created_at: new Date().toISOString(),
  },
];

// Mock builder: .from().select().eq().order() 체이닝 지원
export function buildMockSupabase({
  calendarEvents = mockCalendarEvents,
  monthlyUpdates = mockMonthlyUpdates,
  dbMissing = false,
} = {}) {
  const tableError = dbMissing
    ? { message: "relation \"public.monthly_updates\" does not exist", code: '42P01' }
    : null;

  const chain = (data, error = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockResolvedValue({ data, error }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error }),
    single: vi.fn().mockResolvedValue({ data: data?.[0] ?? null, error }),
  });

  return {
    from: vi.fn((table) => {
      if (table === 'calendar_events') return chain(calendarEvents);
      if (table === 'monthly_updates') return chain(dbMissing ? null : monthlyUpdates, tableError);
      return chain([]);
    }),
  };
}
