import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
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
    // Firestoreの監視解除関数を保持する変数
    let unsubscribeFirestore: (() => void) | null = null;

    // 認証状態の監視を開始
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // ユーザー切り替え時などに前のリスナーがあれば解除
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (currentUser) {
        // メール認証待ちのチェック
        if (!currentUser.emailVerified && currentUser.providerData[0]?.providerId === 'password') {
          setIsWaitingVerification(true);
          setUser(currentUser);
          setLoading(false);
        } else {
          setIsWaitingVerification(false);
          setUser(currentUser);
          
          // 【修正】getDocではなくonSnapshotでユーザー情報をリアルタイム監視
          unsubscribeFirestore = onSnapshot(doc(db, "users", currentUser.uid), async (userDoc) => {
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // オプショナルチェーン (?.) を使用して安全にアクセス
              const cid = userData?.companyId ?? null;
              
              setCompanyId(cid);
              setRole(userData?.role ?? null);
              setIsNewUser(false);
              
              // 会社情報の取得
              if (cid) {
                try {
                  const compDoc = await getDoc(doc(db, "companies", cid));
                  if (compDoc.exists()) {
                     const compData = compDoc.data();
                     // ここも安全にアクセス
                     setInviteCode(compData?.inviteCode || "");
                     setUserCompanyName(compData?.name || ""); 
                  }
                } catch (e) {
                  console.error("会社情報取得エラー:", e);
                }
              } else {
                // 会社から削除された場合
                setInviteCode("");
                setUserCompanyName("");
              }
            } else {
              // Firestoreにデータがない（ユーザー削除など）
              setIsNewUser(true);
              setCompanyId(null);
              setRole(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("ユーザーデータ監視エラー:", error);
            setLoading(false);
          });
        }
      } else {
        // ログアウト時
        resetState();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
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