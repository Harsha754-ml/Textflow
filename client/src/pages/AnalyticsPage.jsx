import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Scatter,
  ScatterChart,
  ZAxis,
} from 'recharts';
import { getAnalyticsDeliveryRate, getAnalyticsSummary, getAnalyticsTopContacts, getAnalyticsVolume, getAnalyticsHeatmap, getAnalyticsResponseTime } from '../api/client';

const DONUT_COLORS = {
  sent: '#1e3a5f',
  delivered: '#22c55e',
  failed: '#ef4444',
  received: '#818cf8',
};

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function toRangeBounds(startDate, endDate) {
  return {
    from: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
    to: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
  };
}

export function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [volume, setVolume] = useState([]);
  const [delivery, setDelivery] = useState([]);
  const [topContacts, setTopContacts] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [responseTime, setResponseTime] = useState([]);
  const today = toDateInputValue(new Date());
  const thirtyDaysAgo = toDateInputValue(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    const { from, to } = toRangeBounds(startDate, endDate);

    const run = async () => {
      const [summaryRes, volumeRes, deliveryRes, topRes, heatmapRes, rtRes] = await Promise.all([
        getAnalyticsSummary({ from, to }),
        getAnalyticsVolume({ from, to }),
        getAnalyticsDeliveryRate({ from, to }),
        getAnalyticsTopContacts({ limit: 10, from, to }),
        getAnalyticsHeatmap({ from, to }),
        getAnalyticsResponseTime({ from, to }),
      ]);

      setSummary(summaryRes);
      setVolume(volumeRes.items || []);
      setDelivery(deliveryRes.items || []);
      setTopContacts(topRes.items || []);
      setHeatmap(heatmapRes.items || []);
      setResponseTime(rtRes.items || []);
    };

    void run();
  }, [startDate, endDate]);

  const donutData = [
    { name: 'sent', value: summary?.sent || 0 },
    { name: 'delivered', value: summary?.delivered || 0 },
    { name: 'failed', value: summary?.failed || 0 },
    { name: 'received', value: summary?.received || 0 },
  ].filter((item) => item.value > 0);

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header wrap">
          <div>
            <div className="panel-kicker">Analytics</div>
            <h2>Date range</h2>
          </div>
          <div className="analytics-range-controls">
            <label className="field compact">
              <span>From</span>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="field compact">
              <span>To</span>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
          </div>
        </div>
      </section>

      <section className="stats-grid analytics-stats analytics-summary-grid">
        <article className="stat-card"><div><div className="stat-label">Sent</div><div className="stat-value">{summary?.sent || 0}</div></div></article>
        <article className="stat-card"><div><div className="stat-label">Delivered</div><div className="stat-value">{summary?.delivered || 0}</div></div></article>
        <article className="stat-card"><div><div className="stat-label">Failed</div><div className="stat-value">{summary?.failed || 0}</div></div></article>
        <article className="stat-card"><div><div className="stat-label">Received</div><div className="stat-value">{summary?.received || 0}</div></div></article>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Volume over time</h2></div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={volume}>
              <CartesianGrid stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="bucket" stroke="#6b7280" tickLine={false} axisLine={{ stroke: '#1f1f1f' }} />
              <YAxis stroke="#6b7280" tickLine={false} axisLine={{ stroke: '#1f1f1f' }} />
              <Tooltip contentStyle={{ background: '#111111', border: '1px solid #1f1f1f' }} />
              <Bar dataKey="inbound" stackId="volume" fill="#3b82f6" />
              <Bar dataKey="outbound" stackId="volume" fill="#1e3a5f" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Delivery rate</h2></div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={delivery}>
              <CartesianGrid stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="bucket" stroke="#6b7280" tickLine={false} axisLine={{ stroke: '#1f1f1f' }} />
              <YAxis stroke="#6b7280" tickLine={false} axisLine={{ stroke: '#1f1f1f' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#111111', border: '1px solid #1f1f1f' }} />
              <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Status breakdown</h2></div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip contentStyle={{ background: '#111111', border: '1px solid #1f1f1f' }} />
              <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={100} paddingAngle={2}>
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={DONUT_COLORS[entry.name]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Top contacts</h2></div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topContacts} layout="vertical">
              <CartesianGrid stroke="#1f1f1f" horizontal={false} />
              <XAxis type="number" stroke="#6b7280" tickLine={false} axisLine={{ stroke: '#1f1f1f' }} />
              <YAxis type="category" dataKey="phone" width={120} stroke="#6b7280" tickLine={false} axisLine={{ stroke: '#1f1f1f' }} />
              <Tooltip contentStyle={{ background: '#111111', border: '1px solid #1f1f1f' }} />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Hourly Heatmap</h2></div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid stroke="#1f1f1f" />
              <XAxis dataKey="hourIdx" type="number" name="Hour" domain={[0, 23]} stroke="#6b7280" tickCount={12} />
              <YAxis dataKey="dayIdx" type="number" name="Day (0=Sun)" domain={[0, 6]} stroke="#6b7280" tickCount={7} />
              <ZAxis dataKey="count" type="number" range={[20, 400]} name="Volume" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#111111', border: '1px solid #1f1f1f' }} />
              <Scatter data={heatmap} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Avg Response Time (ms)</h2></div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={responseTime}>
              <CartesianGrid stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="bucket" stroke="#6b7280" tickLine={false} axisLine={{ stroke: '#1f1f1f' }} />
              <YAxis stroke="#6b7280" tickLine={false} axisLine={{ stroke: '#1f1f1f' }} />
              <Tooltip contentStyle={{ background: '#111111', border: '1px solid #1f1f1f' }} />
              <Line type="step" dataKey="avgMs" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
