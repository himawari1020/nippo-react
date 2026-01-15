import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from '../lib/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userCompanyName, setUserCompanyName] = useState<string>(""); 
  const [inviteCode, setInviteCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  // 状態フラグ
  const [isWaitingVerification, setIsWaitingVerification] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // 自動ログアウト用タイマー
  const timeoutIdRef = useRef<number | null>(null);

  useEffect(() => {
    // 認証状態の監視を開始
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // メール認証待ちのチェック
        if (!currentUser.emailVerified && currentUser.providerData[0]?.providerId === 'password') {
          setIsWaitingVerification(true);
          setUser(currentUser);
          setLoading(false);
        } else {
          setIsWaitingVerification(false);
          setUser(currentUser);
          // ユーザーの追加情報（会社IDや権限）をFirestoreから取得
          await fetchUserCompanyInfo(currentUser);
          setLoading(false);
        }
      } else {
        // ログアウト時
        resetState();
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 状態リセット
  const resetState = () => {
    setUser(null);
    setCompanyId(null);
    setRole(null);
    setUserCompanyName("");
    setInviteCode("");
    setIsWaitingVerification(false);
    setIsNewUser(false);
  };

  // Firestoreからユーザーと会社の情報を取得
  const fetchUserCompanyInfo = async (currentUser: any) => {
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const cid = userData.companyId;
        
        setCompanyId(cid);
        setRole(userData.role);
        setIsNewUser(false);
        
        // 会社情報の取得（招待コードや会社名）
        if (cid) {
          const compDoc = await getDoc(doc(db, "companies", cid));
          if (compDoc.exists()) {
             const compData = compDoc.data();
             setInviteCode(compData.inviteCode);
             setUserCompanyName(compData.name); 
          }
        }
      } else {
        // Firestoreにデータがない = 完全な新規ユーザー
        setIsNewUser(true);
      }
    } catch (e) {
      console.error("ユーザーデータ取得エラー:", e);
    }
  };

  // ログアウト処理
  const logout = async () => {
    if (timeoutIdRef.current) {
      window.clearTimeout(timeoutIdRef.current);
    }
    await signOut(auth);
    resetState();
  };

  // 無操作タイムアウト（10分）のロジック
  useEffect(() => {
    if (!user) return;
    
    const timeoutDuration = 600000; // 10分

    const handleTimeout = () => {
      alert("一定時間操作がなかったため、自動的にログアウトしました。");
      logout();
    };

    const resetTimer = () => {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
      timeoutIdRef.current = window.setTimeout(handleTimeout, timeoutDuration);
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer(); // 初期セット

    return () => {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  return { 
    user, 
    role, 
    companyId, 
    userCompanyName, 
    inviteCode, 
    loading, 
    isWaitingVerification, 
    isNewUser, 
    logout 
  };
};
