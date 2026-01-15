import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useCompanyData } from './hooks/useCompanyData';
import { AppView } from './components/views/AppView'; // 新しいViewをインポート

function App() {
  // 1. 認証とユーザー情報の取得 (Hooks)
  const { 
    user, role, companyId, userCompanyName, inviteCode, 
    loading, isWaitingVerification, isNewUser, 
    logout 
  } = useAuth(); //
  
  // 2. 会社データ（ログ・メンバー）の取得 (Hooks)
  const { logs, members } = useCompanyData(companyId, role, user?.uid || ""); //
  
  // 3. 表示に関する状態
  const [showSettings, setShowSettings] = useState(false); //

  // 4. まとめてViewに渡す
  return (
    <AppView
      loading={loading}
      user={user}
      role={role || ""} 
      companyId={companyId || ""}
      userCompanyName={userCompanyName}
      inviteCode={inviteCode}
      isWaitingVerification={isWaitingVerification}
      isNewUser={isNewUser}
      logs={logs}
      members={members}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      logout={logout}
    />
  );
}

export default App;
