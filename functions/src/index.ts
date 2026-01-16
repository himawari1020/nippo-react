import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

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
    // Firestoreのバッチは1回につき最大500件まで
    const MAX_BATCH_SIZE = 400; // 安全マージンをとって400件で区切る
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

    // 残りの削除操作をコミット（ログの端数 + 会社 + ユーザー）
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

    // 2. Firebase Auth からユーザーアカウントを削除
    try {
      await admin.auth().deleteUser(targetUid);
    } catch (authError: any) {
      // 既に削除済み(user-not-found)の場合は無視して次に進む
      if (authError.code !== 'auth/user-not-found') {
        console.error("Auth削除エラー:", authError);
        throw authError; 
      }
    }

    // 3. Firestoreのユーザードキュメントを削除
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
    const companiesSnapshot = await db.collection("companies")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .limit(1)
      .get();

    if (companiesSnapshot.empty) {
      throw new HttpsError("not-found", "無効な招待コードです。");
    }

    const companyDoc = companiesSnapshot.docs[0];
    const companyId = companyDoc.id;

    // B. ユーザー情報を安全に更新
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
 * 4. 打刻処理 (修正版)
 * クライアントからの直接書き込みを防ぎ、サーバー時間で正確に記録します。
 * 直近の打刻状態を確認し、矛盾する操作（連続出勤など）をブロックします。
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
    
    // 正しいユーザー名を取得
    const userName = userDoc.data()?.userName || request.auth.token.name || "Unknown";

    // --- 直近の打刻履歴を取得してチェック ---
    const lastLogSnapshot = await db.collection("attendance")
      .where("companyId", "==", companyId)
      .where("uid", "==", uid)
      .orderBy("timestamp", "desc") // 最新順
      .limit(1)
      .get();

    let lastType = null;
    if (!lastLogSnapshot.empty) {
      lastType = lastLogSnapshot.docs[0].data().type;
    }

    // チェックロジック
    if (type === 'clock_in') {
      // 出勤しようとしているのに、最後が「出勤」ならエラー
      if (lastType === 'clock_in') {
        throw new HttpsError("failed-precondition", "既に出勤しています（二重出勤はできません）。");
      }
    } else if (type === 'clock_out') {
      // 退勤しようとしているのに、履歴がない場合はエラー
      if (lastType === null) {
        throw new HttpsError("failed-precondition", "出勤記録が見つかりません。");
      }
      // 退勤しようとしているのに、最後が「退勤」ならエラー
      if (lastType === 'clock_out') {
        throw new HttpsError("failed-precondition", "既に退勤しています（二重退勤はできません）。");
      }
    }
    // ---------------------------------------------

    // 打刻データの保存
    await db.collection("attendance").add({
      uid: uid,
      userName: userName,
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
 * 5. 会社作成処理
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
  // 注意: 重複チェックが行われていません（将来的に修正推奨）
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  try {
    // トランザクションで一括処理
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
 * 6. 招待コード再発行
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
    
    if (!userDoc.exists || userData?.role !== "admin" || !userData?.companyId) {
      throw new HttpsError("permission-denied", "管理者権限がありません。");
    }

    const companyId = userData.companyId;

    // 2. 新しいコードを生成
    // 注意: 重複チェックが行われていません（将来的に修正推奨）
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