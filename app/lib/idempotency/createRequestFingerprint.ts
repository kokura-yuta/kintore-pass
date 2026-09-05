// 同じ保存内容から同じUUIDを作り、APIの二重送信判定に使用する
export async function createRequestFingerprint(
  value: string,
) {
  // 文字列をSHA-256で固定長の安全なハッシュへ変換する
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    ),
  );

  // UUIDとして使う先頭16バイトをコピーする
  const uuidBytes = digest.slice(0, 16);

  // UUID version 5とvariantの規則に合うビットを設定する
  uuidBytes[6] =
    (uuidBytes[6] & 0x0f) | 0x50;
  uuidBytes[8] =
    (uuidBytes[8] & 0x3f) | 0x80;

  const hexadecimal = Array.from(
    uuidBytes,
    (byte) =>
      byte.toString(16).padStart(2, "0"),
  ).join("");

  // PostgreSQLのuuid列へ保存できる形へ区切る
  return [
    hexadecimal.slice(0, 8),
    hexadecimal.slice(8, 12),
    hexadecimal.slice(12, 16),
    hexadecimal.slice(16, 20),
    hexadecimal.slice(20, 32),
  ].join("-");
}
