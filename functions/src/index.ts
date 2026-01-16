import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

// --- ヘルパー関数: 重複しない招待コードを生成 ---
async function generateUniqueInviteCode(db: admin.firestore.Firestore): Promise<string> {
  let inviteCode = "";
  let isUnique = false;
  const maxRetries = 10; // 無限ループ防止のためのリミット

  for (let i = 0; i < maxRetries; i++) {
    // ランダムな6文字・大文字
    inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // DBに同じコードが存在するか確認
    const snapshot = await db.collection("companies")
      .where("inviteCode", "==", inviteCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      isUnique = true;
      break;
    }
  }

  if (!isUnique) {
    throw new HttpsError("resource-exhausted", "招待コードの生成に失敗しました。時間をおいて再試行してください。");
  }

  return inviteCode;
}

/**
 * 1. サービス解約処理（修正版）
 * 打刻ログが大量にある場合でも、分割して削除することで500件制限のエラーを回避します。
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

    // --- 削除処理の実行 (バッチ分割処理) ---
    
    // A. 該当する全ての打刻ログを取得
    const attendanceSnapshot = await db.collection("attendance")
      .where("companyId", "==", companyId)
      .get();

    // バッチ処理の準備
    const MAX_BATCH_SIZE = 400;
    let batch = db.batch();
    let operationCount = 0;

    for (const doc of attendanceSnapshot.docs) {
      batch.delete(doc.ref);
      operationCount++;

      // 規定数に達したら一度コミットして、新しいバッチを作成
      if (operationCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    }

    // B. 会社ドキュメントを削除
    batch.delete(db.collection("companies").doc(companyId));

    // C. 管理者自身のユーザードキュメントを削除
    batch.delete(db.collection("users").doc(uid));

    // 残りの削除操作をコミット
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
 * 2. 社員削除処理
 * 指定したユーザーのドキュメントと認証アカウントを完全に削除します。
 */
export const removeMember = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const adminUid = request.auth.uid;
  const targetUid = request.data.targetUid;

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "対象のユーザーIDが指定されていません。");
  }

  const db = admin.firestore();

  try {
    const adminDoc = await db.collection("users").doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "管理者権限がありません。");
    }

    try {
      await admin.auth().deleteUser(targetUid);
    } catch (authError: any) {
      if (authError.code !== 'auth/user-not-found') {
        console.error("Auth削除エラー:", authError);
        throw authError; 
      }
    }

    await db.collection("users").doc(targetUid).delete();

    return { success: true };
  } catch (error: any) {
    console.error("退会・削除処理エラー:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "ユーザーの削除中にエラーが発生しました。");
  }
});

/**
 * 3. 会社参加処理
 * 招待コードを使って会社に所属します。
 */
export const joinCompany = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const { inviteCode, userName } = request.data;
  const uid = request.auth.uid;
  const db = admin.firestore();

  if (!inviteCode || !userName) {
    throw new HttpsError("invalid-argument", "名前と招待コードは必須です。");
  }

  try {
    const companiesSnapshot = await db.collection("companies")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .limit(1)
      .get();

    if (companiesSnapshot.empty) {
      throw new HttpsError("not-found", "無効な招待コードです。");
    }

    const companyDoc = companiesSnapshot.docs[0];
    const companyId = companyDoc.id;

    await db.collection("users").doc(uid).set({
      userName: userName,
      companyId: companyId,
      role: "user",
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
 * 4. 打刻処理 (修正版)
 * 直近の打刻状態を確認し、矛盾する操作（連続出勤など）をブロックします。
 */
export const recordAttendance = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const { type, companyId } = request.data;
  const uid = request.auth.uid;
  const db = admin.firestore();

  if (!['clock_in', 'clock_out'].includes(type)) {
    throw new HttpsError("invalid-argument", "打刻タイプが不正です。");
  }
  if (!companyId) {
    throw new HttpsError("invalid-argument", "会社IDが指定されていません。");
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "ユーザー情報が見つかりません。");
    }
    
    const userName = userDoc.data()?.userName || request.auth.token.name || "Unknown";

    const lastLogSnapshot = await db.collection("attendance")
      .where("companyId", "==", companyId)
      .where("uid", "==", uid)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    let lastType = null;
    if (!lastLogSnapshot.empty) {
      lastType = lastLogSnapshot.docs[0].data().type;
    }

    if (type === 'clock_in') {
      if (lastType === 'clock_in') {
        throw new HttpsError("failed-precondition", "既に出勤しています（二重出勤はできません）。");
      }
    } else if (type === 'clock_out') {
      if (lastType === null) {
        throw new HttpsError("failed-precondition", "出勤記録が見つかりません。");
      }
      if (lastType === 'clock_out') {
        throw new HttpsError("failed-precondition", "既に退勤しています（二重退勤はできません）。");
      }
    }

    await db.collection("attendance").add({
      uid: uid,
      userName: userName,
      type: type,
      companyId: companyId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
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
 * 5. 会社作成処理 (修正版)
 * 招待コードの重複チェックを追加しました。
 */
export const createCompany = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const { companyName, userName } = request.data;
  const uid = request.auth.uid;
  const db = admin.firestore();

  if (!companyName || !userName) {
    throw new HttpsError("invalid-argument", "会社名とユーザー名は必須です。");
  }

  try {
    // --- 修正: 重複しない招待コードを生成 ---
    const inviteCode = await generateUniqueInviteCode(db);

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
        role: "admin",
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
 * 6. 招待コード再発行 (修正版)
 * 招待コードの重複チェックを追加しました。
 */
export const reissueInviteCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です。");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    
    if (!userDoc.exists || userData?.role !== "admin" || !userData?.companyId) {
      throw new HttpsError("permission-denied", "管理者権限がありません。");
    }

    const companyId = userData.companyId;

    // --- 修正: 重複しない新しいコードを生成 ---
    const newInviteCode = await generateUniqueInviteCode(db);

    await db.collection("companies").doc(companyId).update({
      inviteCode: newInviteCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

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