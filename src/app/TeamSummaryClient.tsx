"use client";

import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

type EmpRow = {
  id: number;
  name: string;
  role: string;
  avgProgress: number;
  pipelineLakhs: number;
  qualifiedLeads: number;
  proposalCount: number;
};

type StageData = { stage: string; value: number };

type Props = {
  period: string;
  activePipeline: number;
  qualifiedLeads: number;
  proposalsSent: number;
  avgKraScore: number;
  employees: EmpRow[];
  stageData: StageData[];
};

const STAGE_COLORS: Record<string, string> = {
  Lead:            "#94a3b8",
  Qualified:       "#60a5fa",
  "Proposal Sent": "#f59e0b",
  Negotiation:     "#a78bfa",
  "Closed Won":    "#22c55e",
  "Closed Lost":   "#ef4444",
};

function statusVariant(pct: number) {
  if (pct >= 75) return { label: "Green", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
  if (pct >= 40) return { label: "Amber", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" };
  return { label: "Red", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
}

const CHART_COLORS = ["#CC2229", "#1d4ed8", "#d97706", "#7c3aed", "#059669", "#dc2626"];

export default function TeamSummaryClient({
  period,
  activePipeline,
  qualifiedLeads,
  proposalsSent,
  avgKraScore,
  employees,
  stageData,
}: Props) {
  const barData = employees.map((e) => ({
    name: e.name.split(" ")[0],
    score: parseFloat(e.avgProgress.toFixed(1)),
  }));

  return (
    <div className="bg-white rounded-xl border shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <span className="text-base">📊</span>
        <h2 className="font-semibold text-gray-800">
          Team Summary
          <span className="text-gray-400 font-normal text-sm ml-2">· {period}</span>
        </h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b">
        <div className="p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Active Pipeline</p>
          <p className="text-2xl font-bold text-[#1d4ed8]">₹{activePipeline.toFixed(0)}L</p>
          <p className="text-xs text-gray-400 mt-0.5">Open opportunities</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Qualified Leads</p>
          <p className="text-2xl font-bold text-green-600">{qualifiedLeads}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total qualified this Q</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Proposals Sent</p>
          <p className="text-2xl font-bold text-amber-600">{proposalsSent}</p>
          <p className="text-xs text-gray-400 mt-0.5">Awaiting decision</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Avg KRA Score</p>
          <p className="text-2xl font-bold text-[#CC2229]">{avgKraScore.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-0.5">Team average Q1</p>
        </div>
      </div>

      {/* Employee KRA table */}
      <div className="px-5 py-4 border-b">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <span>👥</span> Employee KRA Scores
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left pb-2 pr-4 font-semibold">Employee</th>
                <th className="text-left pb-2 pr-4 font-semibold">Designation</th>
                <th className="text-left pb-2 pr-4 font-semibold min-w-[160px]">KRA Score</th>
                <th className="text-left pb-2 pr-4 font-semibold">Pipeline (₹L)</th>
                <th className="text-left pb-2 pr-4 font-semibold">Qualified Leads</th>
                <th className="text-left pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => {
                const sv = statusVariant(emp.avgProgress);
                return (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="font-semibold text-gray-900 hover:text-[#CC2229] transition"
                      >
                        {emp.name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">{emp.role}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[100px]">
                          <div
                            className="h-1.5 rounded-full bg-[#CC2229] transition-all"
                            style={{ width: `${Math.min(100, emp.avgProgress)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold w-10 text-right ${emp.avgProgress >= 75 ? "text-green-600" : emp.avgProgress >= 40 ? "text-amber-600" : "text-[#CC2229]"}`}>
                          {emp.avgProgress.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-700 font-medium">
                      ₹{emp.pipelineLakhs.toFixed(1)}L
                    </td>
                    <td className="py-2.5 pr-4 text-gray-700">{emp.qualifiedLeads}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sv.bg} ${sv.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sv.dot}`} />
                        {sv.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x divide-gray-100">
        {/* Bar chart: KRA Score by Employee */}
        <div className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-1.5">
            <span>📈</span> KRA Score by Employee (%)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} unit="%" />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(1)}%`, "KRA Score"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.score >= 75 ? "#22c55e" : entry.score >= 40 ? "#f59e0b" : "#CC2229"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart: Pipeline by Stage */}
        <div className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-1.5">
            <span>📉</span> Pipeline by Stage (₹ Lakhs)
          </h3>
          {stageData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
              No pipeline data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stageData}
                  dataKey="value"
                  nameKey="stage"
                  cx="45%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {stageData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={STAGE_COLORS[entry.stage] ?? CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: "#6b7280" }}>{v}</span>}
                />
                <Tooltip
                  formatter={(v) => [`₹${Number(v).toFixed(1)}L`, ""]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
