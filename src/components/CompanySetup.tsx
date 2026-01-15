import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { TEXT } from '../constants/strings';
import { CompanySetupView } from './views/CompanySetupView';

interface Props {
  user: any;
  logout: () => void;
}

export const CompanySetup = ({ user, logout }: Props) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  
  const defaultName = user.displayName || user.email?.split('@')[0] || "";
  const [userName, setUserName] = useState(defaultName);

  const handleCreate = async () => {
    if (!name || !userName) {
      alert(TEXT.SETUP.ERR_INPUT_CREATE);
      return;
    }
    setLoading(true);
    try {
      const createCompanyFunc = httpsCallable(functions, 'createCompany');
      await createCompanyFunc({ companyName: name, userName: userName });
      window.location.reload(); 
    } catch (e: any) {
      console.error(e);
      alert(TEXT.COMMON.ERROR_PREFIX + e.message);
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode || !userName) {
      alert(TEXT.SETUP.ERR_INPUT_JOIN);
      return;
    }
    setLoading(true);
    try {
      const joinCompanyFunc = httpsCallable(functions, 'joinCompany');
      await joinCompanyFunc({ inviteCode: inviteCode, userName: userName });
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      alert(TEXT.COMMON.ERROR_PREFIX + e.message);
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'create' ? 'join' : 'create');
    setInviteCode("");
    setName("");
  };

  return (
    <CompanySetupView 
      mode={mode}
      userName={userName}
      setUserName={setUserName}
      name={name}
      setName={setName}
      inviteCode={inviteCode}
      setInviteCode={setInviteCode}
      isLoading={loading}
      onToggleMode={toggleMode}
      onCreate={handleCreate}
      onJoin={handleJoin}
      onLogout={logout}
    />
  );
};
