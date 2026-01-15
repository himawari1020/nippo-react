import { styles } from '../../styles';
import { TEXT } from '../../constants/strings';

interface Props {
  mode: 'create' | 'join';
  userName: string;
  setUserName: (val: string) => void;
  name: string; // 会社名
  setName: (val: string) => void;
  inviteCode: string;
  setInviteCode: (val: string) => void;
  isLoading: boolean;
  onToggleMode: () => void;
  onCreate: () => void;
  onJoin: () => void;
  onLogout: () => void;
}

export const CompanySetupView = ({
  mode, userName, setUserName, name, setName, inviteCode, setInviteCode,
  isLoading, onToggleMode, onCreate, onJoin, onLogout
}: Props) => {
  
  if (isLoading) {
    return (
      <div style={styles.card}>
        <div style={{textAlign: 'center', padding: '40px'}}>
          <p>{TEXT.COMMON.LOADING}</p>
          <p style={{fontSize: '12px', color: '#666'}}>{TEXT.COMMON.WAIT_SERVER}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h3>{mode === 'create' ? TEXT.SETUP.CREATE_MODE_TITLE : TEXT.SETUP.JOIN_MODE_TITLE}</h3>
      
      {/* 共通: ユーザー名 */}
      <div style={{marginBottom: '20px', textAlign: 'left'}}>
        <label style={{fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px'}}>
          {TEXT.SETUP.LABEL_USER_NAME}
        </label>
        <input 
          placeholder={TEXT.SETUP.PLACEHOLDER_USER} 
          value={userName} 
          onChange={(e) => setUserName(e.target.value)} 
          style={styles.input} 
        />
      </div>

      {mode === 'create' ? (
        <>
          <div style={{marginBottom: '20px', textAlign: 'left'}}>
             <label style={{fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px'}}>
               {TEXT.SETUP.LABEL_COMPANY_NAME}
             </label>
             <input 
               placeholder={TEXT.SETUP.PLACEHOLDER_COMPANY} 
               value={name} 
               onChange={(e) => setName(e.target.value)} 
               style={styles.input} 
             />
          </div>
          <button onClick={onCreate} style={styles.primaryBtn}>{TEXT.SETUP.BTN_CREATE}</button>
        </>
      ) : (
        <>
          <div style={{marginBottom: '20px', textAlign: 'left'}}>
            <label style={{fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px'}}>
              {TEXT.SETUP.LABEL_INVITE_CODE}
            </label>
            <input 
              placeholder={TEXT.SETUP.PLACEHOLDER_CODE} 
              value={inviteCode} 
              onChange={(e) => setInviteCode(e.target.value)} 
              style={styles.input} 
            />
          </div>
          <button onClick={onJoin} style={styles.primaryBtn}>{TEXT.SETUP.BTN_JOIN}</button>
        </>
      )}

      <div style={{marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
        <button onClick={onToggleMode} style={styles.textBtn}>
          {mode === 'create' ? TEXT.SETUP.LINK_TO_JOIN : TEXT.SETUP.LINK_TO_CREATE}
        </button>
        
        <div style={{marginTop: '15px'}}>
          <button onClick={onLogout} style={{background: 'none', border: 'none', color: '#999', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline'}}>
            {TEXT.SETUP.CANCEL_LOGOUT}
          </button>
        </div>
      </div>
    </div>
  );
};
