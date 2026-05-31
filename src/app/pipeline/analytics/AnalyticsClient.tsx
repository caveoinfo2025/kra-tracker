"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from "recharts";
import { LEAD_STAGE_LABELS, OPP_STAGE_LABELS } from "@/types/pipeline";

const BRAND = "#CC2229";
const COLORS = [BRAND, "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#6B7280"];

type Analytics = {
  leads: {
    total: number; recent: number; qualified: number; pocDemo: number;
    byStage: { stage: string; count: number }[];
  };
  opportunities: {
    total: number; active: number; won: number; lost: number;
    totalPipelineValue: number; weightedForecast: number; wonValue: number;
    proposalToWinRatio: number;
    byStage: { stage: string; count: number; value: number }[];
  };
  tasks: { total: number; overdue: number; completed: number };
  employeeMetrics: {
    employee: { id: number; name: string };
    totalLeads: number; totalOpps: number; wonDeals: number;
    wonValue: number; totalTasks: number; conversionPct: number;
  }[];
  period: { days: number; since: string };
};

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? "text-[#CC2229]"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsClient({ isManager }: { isManager: boolean }) {
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days,    setDays]    = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pipeline/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white border rounded-xl p-5 h-24 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!data) return <p className="text-red-600">Failed to load analytics.</p>;

  const { leads, opportunities: opps, tasks, employeeMetrics } = data;

  const leadFunnelData = leads.byStage.map((s) => ({
    name: LEAD_STAGE_LABELS[s.stage as keyof typeof LEAD_STAGE_LABELS] ?? s.stage,
    count: s.count,
  }));

  const oppFunnelData = opps.byStage.map((s) => ({
    name: OPP_STAGE_LABELS[s.stage as keyof typeof OPP_STAGE_LABELS] ?? s.stage,
    count: s.count,
    value: s.value,
  }));

  const winLossData = [
    { name: "Won",   value: opps.won,  fill: "#10B981" },
    { name: "Lost",  value: opps.lost, fill: "#EF4444" },
    { name: "Active",value: opps.active, fill: BRAND   },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Period:</span>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              days === d ? "bg-[#CC2229] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {d}d
          </button>
        ))}
      </div>

      {/* ── Top stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Leads"    value={String(leads.total)}   sub={`${leads.recent} new in ${days}d`} />
        <StatCard label="Qualified+"     value={String(leads.qualified)} sub="incl. proposal stage" color="text-indigo-600" />
        <StatCard label="Pipeline Value" value={`₹${opps.totalPipelineValue.toFixed(1)}L`} />
        <StatCard label="Weighted Fcst"  value={`₹${opps.weightedForecast.toFixed(1)}L`} color="text-blue-600" />
        <StatCard label="Won Value"      value={`₹${opps.wonValue.toFixed(1)}L`} color="text-green-700" />
        <StatCard label="Win Rate"       value={`${(opps.proposalToWinRatio * 100).toFixed(0)}%`} sub={`${opps.won} won / ${opps.total} total`} />
        <StatCard label="Overdue Tasks"  value={String(tasks.overdue)}  color={tasks.overdue > 0 ? "text-red-600" : "text-green-700"} />
        <StatCard label="POC / Demo"     value={String(leads.pocDemo)}  sub="leads at demo stage" color="text-orange-600" />
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead stage funnel */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Lead Stage Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={leadFunnelData} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={BRAND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Opportunity funnel */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Opportunity Funnel (₹L)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={oppFunnelData} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `₹${Number(v).toFixed(1)}L`} />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Value (₹L)" />
              <Bar dataKey="count" fill={BRAND} radius={[4, 4, 0, 0]} name="Count" />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win / Loss pie */}
        <div className="bg-white rounded-xl border p-5 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 self-start">Win / Loss / Active</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={winLossData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {winLossData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Task health */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Health</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: "Completed", value: tasks.completed, fill: "#10B981" },
                  { name: "Overdue",   value: tasks.overdue,   fill: "#EF4444" },
                  { name: "Open",      value: Math.max(0, tasks.total - tasks.completed - tasks.overdue), fill: "#F59E0B" },
                ]}
                cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
              >
                {[0, 1, 2].map((i) => (
                  <Cell key={i} fill={["#10B981", "#EF4444", "#F59E0B"][i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Employee metrics (manager only) ───────────────────────────────── */}
      {isManager && employeeMetrics.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Employee Performance</h3>
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Employee", "Leads", "Opportunities", "Won", "Won Value", "Tasks", "Conv. %"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employeeMetrics.map((m) => (
                  <tr key={m.employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{m.employee.name}</td>
                    <td className="px-4 py-3">{m.totalLeads}</td>
                    <td className="px-4 py-3">{m.totalOpps}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{m.wonDeals}</td>
                    <td className="px-4 py-3 font-semibold text-[#CC2229]">₹{m.wonValue.toFixed(1)}L</td>
                    <td className="px-4 py-3">{m.totalTasks}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${m.conversionPct >= 50 ? "text-green-700" : m.conversionPct >= 25 ? "text-amber-700" : "text-red-600"}`}>
                        {m.conversionPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar chart - employee comparison */}
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={employeeMetrics.map((m) => ({ name: m.employee.name, leads: m.totalLeads, won: m.wonDeals }))}
                margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="leads" fill={BRAND} radius={[4, 4, 0, 0]} name="Leads" />
                <Bar dataKey="won"   fill="#10B981" radius={[4, 4, 0, 0]} name="Won" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
