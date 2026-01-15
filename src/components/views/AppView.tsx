import { styles } from '../../styles';
import { TEXT } from '../../constants/strings';
import { AuthScreen } from '../AuthScreen';
import { CompanySetup } from '../CompanySetup';
import { MembersTable } from '../MembersTable';
import { LogsTable } from '../LogsTable';
import { SettingsPanel } from '../SettingsPanel';

// Appから受け取るデータの型定義
interface Props {
  loading: boolean;
  user: any;
  role: string;
  companyId: string;
  userCompanyName: string;
  inviteCode: string;
  isWaitingVerification: boolean;
  isNewUser: boolean;
  logs: any[];
  members: any[];
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  logout: () => void;
}

export const AppView = ({
  loading, user, role, companyId, userCompanyName, inviteCode,
  isWaitingVerification, isNewUser, logs, members,
  showSettings, setShowSettings, logout
}: Props) => {

  // A. ローディング中
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.center}>{TEXT.COMMON.LOADING}</div>
      </div>
    );
  }

  // B. 未ログイン時 -> ログイン画面
  if (!user) {
    return (
      <div style={styles.container}>
        <AuthScreen />
      </div>
    );
  }

  // C. メール認証待ち
  if (isWaitingVerification) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={{ color: '#e67e22' }}>{TEXT.DASHBOARD.VERIFY_TITLE}</h2>
          <p>{TEXT.DASHBOARD.VERIFY_DESC}</p>
          <button onClick={() => window.location.reload()} style={styles.primaryBtn}>
            {TEXT.DASHBOARD.BTN_CHECK_VERIFY}
          </button>
          <button onClick={logout} style={styles.textBtn}>
            {TEXT.DASHBOARD.BTN_LOGOUT_BACK}
          </button>
        </div>
      </div>
    );
  }

  // D. 会社未所属（新規作成 or 参加） -> セットアップ画面
  if (isNewUser) {
    return (
      <div style={styles.container}>
        <CompanySetup user={user} logout={logout} />
      </div>
    );
  }

  // E. メインダッシュボード
  return (
    <div style={styles.container}>
      <div style={styles.dashboard}>
        
        {/* ヘッダー */}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h1 style={styles.title}>
              {TEXT.COMMON.APP_NAME} - {userCompanyName ? `${userCompanyName} - ` : ""}
              {role === 'admin' ? TEXT.DASHBOARD.ADMIN_TITLE : TEXT.DASHBOARD.USER_TITLE}
            </h1>
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              style={styles.iconBtn} 
              title="設定"
            >
              ⚙️
            </button>
          </div>
          <button onClick={logout} style={styles.logoutBtn}>{TEXT.COMMON.LOGOUT}</button>
        </header>

        {/* コンテンツエリア */}
        {showSettings ? (
          <SettingsPanel 
            user={user} 
            companyId={companyId} 
            members={members} 
            logout={logout} 
            onClose={() => setShowSettings(false)} 
          />
        ) : (
          <div style={styles.sectionRow}>
            {role === 'admin' && (
              <MembersTable 
                members={members} 
                currentUserUid={user.uid}
                inviteCode={inviteCode} 
              />
            )}
            <LogsTable logs={logs} role={role} />
          </div>
        )}
      </div>
    </div>
  );
};
