import { ResponsiveContainer, ComposedChart, Line, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const STATUS_COLORS = {
  Pending: '#f59e0b',
  'In Progress': '#3b82f6',
  Resolved: '#10b981',
  Active: '#6366f1',
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e',
};

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function ChartFrame({ title, subtitle, children, tone = 'slate' }) {
  const tones = {
    slate: 'from-slate-950 via-slate-900 to-slate-800 border-slate-800/60',
    blue: 'from-sky-950 via-blue-950 to-indigo-950 border-sky-900/40',
    emerald: 'from-emerald-950 via-teal-950 to-slate-900 border-emerald-900/40',
    amber: 'from-amber-950 via-orange-950 to-slate-900 border-amber-900/40',
  };

  return (
    <div className={`relative overflow-hidden rounded-4xl border bg-linear-to-br ${tones[tone] || tones.slate} text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]`}>
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_32%)]" />
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
          <p className="text-xs text-white/65 font-medium">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function SharedTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-bold text-slate-900 mb-1">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-xs font-medium text-slate-600">
          <span style={{ color: item.color }} className="font-bold">{item.name || item.dataKey}</span>: {formatNumber(item.value)}
        </p>
      ))}
    </div>
  );
}

export function DashboardTrendChart({ title, subtitle, data, dataKey, nameKey = 'dateLabel', color = '#60a5fa', tone = 'blue' }) {
  const hasValues = data.some((item) => Number(item?.[dataKey] ?? 0) > 0);

  return (
    <ChartFrame title={title} subtitle={subtitle} tone={tone}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 6, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={`dash-grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.9} />
                <stop offset="95%" stopColor={color} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.10)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey={nameKey}
              tick={{ fill: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              minTickGap={12}
            />
            <YAxis
              width={28}
              tick={{ fill: 'rgba(255,255,255,0.52)', fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, hasValues ? 'dataMax + 1' : 1]}
            />
            <Tooltip content={<SharedTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey={dataKey} stroke="transparent" fill={`url(#dash-grad-${dataKey})`} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={4}
              dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 7, strokeWidth: 0, fill: color }}
              strokeLinecap="round"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function DashboardStatusChart({ title, subtitle, data, tone = 'emerald' }) {
  return (
    <ChartFrame title={title} subtitle={subtitle} tone={tone}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<SharedTooltip />} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={98} paddingAngle={3}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color || STATUS_COLORS[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.map((item) => (
          <div key={item.name} className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-white/55 font-extrabold">{item.name}</p>
            <p className="text-lg font-black text-white">{formatNumber(item.value)}</p>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}

export function DashboardBarChart({ title, subtitle, data, dataKey = 'value', xKey = 'name', tone = 'amber' }) {
  return (
    <ChartFrame title={title} subtitle={subtitle} tone={tone}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.10)" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
            <Tooltip content={<SharedTooltip />} />
            <Bar dataKey={dataKey} radius={[12, 12, 6, 6]} fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function StatusLegend({ items }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.name} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || STATUS_COLORS[item.name] || '#94a3b8' }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}
