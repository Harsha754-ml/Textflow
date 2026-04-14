import { ExportButton } from '../components/ExportButton';
import { MessageTable } from '../components/MessageTable';

export function HistoryPage() {
  return (
    <div className="page-stack">
      <div className="toolbar-row">
        <div>
          <div className="panel-kicker">Filters</div>
          <h2>Search and sort the message archive</h2>
        </div>
        <ExportButton />
      </div>
      <MessageTable />
    </div>
  );
}
