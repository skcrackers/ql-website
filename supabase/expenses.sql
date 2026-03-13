-- 연간 예산 테이블
CREATE TABLE IF NOT EXISTS annual_budget (
  year INT PRIMARY KEY,
  total_fee BIGINT NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE annual_budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON annual_budget FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON annual_budget FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON annual_budget FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON annual_budget FOR DELETE USING (true);

-- 초기 데이터
INSERT INTO annual_budget (year, total_fee) VALUES
  (2024, 24500000),
  (2025, 24500000)
ON CONFLICT (year) DO NOTHING;

-- 지출/수입 항목 테이블
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  item TEXT NOT NULL,
  expense BIGINT DEFAULT 0,
  income BIGINT DEFAULT 0,
  note TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_year_month ON expenses (year, month);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON expenses FOR DELETE USING (true);
