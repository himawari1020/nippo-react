import { useState } from 'react';
import { 
  signInWithPopup, GoogleAuthProvider, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  sendEmailVerification 
} from "firebase/auth";
import { auth } from '../lib/firebase';
import { TEXT } from '../constants/strings';
// 表示専用コンポーネントを読み込み
import { AuthScreenView } from './views/AuthScreenView'; 

export const AuthScreen = () => {
  // --- ロジック部分 (State & Functions) ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailSignUp, setIsEmailSignUp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsProcessing(true);

    try {
      if (isEmailSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        alert(TEXT.AUTH.SENT_VERIFICATION);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setAuthError(TEXT.AUTH.ERR_EMAIL_IN_USE);
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setAuthError(TEXT.AUTH.ERR_WRONG_PASS);
      } else {
        setAuthError(TEXT.COMMON.ERROR_PREFIX + err.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      console.error(err);
      setAuthError(TEXT.AUTH.ERR_GOOGLE_FAIL);
    }
  };

  const toggleMode = () => {
    setIsEmailSignUp(!isEmailSignUp);
    setAuthError("");
  };

  // --- 表示部分 (Viewを呼ぶだけ) ---
  return (
    <AuthScreenView 
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      isEmailSignUp={isEmailSignUp}
      toggleMode={toggleMode}
      onSubmit={handleEmailAuth}
      onGoogleLogin={loginWithGoogle}
      errorMsg={authError}
      isProcessing={isProcessing}
    />
  );
};
