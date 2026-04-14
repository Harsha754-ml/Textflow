import { Download } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export function ExportButton() {
  const { exportHistory } = useAppData();

  return (
    <button type="button" className="btn btn-secondary" onClick={() => void exportHistory()}>
      <Download size={16} />
      Export CSV
    </button>
  );
}
