import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createAutomationRule, deleteAutomationRule, getAutomationLogs, getAutomationRules, runAutomationCycle, testAutomationRule, toggleAutomationRule } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function AutomationPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sample, setSample] = useState({ name: '', trigger_value: '', action_text: '' });
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);

  const refresh = async () => {
    const [rulesRes, logsRes] = await Promise.all([getAutomationRules(), getAutomationLogs({ page: 1, limit: 20 })]);
    setRules(rulesRes.items || []);
    setLogs(logsRes.items || []);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createSampleRule = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      return;
    }

    try {
      await createAutomationRule({
        name: sample.name || 'Auto reply',
        enabled: true,
        trigger_type: 'keyword',
        trigger_value: sample.trigger_value || 'hello',
        action_type: 'auto_reply',
        action_config: { body: sample.action_text || 'Acknowledged' },
        priority: 0,
      });
      toast.success('Rule created');
      setSample({ name: '', trigger_value: '', action_text: '' });
      await refresh();
    } catch {
      toast.error('Could not create rule');
    }
  };

  const runRuleTest = async (ruleId) => {
    if (!isAdmin) {
      return;
    }

    try {
      const result = await testAutomationRule(ruleId, testInput);
      setTestResult(result);
      toast.success('Rule test complete');
    } catch {
      toast.error('Rule test failed');
    }
  };

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">Automation</div>
            <h2>Rules</h2>
          </div>
          {isAdmin ? <button type="button" className="btn btn-secondary" onClick={() => void runAutomationCycle()}>Run cycle</button> : null}
        </div>

        {isAdmin ? (
          <form className="grid-form" onSubmit={createSampleRule}>
            <input placeholder="Rule name" value={sample.name} onChange={(e) => setSample((x) => ({ ...x, name: e.target.value }))} />
            <input placeholder="Keyword" value={sample.trigger_value} onChange={(e) => setSample((x) => ({ ...x, trigger_value: e.target.value }))} />
            <input placeholder="Reply body" value={sample.action_text} onChange={(e) => setSample((x) => ({ ...x, action_text: e.target.value }))} />
            <button type="submit" className="btn btn-primary">Save rule</button>
          </form>
        ) : null}

        {isAdmin ? (
          <div className="grid-form">
            <input
              className="col-span-3"
              placeholder="Sample message for rule test"
              value={testInput}
              onChange={(event) => setTestInput(event.target.value)}
            />
            <div className="muted">Use any rule test button below.</div>
          </div>
        ) : null}

        <div className="table-wrap">
          <table className="message-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Trigger</th>
                <th>Action</th>
                <th>Enabled</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td>{rule.trigger_type}: {rule.trigger_value}</td>
                  <td>{rule.action_type}</td>
                  <td>{String(rule.enabled)}</td>
                  <td>
                    {isAdmin ? (
                      <div className="row-actions">
                        <button type="button" className="icon-btn" onClick={() => void runRuleTest(rule.id)}>test</button>
                        <button type="button" className="icon-btn" onClick={() => void toggleAutomationRule(rule.id).then(refresh)}>t</button>
                        <button type="button" className="icon-btn danger" onClick={() => void deleteAutomationRule(rule.id).then(refresh)}>x</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rules.length === 0 ? (
                <tr><td className="empty-state" colSpan="5">No rules configured.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {testResult ? (
          <div className="detail-pre" style={{ marginTop: 12 }}>
            {JSON.stringify(testResult, null, 2)}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">Automation</div>
            <h2>Logs</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="message-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Message ID</th>
                <th>Action</th>
                <th>Result</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id}>
                  <td>{item.rule_id}</td>
                  <td>{item.message_id}</td>
                  <td>{item.action_taken}</td>
                  <td><span className={`status-chip ${item.result === 'failed' ? 'failed' : 'sent'}`}>{item.result}</span></td>
                  <td>{item.created_at}</td>
                </tr>
              ))}
              {logs.length === 0 ? <tr><td colSpan="5" className="empty-state">No logs yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
