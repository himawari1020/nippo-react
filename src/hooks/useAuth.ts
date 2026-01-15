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
  
  const [isWaitingVerification, setIsWaitingVerification] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // 「一度でもデータ取得に成功したか」を記録するフラグ（リアルタイム削除検知用）
  const userExistsRef = useRef(false);
  const timeoutIdRef = useRef<number | null>(null);

  // ログアウト処理（共通化）
  const performLogout = async () => {
    if (timeoutIdRef.current) {
      window.clearTimeout(timeoutIdRef.current);
    }
    await signOut(auth);
    setUser(null);
    setCompanyId(null);
    setRole(null);
    setUserCompanyName("");
    setInviteCode("");
    setIsWaitingVerification(false);
    setIsNewUser(false);
    userExistsRef.current = false;
  };

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
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
          
          unsubscribeFirestore = onSnapshot(doc(db, "users", currentUser.uid), async (userDoc) => {
            // ■ ケース1: データが正常に取得できた場合
            if (userDoc.exists()) {
              userExistsRef.current = true; // 「存在した」という履歴を残す

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
              // ■ ケース2: データが存在しない場合 (!exists)
              
              // 2-A: さっきまで見ていたのに消えた（＝リアルタイム削除）
              if (userExistsRef.current) {
                console.warn("データ消失検知: ログアウトします");
                performLogout();
                return;
              }

              // 2-B: リロード時など最初からデータがない場合
              try {
                // 生存確認: 強制トークンリフレッシュ
                await currentUser.getIdToken(true);
                
                // 【追加対策】作成から5分以上経過しているのにデータがない＝削除済みユーザーの残留とみなす
                const creationTime = new Date(currentUser.metadata.creationTime || 0).getTime();
                const now = Date.now();
                const isOldAccount = (now - creationTime) > 5 * 60 * 1000; // 5分

                if (isOldAccount) {
                   console.warn("古いアカウントのデータ未存在: 削除済みと判定してログアウト");
                   performLogout();
                   return;
                }

                // ここまで来てようやく「正真正銘の新規ユーザー」と認める
                setIsNewUser(true);
                setCompanyId(null);
                setRole(null);
              } catch (error) {
                console.warn("認証無効: ログアウトします", error);
                performLogout();
                return;
              }
            }
            setLoading(false);
          }, (error) => {
            // ■ ケース3: 権限エラー (permission-denied)
            // ドキュメント削除により「本人条件」などのルールに違反してアクセス不可になった場合ここに来る
            console.error("Firestore監視エラー:", error);
            if (error.code === 'permission-denied') {
              console.warn("権限喪失（削除の可能性大）: ログアウトします");
              performLogout();
            } else {
              setLoading(false);
            }
          });
        }
      } else {
        // ログアウト時
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // 無操作タイムアウト（10分）
  useEffect(() => {
    if (!user) return;
    
    const timeoutDuration = 600000; 
    const handleTimeout = () => {
      alert("一定時間操作がなかったため、自動的にログアウトしました。");
      performLogout();
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
    logout: performLogout 
  };
};