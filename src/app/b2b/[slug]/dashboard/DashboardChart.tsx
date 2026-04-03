"use client"
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardChartProps {
    data: Array<{
        day: string;
        emitidos: number;
        baseEmitidos: number;
        bonusEmitidos: number;
        canjeados: number;
        operaciones: number;
    }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3 shadow-2xl text-xs">
            <p className="text-slate-300 font-bold mb-2">{label}</p>
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-400">{entry.name}:</span>
                    <span className="font-mono text-white font-bold">{entry.value.toLocaleString()}</span>
                </div>
            ))}
            {/* Total emitidos (base + bonus) */}
            {payload.length >= 2 && payload[0]?.dataKey === 'baseEmitidos' && (
                <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-[#334155]">
                    <span className="text-slate-400">Total Emitidos:</span>
                    <span className="font-mono text-[#f69f09] font-bold">
                        {((payload[0]?.value || 0) + (payload[1]?.value || 0)).toLocaleString()}
                    </span>
                </div>
            )}
        </div>
    );
};

export default function DashboardChart({ data }: DashboardChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2 opacity-60">
                <p className="font-medium">Sin datos de tendencia</p>
                <p className="text-xs">Las métricas aparecerán cuando se registren transacciones.</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f69f09" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f69f09" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradBonus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCanjeados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="top"
                    height={28}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                        <span className="text-[11px] text-slate-400 font-medium">{value}</span>
                    )}
                />
                <Area
                    type="monotone"
                    dataKey="baseEmitidos"
                    name="Pts Base"
                    stroke="#f69f09"
                    strokeWidth={2}
                    fill="url(#gradBase)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#f69f09', stroke: '#0F172A', strokeWidth: 2 }}
                />
                <Area
                    type="monotone"
                    dataKey="bonusEmitidos"
                    name="Bonus Multiplicador"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="url(#gradBonus)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#a855f7', stroke: '#0F172A', strokeWidth: 2 }}
                />
                <Area
                    type="monotone"
                    dataKey="canjeados"
                    name="Pts Canjeados"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradCanjeados)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981', stroke: '#0F172A', strokeWidth: 2 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
