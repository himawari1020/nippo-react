import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * 1. サービス解約処理（管理者アカウント・会社データ・全打刻ログの削除）
 * 管理者が自分自身と会社全体を削除する場合に使用します。
 */
export const deleteAccountAndCompany = onCall(async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();

  try {
    // 管理者情報の取得
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザーが見つかりません。");
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    // 権限チェック
    if (!companyId || userData?.role !== "admin") {
      throw new HttpsError("permission-denied", "管理者権限がありません。");
    }

    // 他の社員が残っていないか最終確認
    const membersSnapshot = await db.collection("users")
      .where("companyId", "==", companyId)
      .get();
    
    if (membersSnapshot.size > 1) {
      throw new HttpsError("failed-precondition", "他の社員が残っているため解約できません。");
    }

    // --- 削除処理の実行 (バッチ処理) ---
    const batch = db.batch();

    // A. 該当する全ての打刻ログを削除
    const attendanceSnapshot = await db.collection("attendance")
      .where("companyId", "==", companyId)
      .get();
    attendanceSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // B. 会社ドキュメントを削除
    batch.delete(db.collection("companies").doc(companyId));

    // C. 管理者自身のユーザードキュメントを削除
    batch.delete(db.collection("users").doc(uid));

    // Firestoreの変更を確定
    await batch.commit();

    // D. Firebase Auth から管理者アカウントを削除
    await admin.auth().deleteUser(uid);

    return { success: true };
  } catch (error: any) {
    console.error("解約エラー:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "予期せぬエラーが発生しました。");
  }
});

/**
 * 2. 社員削除処理（指定したユーザーのドキュメントと認証アカウントを完全に削除）
 * 管理者が特定の社員を削除（解雇・退職処理）する場合に使用します。
 */
export const removeMember = onCall(async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const adminUid = request.auth.uid;
  const targetUid = request.data.targetUid; // フロントから渡される削除対象のUID

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "対象のユーザーIDが指定されていません。");
  }

  const db = admin.firestore();

  try {
    // 1. 操作者が管理者であることを確認
    const adminDoc = await db.collection("users").doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "管理者権限がありません。");
    }

    // 2. Firestoreのユーザードキュメントを削除
    // これにより users コレクションから該当ユーザーが消えます
    await db.collection("users").doc(targetUid).delete();

    // 3. Firebase Auth からユーザーアカウントを削除
    // これにより該当ユーザーはログイン不能になります
    await admin.auth().deleteUser(targetUid);

    return { success: true };
  } catch (error: any) {
    console.error("退会・削除処理エラー:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "ユーザーの削除中にエラーが発生しました。");
  }
});

/**
 * 3. 会社参加処理（招待コードを使って会社に所属する）
 * クライアントから直接DBを検索させないための安全な関数です。
 */
