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

  // 状態リセット関数（useEffect内で使うため先に定義するか、useEffect内にロジックを書く）
  // ここではset関数のみ使用するためuseEffectから参照しても安全ですが、
  // 依存関係をシンプルにするため、ログアウト処理を共通化します。
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
              // 【修正ポイント】削除されたユーザーか、新規作成中かを確認する
              try {
                // Authサーバーに問い合わせてアカウントの生存確認を行う
                await currentUser.reload();
                
                // エラーが出なければアカウントは有効（＝新規登録中のユーザー）
                setIsNewUser(true);
                setCompanyId(null);
                setRole(null);
              } catch (error) {
                // エラーが出た場合（auth/user-not-foundなど）は削除済みとみなす
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
  }, []); // resetStateは内部state更新のみなので依存配列から除外しても実用上問題なし

  // ログアウト処理（外部呼び出し用）
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