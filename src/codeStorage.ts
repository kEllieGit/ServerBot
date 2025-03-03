export const codeMap = new Map<string, string>();

export function storeCode(userId: string, code: string) {
    codeMap.set(userId, code);
    console.log(`Added ${userId} to the code storage with code ${code}`);
}

export function getCode(userId: string): string | undefined {
    return codeMap.get(userId);
}

export function deleteCode(userId: string) {
    codeMap.delete(userId);
    console.log(`Deleted ${userId} from code storage.`)
}