export const joinCompany = onCall(async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const { inviteCode, userName } = request.data;
  const uid = request.auth.uid;
  const db = admin.firestore();

  // 入力チェック
  if (!inviteCode || !userName) {
    throw new HttpsError("invalid-argument", "名前と招待コードは必須です。");
  }

  try {
    // A. 招待コードから会社を検索
    // アプリ側で大文字変換していますが、念のためここでもtoUpperCase()します
    const companiesSnapshot = await db.collection("companies")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .limit(1)
      .get();

    if (companiesSnapshot.empty) {
      throw new HttpsError("not-found", "無効な招待コードです。");
    }

    const companyDoc = companiesSnapshot.docs[0];
    const companyId = companyDoc.id;

    // B. ユーザー情報を安全に更新（既存データを消さずにマージ）
    // set(..., { merge: true }) を使うことで、プロフィール画像などが将来増えても消えません
    await db.collection("users").doc(uid).set({
      userName: userName,
      companyId: companyId,
      role: "user", // デフォルトは一般ユーザー
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { 
      success: true, 
      companyName: companyDoc.data().name 
    };

  } catch (error: any) {
    console.error("参加処理エラー:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "参加処理中にエラーが発生しました。");
  }
});

/**
 * 4. 打刻処理 (NEW)
 * クライアントからの直接書き込みを防ぎ、サーバー時間で正確に記録します。
 */
export const recordAttendance = onCall(async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const { type, companyId } = request.data;
  const uid = request.auth.uid;
  const db = admin.firestore();

  // 入力検証
  if (!['clock_in', 'clock_out'].includes(type)) {
    throw new HttpsError("invalid-argument", "打刻タイプが不正です。");
  }
  if (!companyId) {
    throw new HttpsError("invalid-argument", "会社IDが指定されていません。");
  }

  try {
    // ユーザー情報の取得 (名前のなりすまし防止のため、DBから最新の名前を取得)
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザー情報が見つかりません。");
    }
    
    // 正しいユーザー名を取得 (フォールバックとして Authトークンの名前を使用)
    const userName = userDoc.data()?.userName || request.auth.token.name || "Unknown";

    // 打刻データの保存
    await db.collection("attendance").add({
      uid: uid,
      userName: userName, // 安全なソースから取得した名前
      type: type,
      companyId: companyId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(), // サーバー時間
      createdAt: new Date().toISOString() // デバッグ用可読時間
    });

    return { 
      success: true, 
      message: type === 'clock_in' ? "出勤しました" : "退勤しました" 
    };

  } catch (error: any) {
    console.error("打刻エラー:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "打刻の保存に失敗しました。");
  }
});

/**
 * 5. 会社作成処理 (NEW)
 * ユーザーが新しい会社を作成し、その管理者になります。
 */
export const createCompany = onCall(async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const { companyName, userName } = request.data;
  const uid = request.auth.uid;
  const db = admin.firestore();

  // 入力チェック
  if (!companyName || !userName) {
    throw new HttpsError("invalid-argument", "会社名とユーザー名は必須です。");
  }

  // 招待コードの生成（ランダムな6文字・大文字）
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  try {
    // トランザクションで一括処理（整合性を保つため）
    await db.runTransaction(async (transaction) => {
      // 1. ユーザーが既に会社に所属していないか確認
      const userRef = db.collection("users").doc(uid);
      const userDoc = await transaction.get(userRef);

      if (userDoc.exists && userDoc.data()?.companyId) {
        throw new HttpsError("failed-precondition", "すでに会社に所属しています。");
      }

      // 2. 新しい会社ドキュメントへの参照を作成
      const companyRef = db.collection("companies").doc();

      // 3. 会社データをセット
      transaction.set(companyRef, {
        name: companyName,
        inviteCode: inviteCode,
        ownerId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. ユーザー情報を更新（管理者として設定）
      transaction.set(userRef, {
        userName: userName,
        companyId: companyRef.id,
        role: "admin", // 管理者権限
        email: request.auth?.token.email || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    return { 
      success: true, 
      message: "会社を作成しました。" 
    };

  } catch (error: any) {
    console.error("会社作成エラー:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "会社作成中にエラーが発生しました。");
  }
});

/**
 * 6. 招待コード再発行 (NEW)
 * 管理者が自社の招待コードを新しく生成します。
 */
export const reissueInviteCode = onCall(async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();

  try {
    // 1. 実行者が管理者かチェック
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    
    // データがない、権限がない、または会社IDがない場合はエラー
    if (!userDoc.exists || userData?.role !== "admin" || !userData?.companyId) {
      throw new HttpsError("permission-denied", "管理者権限がありません。");
    }

    const companyId = userData.companyId;

    // 2. 新しいコードを生成（ランダムな6文字・大文字）
    const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 3. 会社情報を更新
    await db.collection("companies").doc(companyId).update({
      inviteCode: newInviteCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. 新しいコードを返す
    return { 
      success: true, 
      newInviteCode: newInviteCode 
    };

  } catch (error: any) {
    console.error("再発行エラー:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "招待コードの再発行に失敗しました。");
  }
});
