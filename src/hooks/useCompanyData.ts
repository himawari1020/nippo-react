import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from '../lib/firebase';

export const useCompanyData = (companyId: string | null, role: string | null, userUid: string) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    // 必要な情報が揃っていない場合は何もしない
    if (!companyId || !role) {
      setLogs([]);
      setMembers([]);
      return;
    }

    // --- 1. 打刻ログの取得 ---
    let qLogs;
    if (role === 'admin') {
      // 管理者: 会社全体のログを取得
      qLogs = query(
        collection(db, "attendance"), 
        where("companyId", "==", companyId), 
        orderBy("timestamp", "desc"),
        limit(50)
      );
    } else {
      // 一般社員: 自分自身のログのみ取得
      qLogs = query(
        collection(db, "attendance"), 
        where("companyId", "==", companyId), 
        where("uid", "==", userUid), 
        orderBy("timestamp", "desc"),
        limit(50)
      );
    }

    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("ログ取得エラー:", err);
    });

    // --- 2. 社員リストの取得（管理者のみ） ---
    let unsubMembers = () => {};
    if (role === 'admin') {
      const qMembers = query(collection(db, "users"), where("companyId", "==", companyId));
      unsubMembers = onSnapshot(qMembers, (snapshot) => {
        setMembers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      }, (err) => {
        console.error("メンバー取得エラー:", err);
      });
    }

    // クリーンアップ関数（コンポーネントが消える時に購読停止）
    return () => {
      unsubLogs();
      unsubMembers();
    };
  }, [companyId, role, userUid]);

  return { logs, members };
};
