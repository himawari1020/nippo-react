import { TEXT } from '../constants/strings';
import { LogsTableView } from './views/LogsTableView';

interface Props {
  logs: any[];
  role: string | null;
}

export const LogsTable = ({ logs, role }: Props) => {
  const downloadCSV = () => {
    let csv = `\uFEFF${TEXT.LOGS.TH_NAME},${TEXT.LOGS.TH_TYPE},${TEXT.LOGS.TH_TIME}\n`;
    logs.forEach(l => {
      const timeStr = l.timestamp?.toDate().toLocaleString() || "";
      const typeStr = l.type === 'clock_in' ? TEXT.LOGS.TYPE_IN : TEXT.LOGS.TYPE_OUT;
      csv += `${l.userName},${typeStr},${timeStr}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance.csv";
    link.click();
  };

  return (
    <LogsTableView 
      logs={logs}
      role={role}
      onDownloadCSV={downloadCSV}
    />
  );
};
