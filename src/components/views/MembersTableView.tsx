import { styles } from '../../styles';
import { TEXT } from '../../constants/strings';

interface Member {
  uid: string;
  userName: string;
  role: string;
}

interface Props {
  members: Member[];
  currentUserUid: string;
  displayCode: string;
  isProcessing: boolean;
  onReissue: () => void;
  onRemove: (uid: string, name: string) => void;
}

export const MembersTableView = ({ 
  members, currentUserUid, displayCode, isProcessing, onReissue, onRemove 
}: Props) => {
  return (
    <div style={styles.tableHalf}>
      <div style={styles.actionRow}>
        <h3>{TEXT.MEMBERS.TITLE} <span style={{fontSize: '14px', color: '#666'}}>({members.length})</span></h3>
      </div>
      
      <div style={styles.inviteBox}>
        <span>
          {TEXT.MEMBERS.CODE_LABEL} <strong style={{fontSize: '1.2em', marginLeft: '5px'}}>{displayCode}</strong>
        </span>
        <button 
          onClick={onReissue} 
          style={{...styles.reissueBtn, opacity: isProcessing ? 0.5 : 1}}
          disabled={isProcessing}
        >
          {isProcessing ? TEXT.COMMON.LOADING : TEXT.MEMBERS.BTN_REISSUE}
        </button>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th>{TEXT.LOGS.TH_NAME}</th>
              <th>{TEXT.LOGS.TH_TYPE}</th>{/* ここは権限なのでTYPEで代用か独自のキーを作る */}
              <th>{TEXT.COMMON.CANCEL}</th>{/* 操作列 */}
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.uid} style={styles.tr}>
                <td style={styles.td}>
                  {m.userName} 
                  {m.uid === currentUserUid && <span style={{fontSize: '10px', color: '#888', marginLeft: '4px'}}>{TEXT.MEMBERS.YOU}</span>}
                </td>
                <td style={styles.td}>
                  {m.role === 'admin' ? 
                    <span style={{color: '#d35400', fontWeight: 'bold'}}>{TEXT.MEMBERS.ROLE_ADMIN}</span> : TEXT.MEMBERS.ROLE_USER
                  }
                </td>
                <td style={styles.td}>
                  {m.uid !== currentUserUid && (
                    <button 
                      onClick={() => onRemove(m.uid, m.userName)} 
                      style={{...styles.deleteBtn, opacity: isProcessing ? 0.5 : 1}}
                      disabled={isProcessing}
                    >
                      {TEXT.MEMBERS.BTN_REMOVE}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={3} style={{...styles.td, textAlign: 'center'}}>{TEXT.MEMBERS.EMPTY}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
