// Moderation APIのカテゴリ結果からアプリ側の処理を決める場所
import type { Moderation } from "openai/resources/moderations";

type ModerationCategories =
  Moderation.Categories;

export type ModerationDecision =
  | { status: "safe" }
  | {
      status: "self_harm_support";
      categories: string[];
    }
  | {
      status: "blocked";
      categories: string[];
    };

const selfHarmSupportCategories = [
  "self-harm/intent",
  "self-harm/instructions",
] as const satisfies ReadonlyArray<
  keyof ModerationCategories
>;

const blockedCategories = [
  "sexual/minors",
  "illicit/violent",
  "hate/threatening",
  "harassment/threatening",
  "violence/graphic",
] as const satisfies ReadonlyArray<
  keyof ModerationCategories
>;

function findFlaggedCategories(
  categories: ModerationCategories,
  targets: ReadonlyArray<
    keyof ModerationCategories
  >,
) {
  return targets.filter(
    (category) =>
      categories[category] === true,
  );
}

export function decideModeration(
  categories: ModerationCategories,
): ModerationDecision {
  const selfHarmCategories =
    findFlaggedCategories(
      categories,
      selfHarmSupportCategories,
    );

  if (selfHarmCategories.length > 0) {
    return {
      status: "self_harm_support",
      categories: selfHarmCategories,
    };
  }

  const dangerousCategories =
    findFlaggedCategories(
      categories,
      blockedCategories,
    );

  if (dangerousCategories.length > 0) {
    return {
      status: "blocked",
      categories: dangerousCategories,
    };
  }

  return { status: "safe" };
}
