import { styles } from '../../styles';
import { TEXT } from '../../constants/strings';

// 親(Container)から受け取るもののリスト
interface Props {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  isEmailSignUp: boolean;
  toggleMode: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogleLogin: () => void;
  errorMsg: string;
  isProcessing: boolean;
}

export const AuthScreenView = ({ 
  email, setEmail, password, setPassword, isEmailSignUp, 
  toggleMode, onSubmit, onGoogleLogin, errorMsg, isProcessing 
}: Props) => {
  
  return (
    <div style={styles.card}>
      {/* アプリ名を表示 */}
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '10px' }}>
        {TEXT.COMMON.APP_NAME}
      </h1>

      <h2>{isEmailSignUp ? TEXT.AUTH.SIGNUP_TITLE : TEXT.AUTH.LOGIN_TITLE}</h2>
      
      <form onSubmit={onSubmit} style={styles.form}>
        <input 
          type="email" 
          placeholder={TEXT.AUTH.EMAIL} 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          style={styles.input} 
          required 
        />
        <input 
          type="password" 
          placeholder={TEXT.AUTH.PASSWORD} 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          style={styles.input} 
          required 
        />
        
        {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}
        
        <button type="submit" style={styles.primaryBtn} disabled={isProcessing}>
          {isProcessing 
            ? TEXT.COMMON.LOADING 
            : (isEmailSignUp ? TEXT.AUTH.SIGNUP_BTN : TEXT.AUTH.LOGIN_BTN)
          }
        </button>
      </form>

      <button onClick={toggleMode} style={styles.textBtn}>
        {isEmailSignUp ? TEXT.AUTH.TO_LOGIN : TEXT.AUTH.TO_SIGNUP}
      </button>
      
      <div style={styles.divider}>{TEXT.AUTH.OR}</div>
      
      <button onClick={onGoogleLogin} style={styles.googleBtn}>
        {TEXT.AUTH.GOOGLE_LOGIN}
      </button>
    </div>
  );
};