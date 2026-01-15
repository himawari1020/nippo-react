import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { TEXT } from '../constants/strings';
import { SettingsPanelView } from './views/SettingsPanelView';

interface Props {
  user: any;
  companyId: string | null;
  members: any[];
  logout: () => void;
  onClose: () => void;
}

export const SettingsPanel = ({ user, companyId, members, logout, onClose }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || !companyId) return;

    const otherMembersCount = members.length - 1;
    if (otherMembersCount > 0) {
      alert(TEXT.SETTINGS.ERR_MEMBERS_EXIST);
      return;
    }

    if (!window.confirm(TEXT.SETTINGS.CONFIRM_DELETE)) return;

    setLoading(true);
    try {
      const deleteAccountFunc = httpsCallable(functions, "deleteAccountAndCompany");
      await deleteAccountFunc();

      alert(TEXT.SETTINGS.MSG_DELETE_SUCCESS);
      logout();
    } catch (err: any) {
      console.error(err);
      alert(TEXT.COMMON.ERROR_PREFIX + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsPanelView 
      isLoading={loading}
      onDeleteAccount={handleDeleteAccount}
      onClose={onClose}
    />
  );
};
