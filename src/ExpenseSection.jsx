import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit3, Save, X, TrendingDown, TrendingUp, Wallet, PiggyBank, ChevronDown } from 'lucide-react';
import { supabase } from '../supabase';

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const fmt = (n) => (n || 0).toLocaleString('ko-KR');

const emptyForm = { item: '', expense: '', income: '', note: '' };

export default function ExpenseSection({ editMode }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbMissing, setDbMissing] = useState(false);

  // 편집 상태
  const [addingRow, setAddingRow] = useState(false);
  const [newForm, setNewForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // 예산 편집
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: expData, error: expErr }, { data: budgetData, error: budgetErr }] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('year', selectedYear)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('annual_budget')
          .select('*')
          .eq('year', selectedYear)
          .single(),
      ]);

      if (expErr?.code === '42P01' || budgetErr?.code === '42P01') {
        setDbMissing(true);
        return;
      }
      setDbMissing(false);
      setExpenses(expData || []);
      setBudget(budgetData || null);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 연간 합계
  const annualExpense = expenses.reduce((s, r) => s + (r.expense || 0), 0);
  const annualIncome = expenses.reduce((s, r) => s + (r.income || 0), 0);
  const annualBalance = (budget?.total_fee || 0) + annualIncome - annualExpense;

  // 월별 필터
  const monthRows = expenses.filter((r) => r.month === selectedMonth);
  const monthExpense = monthRows.reduce((s, r) => s + (r.expense || 0), 0);
  const monthIncome = monthRows.reduce((s, r) => s + (r.income || 0), 0);

  // 예산 저장
  const saveBudget = async () => {
    const val = parseInt(budgetInput.replace(/,/g, ''), 10);
    if (isNaN(val) || val < 0) { alert('올바른 금액을 입력해주세요.'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('annual_budget')
      .upsert({ year: selectedYear, total_fee: val }, { onConflict: 'year' });
    setSaving(false);
    if (error) { alert('저장 실패: ' + error.message); return; }
    setEditingBudget(false);
    fetchData();
  };

  // 항목 추가
  const addRow = async () => {
    if (!newForm.item.trim()) { alert('항목명을 입력해주세요.'); return; }
    const expense = parseInt(newForm.expense.replace(/,/g, ''), 10) || 0;
    const income = parseInt(newForm.income.replace(/,/g, ''), 10) || 0;
    setSaving(true);
    const { error } = await supabase.from('expenses').insert({
      year: selectedYear,
      month: selectedMonth,
      item: newForm.item.trim(),
      expense,
      income,
      note: newForm.note.trim() || null,
    });
    setSaving(false);
    if (error) { alert('저장 실패: ' + error.message); return; }
    setAddingRow(false);
    setNewForm(emptyForm);
    fetchData();
  };

  // 항목 수정
  const updateRow = async (id) => {
    if (!editForm.item.trim()) { alert('항목명을 입력해주세요.'); return; }
    const expense = parseInt(editForm.expense.toString().replace(/,/g, ''), 10) || 0;
    const income = parseInt(editForm.income.toString().replace(/,/g, ''), 10) || 0;
    setSaving(true);
    const { error } = await supabase
      .from('expenses')
      .update({ item: editForm.item.trim(), expense, income, note: editForm.note || null })
      .eq('id', id);
    setSaving(false);
    if (error) { alert('수정 실패: ' + error.message); return; }
    setEditingId(null);
    fetchData();
  };

  // 항목 삭제
  const deleteRow = async (id) => {
    if (!window.confirm('이 항목을 삭제할까요?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { alert('삭제 실패: ' + error.message); return; }
    fetchData();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({ item: row.item, expense: row.expense || 0, income: row.income || 0, note: row.note || '' });
    setAddingRow(false);
  };

  if (loading) {
    return (
      <section id="finance" className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section id="finance" className="py-20 px-4 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h3 className="text-4xl md:text-5xl font-light text-slate-900 mb-4">재정 현황</h3>
          <p className="text-slate-500">모임 운영 비용을 투명하게 관리합니다</p>
          <div className="h-1 w-24 bg-amber-600 mx-auto mt-6" />
        </div>

        {dbMissing && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <strong>DB 설정 필요:</strong> Supabase에서 <code>supabase/expenses.sql</code>을 실행해주세요.
          </div>
        )}

        {/* 연도 선택 */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex gap-2">
            {[2024, 2025, 2026].map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedYear === y
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-400'
                }`}
              >
                {y}년
              </button>
            ))}
          </div>
        </div>

        {/* 연간 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {/* 회비 총액 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <Wallet className="w-4 h-4" />
              <span>회비 총액</span>
            </div>
            {editMode && editingBudget ? (
              <div className="flex gap-1 mt-1">
                <input
                  type="text"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white text-base"
                  placeholder="24500000"
                  onKeyDown={(e) => e.key === 'Enter' && saveBudget()}
                />
                <button onClick={saveBudget} disabled={saving} className="p-1 text-amber-600 hover:text-amber-800">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingBudget(false)} className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-1">
                <span className="text-xl font-semibold text-slate-800">
                  {budget ? fmt(budget.total_fee) : '—'}
                </span>
                {editMode && (
                  <button
                    onClick={() => { setEditingBudget(true); setBudgetInput(String(budget?.total_fee || '')); }}
                    className="mb-0.5 text-slate-300 hover:text-amber-600"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 누적 지출 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-red-400 text-xs mb-2">
              <TrendingDown className="w-4 h-4" />
              <span>누적 지출</span>
            </div>
            <span className="text-xl font-semibold text-red-600">{fmt(annualExpense)}</span>
          </div>

          {/* 누적 수입 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-emerald-500 text-xs mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>찬조/기타 수입</span>
            </div>
            <span className="text-xl font-semibold text-emerald-600">{fmt(annualIncome)}</span>
          </div>

          {/* 현재 잔액 */}
          <div className={`rounded-2xl p-5 shadow-sm border ${
            annualBalance >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 text-amber-600 text-xs mb-2">
              <PiggyBank className="w-4 h-4" />
              <span>현재 잔액</span>
            </div>
            <span className={`text-xl font-semibold ${annualBalance >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
              {fmt(annualBalance)}
            </span>
          </div>
        </div>

        {/* 월별 탭 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* 월 선택 스크롤 */}
          <div className="overflow-x-auto border-b border-slate-100">
            <div className="flex min-w-max">
              {MONTHS.map((m, idx) => {
                const mn = idx + 1;
                const hasData = expenses.some((r) => r.month === mn);
                return (
                  <button
                    key={mn}
                    onClick={() => setSelectedMonth(mn)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                      selectedMonth === mn
                        ? 'border-amber-500 text-amber-700 bg-amber-50'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                    {hasData && (
                      <span className="ml-1 w-1.5 h-1.5 bg-amber-400 rounded-full inline-block align-middle" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wide bg-slate-50">
                  <th className="text-left px-5 py-3 font-medium">항목</th>
                  <th className="text-right px-4 py-3 font-medium">지출</th>
                  <th className="text-right px-4 py-3 font-medium">수입</th>
                  <th className="text-left px-4 py-3 font-medium">메모</th>
                  {editMode && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {monthRows.length === 0 && !addingRow && (
                  <tr>
                    <td colSpan={editMode ? 5 : 4} className="px-5 py-10 text-center text-slate-400">
                      {selectedMonth}월 내역이 없습니다.
                    </td>
                  </tr>
                )}
                {monthRows.map((row) =>
                  editingId === row.id ? (
                    <tr key={row.id} className="bg-amber-50">
                      <td className="px-3 py-2">
                        <input
                          autoFocus
                          value={editForm.item}
                          onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                          className="w-full border border-amber-300 rounded-lg px-2 py-1.5 text-sm bg-white text-base"
                          placeholder="항목명"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editForm.expense}
                          onChange={(e) => setEditForm({ ...editForm, expense: e.target.value })}
                          className="w-full border border-amber-300 rounded-lg px-2 py-1.5 text-sm text-right bg-white text-base"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editForm.income}
                          onChange={(e) => setEditForm({ ...editForm, income: e.target.value })}
                          className="w-full border border-amber-300 rounded-lg px-2 py-1.5 text-sm text-right bg-white text-base"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={editForm.note}
                          onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                          className="w-full border border-amber-300 rounded-lg px-2 py-1.5 text-sm bg-white text-base"
                          placeholder="메모"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => updateRow(row.id)}
                            disabled={saving}
                            className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id} className="hover:bg-slate-50 group transition-colors">
                      <td className="px-5 py-3 text-slate-800">{row.item}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        {row.expense ? fmt(row.expense) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {row.income ? fmt(row.income) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{row.note || ''}</td>
                      {editMode && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(row)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteRow(row.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                )}

                {/* 새 항목 입력 행 */}
                {addingRow && (
                  <tr className="bg-emerald-50">
                    <td className="px-3 py-2">
                      <input
                        autoFocus
                        value={newForm.item}
                        onChange={(e) => setNewForm({ ...newForm, item: e.target.value })}
                        className="w-full border border-emerald-300 rounded-lg px-2 py-1.5 text-sm bg-white text-base"
                        placeholder="항목명 *"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newForm.expense}
                        onChange={(e) => setNewForm({ ...newForm, expense: e.target.value })}
                        className="w-full border border-emerald-300 rounded-lg px-2 py-1.5 text-sm text-right bg-white text-base"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newForm.income}
                        onChange={(e) => setNewForm({ ...newForm, income: e.target.value })}
                        className="w-full border border-emerald-300 rounded-lg px-2 py-1.5 text-sm text-right bg-white text-base"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={newForm.note}
                        onChange={(e) => setNewForm({ ...newForm, note: e.target.value })}
                        className="w-full border border-emerald-300 rounded-lg px-2 py-1.5 text-sm bg-white text-base"
                        placeholder="메모"
                        onKeyDown={(e) => e.key === 'Enter' && addRow()}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={addRow}
                          disabled={saving}
                          className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setAddingRow(false); setNewForm(emptyForm); }}
                          className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* 합계 행 */}
              {(monthRows.length > 0 || addingRow) && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                    <td className="px-5 py-3 text-slate-700">합계</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(monthExpense)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{fmt(monthIncome)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 text-xs font-normal">
                      순지출 {fmt(monthExpense - monthIncome)}
                    </td>
                    {editMode && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* 항목 추가 버튼 */}
          {editMode && !addingRow && (
            <div className="px-5 py-4 border-t border-slate-100">
              <button
                onClick={() => { setAddingRow(true); setEditingId(null); }}
                className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900 font-medium"
              >
                <Plus className="w-4 h-4" />
                항목 추가
              </button>
            </div>
          )}
        </div>

        {/* 연간 월별 요약 */}
        <AnnualSummary expenses={expenses} budget={budget} editMode={editMode} />
      </div>
    </section>
  );
}

function AnnualSummary({ expenses, budget }) {
  const [open, setOpen] = useState(false);

  const monthSummary = MONTHS.map((label, idx) => {
    const mn = idx + 1;
    const rows = expenses.filter((r) => r.month === mn);
    const expense = rows.reduce((s, r) => s + (r.expense || 0), 0);
    const income = rows.reduce((s, r) => s + (r.income || 0), 0);
    return { label, mn, expense, income, net: expense - income };
  });

  const hasAnyData = monthSummary.some((m) => m.expense > 0 || m.income > 0);
  if (!hasAnyData) return null;

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-slate-700">연간 월별 요약</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wide bg-slate-50">
                <th className="text-left px-5 py-3 font-medium">월</th>
                <th className="text-right px-4 py-3 font-medium">지출</th>
                <th className="text-right px-4 py-3 font-medium">수입</th>
                <th className="text-right px-4 py-3 font-medium">순지출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthSummary
                .filter((m) => m.expense > 0 || m.income > 0)
                .map((m) => (
                  <tr key={m.mn} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-700 font-medium">{m.label}</td>
                    <td className="px-4 py-3 text-right text-red-500">{fmt(m.expense)}</td>
                    <td className="px-4 py-3 text-right text-emerald-500">{fmt(m.income)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(m.net)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                <td className="px-5 py-3 text-slate-700">합계</td>
                <td className="px-4 py-3 text-right text-red-600">
                  {fmt(monthSummary.reduce((s, m) => s + m.expense, 0))}
                </td>
                <td className="px-4 py-3 text-right text-emerald-600">
                  {fmt(monthSummary.reduce((s, m) => s + m.income, 0))}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {fmt(monthSummary.reduce((s, m) => s + m.net, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
