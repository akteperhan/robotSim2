/**
 * SoundManager — Web Audio API synthesized sounds
 * No external files needed — all sounds generated programmatically
 */
export declare class SoundManager {
    private ctx;
    private enabled;
    private getContext;
    setEnabled(enabled: boolean): void;
    playMove(): void;
    playTurn(): void;
    playButtonPress(): void;
    playDoorOpen(): void;
    playCharging(): void;
    playSuccess(): void;
    playFailure(): void;
    playBootUp(): void;
}
export declare const soundManager: SoundManager;
//# sourceMappingURL=SoundManager.d.ts.map