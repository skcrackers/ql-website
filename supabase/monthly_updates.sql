-- 근황토크: 모임별 회원 근황 저장
-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS monthly_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_date DATE NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  optional_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- meeting_date + author_name 당 1개만 허용 (같은 모임에 한 사람이 하나의 근황)
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_updates_unique 
  ON monthly_updates (meeting_date, author_name);

-- meeting_date로 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_monthly_updates_meeting_date 
  ON monthly_updates (meeting_date);

-- RLS: 익명 읽기/쓰기 허용 (회원 전용 페이지이므로)
ALTER TABLE monthly_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON monthly_updates FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON monthly_updates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON monthly_updates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON monthly_updates FOR DELETE USING (true);
