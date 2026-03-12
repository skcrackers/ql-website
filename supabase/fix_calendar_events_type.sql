-- calendar_events type 컬럼에 '근황토크' 허용
-- 기존 CHECK 제약을 제거하고 새 제약 추가
-- Supabase SQL Editor에서 실행하세요.

-- 1. 기존 제약 제거
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;

-- 2. 근황토크 포함한 새 제약 추가
ALTER TABLE calendar_events 
  ADD CONSTRAINT calendar_events_type_check 
  CHECK (type IN ('운영', '공지', '일반', '근황토크'));
