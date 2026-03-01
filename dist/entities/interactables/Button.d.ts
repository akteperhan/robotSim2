import { IInteractable, InteractableType } from '../../core/IInteractable';
export declare class Button implements IInteractable {
    private isPressed;
    private onPressCallback;
    constructor(onPress: () => void);
    getType(): InteractableType;
    interact(): void;
    canInteract(): boolean;
}
//# sourceMappingURL=Button.d.ts.map