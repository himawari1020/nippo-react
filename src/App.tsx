import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useCompanyData } from './hooks/useCompanyData';
import { AuthScreen } from './components/AuthScreen';
import { CompanySetup } from './components/CompanySetup';
import { MembersTable } from './components/MembersTable';
import { LogsTable } from './components/LogsTable';
import { SettingsPanel } from './components/SettingsPanel';
import { styles } from './styles';

function App() {
  // 1. 認証とユーザー情報の取得 (Hooks)
  const { 
    user, role, companyId, userCompanyName, inviteCode, 
    loading, isWaitingVerification, isNewUser, 
    logout 
  } = useAuth();
  
  // 2. 会社データ（ログ・メンバー）の取得 (Hooks)
  // user.uid が存在しない場合は空文字を渡してエラーを防ぐ
  const { logs, members } = useCompanyData(companyId, role, user?.uid || "");
  
  // 設定パネルの開閉状態
  const [showSettings, setShowSettings] = useState(false);

  // --- 条件分岐による画面の出し分け ---

  // A. ローディング中
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.center}>読み込み中...</div>
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
          <h2 style={{color: '#e67e22'}}>メール認証が必要です</h2>
          <p>確認メールを送信しました。メール内のリンクをクリックして認証を完了してください。</p>
          <button onClick={() => window.location.reload()} style={styles.primaryBtn}>
            認証完了を確認する
          </button>
          <button onClick={logout} style={styles.textBtn}>
            ログアウトして戻る
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
              {userCompanyName ? `${userCompanyName} - ` : ""}
              {role === 'admin' ? "管理ダッシュボード" : "勤務状況確認"}
            </h1>
            {/* 設定ボタン */}
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              style={styles.iconBtn} 
              title="設定"
            >
              ⚙️
            </button>
          </div>
          <button onClick={logout} style={styles.logoutBtn}>ログアウト</button>
        </header>

        {/* コンテンツエリア */}
        {showSettings ? (
          // 設定パネル表示モード
          <SettingsPanel 
            user={user} 
            companyId={companyId} 
            members={members} 
            logout={logout} 
            onClose={() => setShowSettings(false)} 
          />
        ) : (
          // 通常ダッシュボードモード
          <div style={styles.sectionRow}>
            {/* 管理者のみメンバー表を表示 */}
            {role === 'admin' && (
              <MembersTable 
                members={members} 
                currentUserUid={user.uid}
                inviteCode={inviteCode} 
              />
            )}
            
            {/* ログ表を表示 (管理者は全員分、一般は自分のみ) */}
            <LogsTable logs={logs} role={role} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
