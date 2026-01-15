export const TEXT = {
  // 共通
  COMMON: {
    LOADING: "処理中...",
    WAIT_SERVER: "サーバーと通信しています...",
    ERROR_PREFIX: "エラー: ",
    CANCEL: "キャンセル",
    LOGOUT: "ログアウト"
  },
  
  // 認証画面 (AuthScreen)
  AUTH: {
    LOGIN_TITLE: "ログイン",
    SIGNUP_TITLE: "アカウント作成",
    EMAIL: "メールアドレス",
    PASSWORD: "パスワード",
    LOGIN_BTN: "ログイン",
    SIGNUP_BTN: "アカウント作成",
    TO_SIGNUP: "新しくアカウントを作る方はこちら",
    TO_LOGIN: "既にアカウントをお持ちの方はこちら",
    OR: "または",
    GOOGLE_LOGIN: "Googleでログイン",
    SENT_VERIFICATION: "認証メールを送信しました。メールを確認してリンクをクリックしてください。",
    ERR_EMAIL_IN_USE: "このメールアドレスは既に使用されています。",
    ERR_WRONG_PASS: "メールアドレスまたはパスワードが間違っています。",
    ERR_GOOGLE_FAIL: "Googleログインに失敗しました。"
  },

  // 会社セットアップ画面 (CompanySetup)
  SETUP: {
    CREATE_MODE_TITLE: "新しい会社を作成",
    JOIN_MODE_TITLE: "既存の会社に参加",
    LABEL_USER_NAME: "あなたの名前 (表示名)",
    LABEL_COMPANY_NAME: "会社名",
    LABEL_INVITE_CODE: "招待コード",
    PLACEHOLDER_USER: "山田 太郎",
    PLACEHOLDER_COMPANY: "株式会社〇〇",
    PLACEHOLDER_CODE: "例: ABC123",
    BTN_CREATE: "会社を作成する",
    BTN_JOIN: "参加する",
    LINK_TO_JOIN: "招待コードをお持ちの方はこちら (参加)",
    LINK_TO_CREATE: "新しく会社を作る方はこちら (作成)",
    CANCEL_LOGOUT: "キャンセルしてログアウト",
    ERR_INPUT_CREATE: "「会社名」と「あなたの名前」を入力してください。",
    ERR_INPUT_JOIN: "「招待コード」と「あなたの名前」を入力してください。"
  },

  // ダッシュボード全体 (App)
  DASHBOARD: {
    ADMIN_TITLE: "管理ダッシュボード",
    USER_TITLE: "勤務状況確認",
    VERIFY_TITLE: "メール認証が必要です",
    VERIFY_DESC: "確認メールを送信しました。メール内のリンクをクリックして認証を完了してください。",
    BTN_CHECK_VERIFY: "認証完了を確認する",
    BTN_LOGOUT_BACK: "ログアウトして戻る"
  },

  // 設定パネル (SettingsPanel)
  SETTINGS: {
    TITLE: "アカウント設定",
    DESC: "解約すると、これまでの打刻データや会社情報がすべて削除されます。この操作は取り消せません。",
    DANGER_ZONE: "危険な操作",
    BTN_DELETE_ACCOUNT: "サービスを解約してデータを全削除する",
    BTN_BACK: "ダッシュボードに戻る",
    CONFIRM_DELETE: "本当に解約（アカウント削除）しますか？\n全ての打刻データ、会社情報、アカウントが完全に削除されます。",
    MSG_DELETE_SUCCESS: "解約処理が完了しました。ご利用ありがとうございました。",
    ERR_MEMBERS_EXIST: "解約できません。他の社員がまだ登録されています。先に社員を退会させてください。"
  },

  // メンバー表 (MembersTable)
  MEMBERS: {
    TITLE: "社員管理",
    CODE_LABEL: "社員用招待コード:",
    BTN_REISSUE: "再発行",
    BTN_REMOVE: "退会",
    ROLE_ADMIN: "管理者",
    ROLE_USER: "一般",
    YOU: "(あなた)",
    EMPTY: "データ取得中...",
    CONFIRM_REISSUE: "招待コードを再発行しますか？\n古いコードは無効になります。",
    CONFIRM_REMOVE: "さんを退会させますか？\nこの操作は取り消せません。",
    MSG_REISSUE_SUCCESS: "新しい招待コードを発行しました: ",
    MSG_REMOVE_SUCCESS: "さんを退会させました。"
  },

  // ログ表 (LogsTable)
  LOGS: {
    ADMIN_TITLE: "最新ログ",
    USER_TITLE: "あなたの打刻履歴",
    BTN_CSV: "CSV出力",
    TH_NAME: "名前",
    TH_TYPE: "タイプ",
    TH_TIME: "時刻",
    TYPE_IN: "出勤",
    TYPE_OUT: "退勤",
    EMPTY: "データがありません"
  }
};
