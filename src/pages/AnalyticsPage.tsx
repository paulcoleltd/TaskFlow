import { useTaskStore } from '../store/taskStore';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const CHART_STYLE = { backgroundColor: '#111C44', border: '1px solid #1F3461', borderRadius: 8, color: '#E2E8F0', fontSize: 12 };

export default function AnalyticsPage() {
  const { tasks } = useTaskStore();

  const statusData = STATUS_OPTIONS.map(s => ({ name: s.label, value: tasks.filter(t => t.status === s.value).length, colour: s.colour }));
  const priorityData = PRIORITY_OPTIONS.map(p => ({ name: p.label, value: tasks.filter(t => t.priority === p.value).length, colour: p.colour }));
  const weeklyCompleted = [
    { week: 'W1', completed: 4 }, { week: 'W2', completed: 7 }, { week: 'W3', completed: 5 },
    { week: 'W4', completed: 9 }, { week: 'W5', completed: 6 }, { week: 'W6', completed: 11 },
    { week: 'W7', completed: 8 }, { week: 'W8', completed: tasks.filter(t => t.status === 'done').length },
  ];

  const done = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => { if (!t.dueDate || t.status === 'done') return false; return new Date(t.dueDate) < new Date(); }).length;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, colour: '#3B82F6' },
          { label: 'Completed', value: done, colour: '#10B981' },
          { label: 'Overdue', value: overdue, colour: '#EF4444' },
          { label: 'Completion Rate', value: `${tasks.length ? Math.round((done / tasks.length) * 100) : 0}%`, colour: '#8B5CF6' },
        ].map(({ label, value, colour }) => (
          <div key={label} className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold" style={{ color: colour }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Completed Per Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyCompleted} barSize={20}>
              <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: '#1B254B' }} />
              <Bar dataKey="completed" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {statusData.map((e, i) => <Cell key={i} fill={e.colour} />)}
              </Pie>
              <Tooltip contentStyle={CHART_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Priority Breakdown</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={priorityData} layout="vertical" barSize={16}>
              <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: '#1B254B' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {priorityData.map((e, i) => <Cell key={i} fill={e.colour} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111C44] border border-[#1F3461] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Completion Trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weeklyCompleted}>
              <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={CHART_STYLE} />
              <Line type="monotone" dataKey="completed" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
