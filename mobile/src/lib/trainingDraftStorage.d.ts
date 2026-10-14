export declare function readTrainingDraft(key: string): string | null;
export declare function writeTrainingDraft(key: string, value: string): void;
export declare function clearUserDrafts(userId: string, recordIds?: string[]): Promise<void>;
