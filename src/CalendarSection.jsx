import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, X, MapPin, Clock, ChevronLeft, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';

const CalendarSection = ({ editMode = false }) => {
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

  // 이벤트 삭제
  const deleteEvent = async (event) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      await fetchEvents();
      alert('삭제되었습니다!');
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제에 실패했습니다: ' + error.message);
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
      case '일반': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case '운영': return 'bg-blue-100 text-blue-800';
      case '공지': return 'bg-amber-100 text-amber-800';
      case '일반': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
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
                className="group cursor-pointer"
                onClick={() => openEventForm(event)}
              >
                <div className={`text-xs px-2 py-1 rounded truncate ${getTypeBadgeColor(event.type)} hover:opacity-80`}>
                  {event.title}
                </div>
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
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
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
                    타입 *
                  </label>
                  <div className="flex space-x-3">
                    {['운영', '공지', '일반'].map(type => (
                      <button
                        key={type}
                        onClick={() => setEventForm({ ...eventForm, type })}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                          eventForm.type === type
                            ? type === '운영' 
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : type === '공지'
                              ? 'border-amber-500 bg-amber-50 text-amber-700'
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
      </div>
    </section>
  );
};

export default CalendarSection;
