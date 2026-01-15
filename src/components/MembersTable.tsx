import { useState, useEffect } from 'react';
import { httpsCallable } from "firebase/functions";
import { functions } from '../lib/firebase';
import { TEXT } from '../constants/strings';
import { MembersTableView } from './views/MembersTableView';

interface Member {
  uid: string;
  userName: string;
  role: string;
}

interface Props {
  members: Member[];
  currentUserUid: string;
  inviteCode: string;
}

export const MembersTable = ({ members, currentUserUid, inviteCode: initialInviteCode }: Props) => {
  const [displayCode, setDisplayCode] = useState(initialInviteCode);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setDisplayCode(initialInviteCode);
  }, [initialInviteCode]);

  const handleReissueCode = async () => {
    if (!window.confirm(TEXT.MEMBERS.CONFIRM_REISSUE)) return;

    setIsProcessing(true);
    try {
      const reissueFunc = httpsCallable(functions, "reissueInviteCode");
      const result: any = await reissueFunc();
      const newCode = result.data.newInviteCode;
      
      setDisplayCode(newCode);
      alert(TEXT.MEMBERS.MSG_REISSUE_SUCCESS + newCode);
    } catch (e: any) {
      console.error(e);
      alert(TEXT.COMMON.ERROR_PREFIX + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = async (targetUid: string, targetName: string) => {
    if (!window.confirm(targetName + " " + TEXT.MEMBERS.CONFIRM_REMOVE)) return;
    
    setIsProcessing(true);
    try {
      const removeMemberFunc = httpsCallable(functions, "removeMember");
      await removeMemberFunc({ targetUid: targetUid });
      alert(targetName + " " + TEXT.MEMBERS.MSG_REMOVE_SUCCESS);
    } catch (e: any) {
      console.error(e);
      alert(TEXT.COMMON.ERROR_PREFIX + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MembersTableView 
      members={members}
      currentUserUid={currentUserUid}
      displayCode={displayCode}
      isProcessing={isProcessing}
      onReissue={handleReissueCode}
      onRemove={handleRemoveMember}
    />
  );
};
