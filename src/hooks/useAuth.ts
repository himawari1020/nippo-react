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

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // 以前のFirestore監視を解除
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (currentUser) {
        if (!currentUser.emailVerified && currentUser.providerData[0]?.providerId === 'password') {
          setIsWaitingVerification(true);
          setUser(currentUser);
          setLoading(false);
        } else {
          setIsWaitingVerification(false);
          setUser(currentUser);
          
          // ユーザー情報をリアルタイム監視
          unsubscribeFirestore = onSnapshot(doc(db, "users", currentUser.uid), async (userDoc) => {
            if (userDoc.exists()) {
              // --- データが存在する場合（通常） ---
              const userData = userDoc.data();
              const cid = userData?.companyId ?? null;
              
              setCompanyId(cid);
              setRole(userData?.role ?? null);
              setIsNewUser(false);
              
              if (cid) {
                try {
                  const compDoc = await getDoc(doc(db, "companies", cid));
                  if (compDoc.exists()) {
                     const compData = compDoc.data();
                     setInviteCode(compData?.inviteCode || "");
                     setUserCompanyName(compData?.name || ""); 
                  }
                } catch (e) {
                  console.error("会社情報取得エラー:", e);
                }
              } else {
                setInviteCode("");
                setUserCompanyName("");
              }
            } else {
              // --- Firestoreにデータがない場合 ---
              try {
                // 【修正点】reload() ではなく getIdToken(true) を使用
                // 強制的にトークンリフレッシュを行うことで、削除済みユーザー（リフレッシュトークン無効）を確実に検知してエラーを発生させます。
                await currentUser.getIdToken(true);
                
                // エラーが出なければアカウントは有効（＝本当の新規登録中のユーザー）
                setIsNewUser(true);
                setCompanyId(null);
                setRole(null);
              } catch (error) {
                // トークンリフレッシュ失敗 ＝ 削除済みユーザー
                console.warn("ユーザーが無効なためログアウトします", error);
                await signOut(auth);
                resetState();
                return;
              }
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

  // ログアウト処理
  const logout = async () => {
    if (timeoutIdRef.current) {
      window.clearTimeout(timeoutIdRef.current);
    }
    await signOut(auth);
    resetState();
  };

  // 無操作タイムアウト（10分）
  useEffect(() => {
    if (!user) return;
    
    const timeoutDuration = 600000; 
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
    
    resetTimer();

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