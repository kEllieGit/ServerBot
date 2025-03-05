export class CodeStorage {
    private static codeMap = new Map<string, string>();

    static storeCode(userId: string, code: string) {
        this.codeMap.set(userId, code);
        console.log(`Added ${userId} to the code storage with code ${code}`);
    }

    static getCode(userId: string): string | undefined {
        return this.codeMap.get(userId);
    }

    static getUser(code: string): string | undefined {
        for (const [key, val] of this.codeMap.entries()) {
            if (val === code) {
                return key;
            }
        }
        return undefined;
    }

    static deleteCode(userId: string) {
        this.codeMap.delete(userId);
        console.log(`Deleted ${userId} from code storage.`);
    }

    static hasCode(code: string): boolean {
        for (const val of this.codeMap.values()) {
            if (val === code) {
                return true;
            }
        }
        return false;
    }

}
