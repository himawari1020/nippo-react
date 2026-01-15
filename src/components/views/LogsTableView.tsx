import { styles } from '../../styles';
import { TEXT } from '../../constants/strings';

interface Props {
  logs: any[];
  role: string | null;
  onDownloadCSV: () => void;
}

export const LogsTableView = ({ logs, role, onDownloadCSV }: Props) => {
  return (
    <div style={role === 'admin' ? styles.tableHalf : {width: '100%'}}>
      <div style={styles.actionRow}>
        <h3>{role === 'admin' ? TEXT.LOGS.ADMIN_TITLE : TEXT.LOGS.USER_TITLE}</h3> 
        {role === 'admin' && (
          <button onClick={onDownloadCSV} style={styles.csvBtn}>{TEXT.LOGS.BTN_CSV}</button>
        )}
      </div>
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th>{TEXT.LOGS.TH_NAME}</th>
              <th>{TEXT.LOGS.TH_TYPE}</th>
              <th>{TEXT.LOGS.TH_TIME}</th>
            </tr>
          </thead>
          <tbody>
            {logs.slice(0, 20).map(l => (
              <tr key={l.id} style={styles.tr}>
                <td style={styles.td}>{l.userName}</td>
                <td style={styles.td}>{l.type === 'clock_in' ? TEXT.LOGS.TYPE_IN : TEXT.LOGS.TYPE_OUT}</td>
                <td style={styles.td}>
                  {l.timestamp?.toDate().toLocaleString()}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={3} style={{...styles.td, textAlign: 'center'}}>{TEXT.LOGS.EMPTY}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
