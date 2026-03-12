import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, X, MapPin, Clock, ChevronLeft, ChevronRight, Edit3, Trash2, MessageSquare, Share2, Monitor, Check, Circle } from 'lucide-react';
import { supabase } from '../supabase';

const CalendarSection = ({ editMode = false, memberNames = [] }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    time: '',
    type: '일반',
    description: '',
    location: '',
    created_by: ''
  });

  // 근황토크
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [selectedEventForUpdates, setSelectedEventForUpdates] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [updateForm, setUpdateForm] = useState({ author_name: '', content: '', optional_link: '', custom_name: '' });
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [showViewMode, setShowViewMode] = useState(false);

  // 이벤트 불러오기
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      alert('일정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // URL 딥링크: #calendar?meeting=2025-03-25 (또는 &view=1 붙이면 View 모드)
  useEffect(() => {
    const hash = window.location.hash || '';
    const queryPart = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(queryPart || window.location.search);
    const meetingDate = params.get('meeting');
    const wantView = params.get('view') === '1';
    if (!meetingDate || events.length === 0) return;
    const event = events.find(e => e.date === meetingDate && e.type === '근황토크');
    if (event) {
      setSelectedEventForUpdates(event);
      setUpdateForm({ author_name: '', content: '', optional_link: '', custom_name: '' });
      setShowUpdatesModal(true);
      supabase.from('monthly_updates').select('*').eq('meeting_date', event.date)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          setUpdates(data || []);
          if (wantView) setShowViewMode(true);
        });
      const cleanHash = window.location.hash.split('?')[0] || '';
      window.history.replaceState({}, '', window.location.pathname + (cleanHash || '#calendar'));
    }
  }, [events]);

  // 근황 불러오기
  const fetchUpdates = async (meetingDate) => {
    try {
      const { data, error } = await supabase
        .from('monthly_updates')
        .select('*')
        .eq('meeting_date', meetingDate)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setUpdates(data || []);
    } catch (err) {
      console.error('Error fetching updates:', err);
      setUpdates([]);
    }
  };

  const openUpdatesModal = (event) => {
    setSelectedEventForUpdates(event);
    setUpdateForm({ author_name: '', content: '', optional_link: '', custom_name: '' });
    setShowUpdatesModal(true);
    fetchUpdates(event.date);
  };

  const closeUpdatesModal = () => {
    setShowUpdatesModal(false);
    setSelectedEventForUpdates(null);
    setUpdates([]);
    setShowViewMode(false);
  };

  const saveUpdate = async () => {
    const name = updateForm.author_name === '__custom__'
      ? updateForm.custom_name.trim()
      : updateForm.author_name.trim();
    if (!name || !updateForm.content.trim()) {
      alert('이름과 근황을 입력해주세요.');
      return;
    }
    if (!selectedEventForUpdates) return;

    setSavingUpdate(true);
    try {
      const { error } = await supabase
        .from('monthly_updates')
        .upsert({
          meeting_date: selectedEventForUpdates.date,
          author_name: name,
          content: updateForm.content.trim(),
          optional_link: updateForm.optional_link.trim() || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'meeting_date,author_name'
        });

      if (error) throw error;
      await fetchUpdates(selectedEventForUpdates.date);
      setUpdateForm({ author_name: '', content: '', optional_link: '', custom_name: '' });
      alert('저장되었습니다!');
    } catch (err) {
      console.error('Save update error:', err);
      alert('저장에 실패했습니다: ' + err.message);
    } finally {
      setSavingUpdate(false);
    }
  };

  // 카카오톡 공유용 링크 (특정 모임 근황 페이지 - 딥링크)
  const getMeetingShareUrl = (event, forView = false) => {
    const base = window.location.origin + window.location.pathname;
    return forView
      ? `${base}#calendar?meeting=${event.date}&view=1`
      : `${base}#calendar?meeting=${event.date}`;
  };

  // 이벤트 저장
  const saveEvent = async () => {
    if (!eventForm.title || !eventForm.date) {
      alert('제목과 날짜는 필수입니다.');
      return;
    }

    try {
      if (editingEvent) {
        // 수정
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title: eventForm.title,
            date: eventForm.date,
            time: eventForm.time || null,
            type: eventForm.type,
            description: eventForm.description,
            location: eventForm.location,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
      } else {
        // 새로 추가
        const { error } = await supabase
          .from('calendar_events')
          .insert([{
            title: eventForm.title,
            date: eventForm.date,
            time: eventForm.time || null,
            type: eventForm.type,
            description: eventForm.description,
            location: eventForm.location,
            created_by: eventForm.created_by || 'anonymous'
          }]);

        if (error) throw error;
      }

      await fetchEvents();
      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm({
        title: '',
        date: '',
        time: '',
        type: '일반',
        description: '',
        location: '',
        created_by: ''
      });
      alert('저장되었습니다!');
    } catch (error) {
      console.error('Save error:', error);
      alert('저장에 실패했습니다: ' + error.message);
    }
  };

  // 이벤트 삭제 (성공 시 true 반환)
  const deleteEvent = async (event) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return false;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      await fetchEvents();
      alert('삭제되었습니다!');
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제에 실패했습니다: ' + error.message);
      return false;
    }
  };

  // 이벤트 폼 열기
  const openEventForm = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        title: event.title,
        date: event.date,
        time: event.time || '',
        type: event.type,
        description: event.description || '',
        location: event.location || '',
        created_by: event.created_by || ''
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        title: '',
        date: '',
        time: '',
        type: '일반',
        description: '',
        location: '',
        created_by: ''
      });
    }
    setShowEventForm(true);
  };

  // 타입별 색상
  const getTypeColor = (type) => {
    switch (type) {
      case '운영': return 'bg-blue-500';
      case '공지': return 'bg-amber-500';
      case '근황토크': return 'bg-emerald-500';
      case '일반': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case '운영': return 'bg-blue-100 text-blue-800';
      case '공지': return 'bg-amber-100 text-amber-800';
      case '근황토크': return 'bg-emerald-100 text-emerald-800';
      case '일반': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const isUpdatesEvent = (event) => event?.type === '근황토크';

  // 근황토크 제목 자동생성 (예: 4월 근황토크)
  // dateStr 없으면 캘린더에 현재 선택된 월(currentDate) 사용
  const getUpdatesEventTitle = (dateStr) => {
    const d = dateStr
      ? new Date(dateStr + 'T00:00:00')
      : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return `${d.getMonth() + 1}월 근황토크`;
  };

  // 캘린더 헬퍼 함수
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getEventsForDate = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    return events.filter(event => event.date === dateStr);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '종일';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 캘린더 뷰 렌더링
  const renderCalendarView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // 빈 칸 (이전 달)
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
    }

    // 날짜
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const isToday = new Date().getDate() === day && 
                      new Date().getMonth() === currentDate.getMonth() &&
                      new Date().getFullYear() === currentDate.getFullYear();

      days.push(
        <div
          key={day}
          className={`aspect-square border border-slate-200 p-2 hover:bg-slate-50 transition-colors ${
            isToday ? 'bg-amber-50 border-amber-300' : 'bg-white'
          }`}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-amber-700' : 'text-slate-700'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event, idx) => (
              <div
                key={event.id}
                className="group cursor-pointer flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isUpdatesEvent(event)) {
                    openUpdatesModal(event);
                  } else {
                    openEventForm(event);
                  }
                }}
              >
                <div className={`flex-1 text-xs px-2 py-1 rounded truncate ${getTypeBadgeColor(event.type)} hover:opacity-80`}>
                  {event.title}
                </div>
                {editMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openEventForm(event); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded"
                    title="일정 수정"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-slate-500 px-2">
                +{dayEvents.length - 3}개 더
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  // 리스트 뷰 렌더링
  const renderListView = () => {
    // 오늘 이후 일정만 (과거 일정 제외)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.date + 'T00:00:00');
      return eventDate >= today;
    });

    if (upcomingEvents.length === 0) {
      return (
        <div className="text-center py-12 text-slate-500">
          예정된 일정이 없습니다.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {upcomingEvents.map(event => (
          <div
            key={event.id}
            className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getTypeColor(event.type)}`}></div>
                <span className={`text-xs px-2 py-1 rounded-full ${getTypeBadgeColor(event.type)}`}>
                  {event.type}
                </span>
              </div>
              {editMode && (
                <div className="flex space-x-1">
                  <button
                    onClick={() => openEventForm(event)}
                    className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteEvent(event)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            <h4 className="text-lg font-semibold text-slate-900 mb-1">
              {event.title}
            </h4>
            
            <div className="flex items-center text-sm text-slate-600 mb-1">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {formatDate(event.date)}
            </div>
            
            {event.time && (
              <div className="flex items-center text-sm text-slate-600 mb-1">
                <Clock className="w-4 h-4 mr-2" />
                {formatTime(event.time)}
              </div>
            )}
            
            {event.location && (
              <div className="flex items-center text-sm text-slate-600 mb-2">
                <MapPin className="w-4 h-4 mr-2" />
                {event.location}
              </div>
            )}
            
            {event.description && (
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-line">
                {event.description}
              </p>
            )}

            {/* 근황토크일 때만 근황 보기/쓰기 버튼 (모바일) */}
            {isUpdatesEvent(event) && (
              <button
                onClick={() => openUpdatesModal(event)}
                className="mt-3 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                근황 보기/쓰기
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <section id="calendar" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h3 className="text-4xl md:text-5xl font-light text-slate-900 mb-4">
            Q.L 모임 캘린더
          </h3>
          <p className="text-slate-600 text-lg">다가오는 일정을 확인하세요</p>
          <div className="h-1 w-24 bg-amber-600 mx-auto mt-6"></div>
        </div>

        {/* 일정 추가 버튼 */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => openEventForm()}
            className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>일정 추가</span>
          </button>
        </div>

        {/* 데스크톱: 캘린더 뷰 / 모바일: 리스트 뷰 */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-slate-500">일정을 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 캘린더 뷰 (데스크톱만) */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                {/* 캘린더 헤더 */}
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 flex items-center justify-between">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h4 className="text-2xl font-medium">
                    {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                  </h4>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div
                      key={day}
                      className={`py-3 text-center text-sm font-medium ${
                        idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* 캘린더 그리드 */}
                <div className="grid grid-cols-7">
                  {renderCalendarView()}
                </div>
              </div>
            </div>

            {/* 리스트 뷰 (모바일만) */}
            <div className="lg:hidden">
              {renderListView()}
            </div>
          </>
        )}

        {/* 일정 추가/수정 모달 */}
        {showEventForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-medium text-slate-900">
                    {editingEvent ? '일정 수정' : '새 일정 추가'}
                  </h3>
                  <button
                    onClick={() => setShowEventForm(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* 제목 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="예: 3월 정기모임"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 날짜 & 시간 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      날짜 *
                    </label>
                    <input
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const updates = { ...eventForm, date: newDate };
                        if (eventForm.type === '근황토크') {
                          updates.title = getUpdatesEventTitle(newDate);
                        }
                        setEventForm(updates);
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      시간 (선택)
                    </label>
                    <input
                      type="time"
                      value={eventForm.time}
                      onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* 타입 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    타입 * (월간 정기모임은 근황토크 선택)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['운영', '공지', '일반', '근황토크'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const updates = { ...eventForm, type };
                          if (type === '근황토크') {
                            updates.title = getUpdatesEventTitle(eventForm.date);
                          }
                          setEventForm(updates);
                        }}
                        className={`py-3 px-4 rounded-lg border-2 transition-all text-center ${
                          eventForm.type === type
                            ? type === '운영'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : type === '공지'
                              ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : type === '근황토크'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-500 bg-slate-50 text-slate-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 장소 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    장소 (선택)
                  </label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    placeholder="예: 클링커즈 본사"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 설명 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    설명 (선택)
                  </label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="일정 상세 내용"
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 작성자 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    작성자 (선택)
                  </label>
                  <input
                    type="text"
                    value={eventForm.created_by}
                    onChange={(e) => setEventForm({ ...eventForm, created_by: e.target.value })}
                    placeholder="이름"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex space-x-3">
                {editingEvent && editMode && (
                  <button
                    onClick={async () => {
                      const success = await deleteEvent(editingEvent);
                      if (success) setShowEventForm(false);
                    }}
                    className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium border border-red-200"
                  >
                    삭제
                  </button>
                )}
                <button
                  onClick={saveEvent}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg transition-colors font-medium"
                >
                  저장
                </button>
                <button
                  onClick={() => setShowEventForm(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-lg transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 근황토크 모달 */}
        {showUpdatesModal && selectedEventForUpdates && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-medium text-slate-900">
                      {selectedEventForUpdates.title} — 근황
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {formatDate(selectedEventForUpdates.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode && (
                      <button
                        onClick={() => {
                          closeUpdatesModal();
                          openEventForm(selectedEventForUpdates);
                        }}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                        title="일정 수정"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={closeUpdatesModal}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 딥링크 공유 영역 + 작성 현황 */}
              <div className="mx-6 mb-0 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2">카카오톡 등으로 공유할 링크</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getMeetingShareUrl(selectedEventForUpdates)}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-600 truncate"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getMeetingShareUrl(selectedEventForUpdates));
                        alert('링크가 복사되었습니다. 카카오톡으로 공유해보세요!');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium shrink-0"
                    >
                      <Share2 className="w-4 h-4" />
                      링크 복사
                    </button>
                  </div>
                </div>
                {/* 작성 현황: 완료 / 미완료 */}
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">작성 현황 ({updates.length}명 / {memberNames.length}명)</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-slate-600 font-medium">완료:</span>
                      <span className="text-slate-700">
                        {updates.length === 0 ? '없음' : updates.map(u => u.author_name).join(', ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-600 font-medium">미완료:</span>
                      <span className="text-slate-600">
                        {memberNames.filter(n => !updates.some(u => u.author_name === n)).length === 0
                          ? '없음'
                          : memberNames.filter(n => !updates.some(u => u.author_name === n)).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
                {/* View 모드 버튼 */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowViewMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium"
                  >
                    <Monitor className="w-4 h-4" />
                    전체 보기 (모임용)
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getMeetingShareUrl(selectedEventForUpdates, true));
                      alert('View 링크가 복사되었습니다. 모임 때 프로젝터/화면 공유용으로 사용하세요!');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium"
                  >
                    <Share2 className="w-4 h-4" />
                    View 링크 복사
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 min-h-0">
                {/* 작성 폼 */}
                <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="font-medium text-slate-800 mb-3">근황 작성</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">이름 *</label>
                      <select
                        value={updateForm.author_name}
                        onChange={(e) => setUpdateForm({ ...updateForm, author_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">선택하세요</option>
                        {memberNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__custom__">── 직접 입력 ──</option>
                      </select>
                      {updateForm.author_name === '__custom__' && (
                        <input
                          type="text"
                          value={updateForm.custom_name}
                          onChange={(e) => setUpdateForm({ ...updateForm, custom_name: e.target.value })}
                          placeholder="이름을 입력하세요"
                          className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">근황 *</label>
                      <textarea
                        value={updateForm.content}
                        onChange={(e) => setUpdateForm({ ...updateForm, content: e.target.value })}
                        placeholder="이번 달 근황을 간단히 적어주세요"
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">링크 (선택)</label>
                      <input
                        type="url"
                        value={updateForm.optional_link}
                        onChange={(e) => setUpdateForm({ ...updateForm, optional_link: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <button
                      onClick={saveUpdate}
                      disabled={savingUpdate}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium"
                    >
                      {savingUpdate ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>

                {/* 작성된 근황 목록 */}
                <div>
                  <h4 className="font-medium text-slate-800 mb-3">
                    작성된 근황 ({updates.length}명)
                  </h4>
                  {updates.length === 0 ? (
                    <p className="text-slate-500 text-sm">아직 작성된 근황이 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {updates.map((u) => (
                        <div
                          key={u.id}
                          className="p-4 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-900">{u.author_name}</span>
                            <span className="text-xs text-slate-400">
                              {new Date(u.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-line">{u.content}</p>
                          {u.optional_link && (
                            <a
                              href={u.optional_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-amber-600 hover:underline mt-2 inline-block"
                            >
                              링크 열기 →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View 모드 - 오프라인 모임용 전체 보기 (풀스크린) */}
        {showViewMode && selectedEventForUpdates && (
          <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-slate-800 text-white shrink-0">
              <h2 className="text-xl font-medium">
                {selectedEventForUpdates.title} — 근황 전체 보기
              </h2>
              <button
                onClick={() => setShowViewMode(false)}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
              {updates.length === 0 ? (
                <p className="text-slate-400 text-center py-20">아직 작성된 근황이 없습니다.</p>
              ) : (
                <div className="space-y-8">
                  {updates.map((u, idx) => (
                    <div
                      key={u.id}
                      className="bg-slate-800 rounded-2xl p-8 border border-slate-700"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl font-bold text-amber-400">{idx + 1}</span>
                        <h3 className="text-2xl font-semibold text-white">{u.author_name}</h3>
                      </div>
                      <p className="text-lg text-slate-200 whitespace-pre-line leading-relaxed">
                        {u.content}
                      </p>
                      {u.optional_link && (
                        <a
                          href={u.optional_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 text-base mt-3 inline-block"
                        >
                          링크 열기 →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CalendarSection;
