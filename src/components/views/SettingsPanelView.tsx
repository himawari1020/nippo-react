import { styles } from '../../styles';
import { TEXT } from '../../constants/strings';

interface Props {
  isLoading: boolean;
  onDeleteAccount: () => void;
  onClose: () => void;
}

export const SettingsPanelView = ({ isLoading, onDeleteAccount, onClose }: Props) => {
  if (isLoading) {
    return (
      <div style={styles.settingsCard}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          {TEXT.COMMON.LOADING}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.settingsCard}>
      <h3>{TEXT.SETTINGS.TITLE}</h3>
      <p style={styles.subText}>{TEXT.SETTINGS.DESC}</p>
      
      <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', marginTop: '20px' }}>
        <h4 style={{ color: '#fa3e3e', marginTop: 0 }}>{TEXT.SETTINGS.DANGER_ZONE}</h4>
        
        <button onClick={onDeleteAccount} style={styles.deleteAccountBtn}>
          {TEXT.SETTINGS.BTN_DELETE_ACCOUNT}
        </button>
        
        <br />
        
        <button onClick={onClose} style={styles.textBtn}>
          {TEXT.SETTINGS.BTN_BACK}
        </button>
      </div>
    </div>
  );
};
